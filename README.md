# Design Request Tool

A lightweight internal tool that replaces email/WhatsApp/spreadsheets for design
requests: business teams submit structured requests, the design team manages
them, and stakeholders approve requirements and final designs — all in one app,
with no login required.

## Tech stack

- React + JavaScript + Vite
- Tailwind CSS
- React Router
- React Hook Form + Zod
- Supabase (Postgres + Storage), accessed via `@supabase/supabase-js`

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine).

3. **Run the migrations** — open the Supabase SQL Editor and run each file in
   `supabase/migrations/` **in order**:

   - `0001_init.sql` — tables, the `DR-####` request-code sequence/trigger, `updated_at` triggers
   - `0002_rls.sql` — Row Level Security policies (see below)
   - `0003_storage.sql` — creates the public `design-assets` storage bucket + upload policy
   - `0004_seed_stakeholders.sql` — optional sample stakeholders so the app is usable immediately
   - `0005_allow_request_delete.sql` — lets the design team permanently delete a request from All Requests
   - `0006_stakeholder_tokens.sql` — per-stakeholder magic-link tokens for the Approvals page (see below)
   - `0007_daily_digest_cron.sql` — schedules the daily approval-digest email (see "Daily approval digest" below —
     **read that section before running this one**, it depends on a secret you create manually first)
   - `0008_stakeholders_update.sql` — lets stakeholders be deactivated (soft-delete via `active = false`)
   - `0009_requester_name_optional.sql` — the submit form no longer collects the requester's name, so this drops
     the `NOT NULL` constraint on `request_batches.requester_name` (the column stays, just unused going forward)

   (If you have the Supabase CLI linked to the project, `supabase db push` will apply
   all files in `supabase/migrations/` for you — except 0007 still needs the manual
   Vault secret step first.)

4. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in `.env` with your project's values (Supabase dashboard → Project Settings → API):

   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

5. **Run the app**

   ```bash
   npm run dev
   ```

   Open the printed local URL. `/` redirects to `/submit`.

## End-to-end workflow

1. Anyone submits a request at `/submit` (one or more design requirements in a single batch) — this stays open to
   everyone, no restriction.
2. It appears in **Manage Requests → All Requests** (`/requests`), status "Awaiting Approval" — also open to everyone.
3. Once a day, every stakeholder with at least one pending item gets **one** email listing all of them, with an
   "Approve Now" button. Clicking it opens `/approvals?token=...` scoped to just that stakeholder — see
   "Daily approval digest" and "No-auth security tradeoffs" below for how that works without a login.
4. The stakeholder approves the requirement there → status "Approved".
5. The design team opens the request in All Requests and moves it to **In Design**.
6. The design team uploads the final design and marks it **Ready for Review**.
7. The stakeholder gets it in their next daily digest, reviews it under Approvals → Design Approvals, and either:
   - **Approves Final** → status "Completed", or
   - **Requests Changes** → status "Changes Requested" → design team moves it back to **In Design** and repeats from step 6 with a new version.

## Project structure

```
src/
  components/
    layout/      AppHeader, PageContainer, ManageRequestsTabs, BackgroundShapes
    form/        Submit-request steps: requester details, requirement form/list,
                 file uploader, review cards, success screen
    requests/    All Requests table/filters, detail drawer, design-team status panel,
                 TeamLoginGate (the /requests allowlist+password gate)
    approvals/   Requirement & design approval cards
    ui/          Button, FormField, SelectField, StatusBadge, EmptyState,
                 LoadingState, ErrorState, ConfirmationModal, Stepper
  pages/         SubmitRequestPage, AllRequestsPage, ApprovalsPage
  lib/           supabase client, constants, zod validations, request-code
                 helpers, upload helpers, api.js (all Supabase queries/mutations),
                 teamAccess.js (the /requests allowlist + shared password)
  hooks/         useStakeholders, useDraftForm (session-persisted submit form),
                 useStakeholderAccess (token-gated Approvals access),
                 useTeamAccess (allowlist+password gate for All Requests)
supabase/
  migrations/    SQL migrations described above
  functions/
    send-approval-digest/   Edge Function: the once-daily batched approval email
```

All data access goes through `src/lib/api.js` — there is no other place in the
app that talks to Supabase directly, which keeps the Supabase schema and the UI
decoupled.

## Storage layout

Files are uploaded to a single public bucket, `design-assets`, organized per request:

```
DR-1021/
  references/    files attached under "References" on the request form
  brand-assets/   co-branding logo/brand files
  final-designs/  design-team output, one entry per version uploaded
```

Reference/brand-asset files are uploaded once the request itself is created
(so its `DR-####` code exists to name the folder) — see `submitDesignRequestBatch`
in `src/lib/api.js`. This isn't wrapped in a database transaction (the anon REST
client can't span one across multiple tables + storage calls), so a submission
that fails partway through can leave an incomplete batch. Acceptable for an
internal V1 tool; moving submission into a Postgres RPC or Edge Function would
close this gap if it becomes a problem.

## Daily approval digest (email)

Requirement and design approvals aren't emailed one at a time. Once a day, a
Supabase Edge Function collects every pending approval, groups it by
stakeholder, and sends **one** email per stakeholder (not per request) with an
"Approve Now" button that deep-links into their scoped `/approvals` view.

### How the link works without a login

Each stakeholder row has an `access_token` (added in `0006_stakeholder_tokens.sql`).
The email's button links to `/approvals?token=<their token>`. Opening that link
resolves the token (via the `resolve_stakeholder_by_token` Postgres function —
the *only* way the token can ever be read back; a plain `select * from
stakeholders` cannot see it, see the migration for why) and scopes the page to
that person's approvals. Whoever holds the link is trusted as that stakeholder
— there's no second factor. That's a deliberate product decision (the email
only ever goes to that person's real inbox), not an oversight; see "No-auth
security tradeoffs" below for the actual exposure this leaves.

If a requester picks "Other" and types a stakeholder's name/email at submission
time, that person is automatically turned into a real stakeholder row too (see
`findOrCreateStakeholder` in `src/lib/api.js`), so they get a token and start
receiving the digest exactly like a pre-listed stakeholder.

### Deploying it

You'll need:
- The [Supabase CLI](https://supabase.com/docs/guides/cli), logged in and linked to this project (`supabase link`).
- A [Resend](https://resend.com) account + API key, and a sending domain/address verified there.

Steps:

1. **Deploy the function** (`--no-verify-jwt` because pg_cron calls it over plain HTTP, not with a user JWT —
   the function checks its own shared secret instead, see below):

   ```bash
   supabase functions deploy send-approval-digest --no-verify-jwt
   ```

2. **Set its secrets** (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't set those):

   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxx
   supabase secrets set DIGEST_FROM_EMAIL="Design Request Tool <notifications@yourdomain.com>"
   supabase secrets set SITE_URL=https://your-deployed-app-url.com
   supabase secrets set DIGEST_INVOKE_SECRET=<any long random string>
   ```

3. **Store that same invoke secret in Supabase Vault** (SQL Editor — do this once, do *not* put the real value
   in a committed file):

   ```sql
   select vault.create_secret('<the exact same random string from step 2>', 'digest_invoke_secret');
   ```

4. **Run `0007_daily_digest_cron.sql`** — it schedules a 9:00 UTC daily job that calls the function using the
   Vault secret from step 3. Adjust the cron expression in that file to your stakeholders' timezone before running
   it if 9:00 UTC doesn't suit.

5. **Test it manually** any time, without waiting for the schedule:

   ```bash
   curl -X POST https://nbgqzqdvaflmjsmvfqkw.supabase.co/functions/v1/send-approval-digest \
     -H "x-digest-secret: <your DIGEST_INVOKE_SECRET>"
   ```

   It returns `{"stakeholdersNotified": N, "results": [...]}`.

### Known limitation

Any `design_requests` rows created **before** `0006_stakeholder_tokens.sql` was applied, where the requester
picked "Other" as the stakeholder, have no linked stakeholder row (the old flow only stored a free-text
name/email). Those won't appear in anyone's digest or scoped Approvals view. New submissions don't have this
problem — every "Other" pick now upserts a real stakeholder row. If you have such rows and need them fixed up,
match them to (or create) a stakeholder by email and backfill `request_batches.stakeholder_id` manually.

## No-auth security tradeoffs

**There is deliberately no login in V1.** Every request from the browser uses
the public Supabase `anon` key, so Row Level Security (RLS) — not application
auth — is what decides what the anon key can do. RLS is **enabled on every
table** (never disabled), with narrow policies (see `0002_rls.sql`) that only
allow the operations the app actually performs:

- `stakeholders`: readable (name/email/active only — `access_token` is never selectable, see below), insertable
  (submitting as "Other" upserts a stakeholder row), and updatable (`0008_stakeholders_update.sql` — deactivating
  one via `active = false` instead of deleting, since a hard delete would fail on any stakeholder ever referenced
  by a submission).
- `request_batches`: insert (on submit) + read. Never updated or deleted.
- `design_requests`: insert (on submit), read, update (status changes), and delete
  (`0005_allow_request_delete.sql` — the design team can remove a request entirely).
- `attachments`: insert, read, delete (only via a request delete cascading to it — no
  standalone update, a new version is a new row).
- `approvals`: insert + update (recording each approval step) + read + delete (cascades
  the same way as attachments).

The `design-assets` storage bucket is public, with an insert policy scoped to
that bucket only; reads are served via Supabase's public-bucket CDN path.

**What this means in practice:** anyone with the published anon key (which is
not secret, but is visible in this app's bundled JS) can call these same
operations directly — e.g. approve any request, or move any request's status —
without going through the UI, **as long as they can reach the right row**.
That's an acceptable trade-off for an internal tool used by a small trusted
team, but it is **not** a substitute for real authorization.

**Two screens have an extra gate on top of this; everything else (`/submit`) stays fully open.**

- **`/requests` (All Requests)** is restricted to the marketing team: a fixed allowlist of 5 emails plus one
  shared password (see `src/lib/teamAccess.js`). Whoever logs in stays logged in (in `localStorage`) until they
  hit "Log out". This is a soft barrier, nothing more — the email list and password both ship in the JS bundle,
  the check runs entirely in React, and the anon key underneath still has full read/write on every table regardless
  of whether someone's "logged in". It stops a random visitor from stumbling into the request-management UI; it
  does not stop someone who reads the bundle from bypassing it entirely.
- **`/approvals`** only shows content to someone holding a stakeholder's personal `?token=...` link (delivered
  privately by the daily digest email, see above). This is *link possession*, not authentication — there's no
  password, and no check that the person clicking the link is really that stakeholder.

Both checks stop casual/accidental access (you can't just browse to either page and see everything, unlike a
truly open no-auth screen), but neither stops a determined user with the anon key from bypassing the UI and
calling the same REST endpoints directly. Real authorization still requires Supabase Auth (see below).

**Where to introduce auth later:** add Supabase Auth (email/SSO), then:

1. Add a `user_id`/`role` concept (e.g. a `profiles` table keyed by `auth.uid()`).
2. Tighten the `design_requests`/`approvals` update policies to require
   `auth.uid()` to match the assigned stakeholder or a "design team" role,
   instead of the current `using (true)` — this is where the token-based
   `/approvals` gating described above should move from "checked in React"
   to "enforced by Postgres".
3. Consider moving multi-step writes (submission, approvals) into Postgres
   functions (`security definer`) or Edge Functions so the anon key is never
   trusted with raw table writes at all.

None of this is needed for V1 to work correctly — it's the explicit boundary
of what "no-auth" means here, so a future contributor knows exactly what's
open and why.

## Known limitations (by design, for V1)

- No authentication, roles, or permissions — `/requests` has an allowlist+password gate and `/approvals` has
  link-based gating (see above), `/submit` is fully open.
- Submission isn't atomic across tables/storage (see "Storage layout" above).
- No kanban, task assignment, or analytics — out of scope per the V1 brief.
- Design requests created before `0006_stakeholder_tokens.sql`, with an "Other" stakeholder, aren't linked to a
  stakeholder row and won't appear in the digest/scoped Approvals view (see "Daily approval digest" above).
