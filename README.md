<div align="center">

# 🎨 Design Request Tool

**A lightweight internal hub for design requests — submit, manage, and approve, all in one place.**

Replaces the email / WhatsApp / spreadsheet shuffle: business teams submit structured design
requests, the design team tracks and fulfills them, and stakeholders approve requirements and
final designs — no login required.

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_Storage-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![React Hook Form](https://img.shields.io/badge/React_Hook_Form-Zod-EC5990?style=flat-square&logo=reacthookform&logoColor=white)](https://react-hook-form.com)
[![No Auth](https://img.shields.io/badge/Auth-none_(V1)-lightgrey?style=flat-square)](#-security-model--no-auth-tradeoffs)

</div>

---

## 📑 Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [How It Works](#-how-it-works)
- [Project Structure](#-project-structure)
- [Storage Layout](#-storage-layout)
- [Daily Approval Digest](#-daily-approval-digest-email)
- [Security Model / No-Auth Tradeoffs](#-security-model--no-auth-tradeoffs)
- [Known Limitations](#-known-limitations-by-design-for-v1)

---

## ✨ Features

| | |
|---|---|
| 📝 **Structured submission** | Multi-step form, multiple design requirements per batch, file uploads for references, brand assets, and content briefs |
| 📋 **All Requests** | One merged page — searchable/filterable table, a detail drawer, archive/restore (no hard delete), a 7/30/60-day display range — gated to the marketing team, who see everything |
| ✅ **Stakeholder approvals** | Requirement approval → design approval, each with comments, all reachable via a personal magic link (no login) — a stakeholder only ever sees requests naming them |
| 📬 **Daily digest + confirmation emails** | One batched approval-digest email per stakeholder per day (never per request), plus an immediate confirmation email to the requester on submission |
| ⬇️ **Reliable downloads** | Final designs download as real files (forced `Content-Disposition`) |
| 🗓️ **60-day retention** | Requests older than 60 days (and their files) are purged automatically by a scheduled cleanup job |
| 🔒 **Layered soft-gating** | `/requests` behind a team allowlist + password for team members, or a per-stakeholder token for magic-link access — see [Security Model](#-security-model--no-auth-tradeoffs) |

---

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + JavaScript, built with Vite |
| Styling | Tailwind CSS |
| Routing | React Router |
| Forms & validation | React Hook Form + Zod |
| Backend | Supabase (Postgres + Storage), via `@supabase/supabase-js` |
| Email | Supabase Edge Function → Resend |
| Scheduling | `pg_cron` + `pg_net` |

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Free tier is fine — [supabase.com](https://supabase.com).

### 3. Run the migrations

Open the Supabase **SQL Editor** and run each file in `supabase/migrations/`, **in order**:

| Migration | What it does |
|---|---|
| `0001_init.sql` | Core tables, the `DR-####` request-code sequence/trigger, `updated_at` triggers |
| `0002_rls.sql` | Row Level Security policies ([see Security Model](#-security-model--no-auth-tradeoffs)) |
| `0003_storage.sql` | Public `design-assets` storage bucket + upload policy |
| `0004_seed_stakeholders.sql` | Optional sample stakeholders so the app is usable immediately |
| `0005_allow_request_delete.sql` | Lets the design team permanently delete a request |
| `0006_stakeholder_tokens.sql` | Per-stakeholder magic-link tokens for Approvals |
| `0007_daily_digest_cron.sql` | Schedules the daily digest — **read [Daily Approval Digest](#-daily-approval-digest-email) first**, it needs a secret created manually before this one |
| `0008_stakeholders_update.sql` | Lets a stakeholder be deactivated (`active = false`) |
| `0009_requester_name_optional.sql` | Drops `NOT NULL` on `request_batches.requester_name` (field no longer collected) |
| `0010_archive_and_retention.sql` | Adds `archived`/`archived_at`, drops the anon delete policies — archive replaces hard delete |
| `0011_retention_cleanup_cron.sql` | Schedules the daily 60-day retention cleanup (reuses `0007`'s Vault secret) |
| `0012_digest_time_1525ist.sql` | Moves the daily digest send time to 15:25 IST (09:55 UTC) |
| `0013_collapse_statuses.sql` | Collapses the 7 workflow statuses down to 3: Awaited Approval / Approved / Rejected |

> 💡 With the Supabase CLI linked to the project, `supabase db push` applies all of these for
> you — except `0007`, which still needs the manual Vault secret step first.

### 4. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your project's values (Supabase dashboard → **Project Settings → API**):

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 5. Run the app

```bash
npm run dev
```

Open the printed local URL — `/` redirects to `/submit`.

---

## 🔄 How It Works

Only 3 statuses exist: **Awaited Approval**, **Approved**, **Rejected**. `Awaited Approval` covers
both "waiting on the initial requirement approval" and "waiting on the final-design approval" —
and `Approved` covers both "requirement approved, design team still needs to upload" and "fully
done." What a given status actually means for one request is inferred from whether a final design
has been uploaded yet (`hasFinalDesign`), not from a separate status value — see `StatusUpdatePanel`
and `hasFinalDesignAttachment` in `src/lib/api.js`.

```mermaid
flowchart LR
    A([Submitted:<br/>Awaited Approval]) --> B{Stakeholder<br/>reviews requirement}
    B -->|Reject| X([Rejected])
    B -->|Approve| C([Approved:<br/>team uploads design])
    C --> D([Awaited Approval:<br/>stakeholder reviews design])
    D -->|Approve Final| E([Approved: done])
    D -->|Request Changes| Y([Rejected:<br/>team re-uploads]) --> C
```

1. **Anyone** submits a request at `/submit` — one or more design requirements in a single batch. Fully open, no restriction. The requester gets an immediate confirmation email.
2. It appears in **All Requests** (`/requests`) with status **Awaited Approval** — the marketing team, logged in, sees and manages every request here.
3. Once a day, every stakeholder with at least one pending item gets **one** email listing all of them, with an **Approve Now** link into their scoped view of `/requests?token=...`. See [Daily Approval Digest](#-daily-approval-digest-email) and [Security Model](#-security-model--no-auth-tradeoffs) for how that works without a login.
4. The stakeholder approves the requirement → status **Approved**. Rejecting instead → status **Rejected** (terminal — no design work follows).
5. The design team uploads the final design (while still **Approved**) and clicks **Submit for Stakeholder Review** → status flips back to **Awaited Approval**.
6. The stakeholder sees it in their next digest, under Design Approvals, and either:
   - ✅ **Approves Final** → status **Approved** (done — downloadable from All Requests), or
   - 🔁 **Requests Changes** → status **Rejected** → the design team re-uploads and resubmits, repeating from step 5.

---

## 📁 Project Structure

```text
src/
  components/
    layout/      AppHeader, PageContainer, BackgroundShapes
    form/        Submit-request steps — requester details, requirement form/list,
                 file uploader, review cards, success screen
    requests/    All Requests table/filters, detail drawer (archive/restore, status
                 panel), TeamLoginGate (the /requests allowlist+password gate)
    approvals/   Requirement, design & completed approval cards (stakeholder view)
    ui/          Button, FormField, SelectField, StatusBadge, EmptyState,
                 LoadingState, ErrorState, ConfirmationModal, Stepper
  pages/         SubmitRequestPage, AllRequestsPage (both team and stakeholder
                 views live here — /approvals redirects into this one route)
  lib/           supabase client, constants, zod validations, request-code
                 helpers, upload helpers, api.js (all Supabase queries/mutations),
                 teamAccess.js (the /requests allowlist + shared password)
  hooks/         useStakeholders, useDraftForm (session-persisted submit form),
                 useStakeholderAccess (token-gated scoped access),
                 useTeamAccess (allowlist+password gate for All Requests)
supabase/
  migrations/    SQL migrations described above
  functions/
    send-approval-digest/        Edge Function — the once-daily batched approval email
    send-request-confirmation/   Edge Function — immediate email to the requester on submit
    cleanup-old-requests/        Edge Function — daily 60-day retention purge
```

> All data access goes through `src/lib/api.js` — there's no other place in the app that talks
> to Supabase directly, keeping the schema and UI decoupled.

---

## 🗂️ Storage Layout

Files upload to one public bucket, `design-assets`, organized per request:

```text
DR-1021/
  references/     files attached under "References" on the request form
  brand-assets/    co-branding logo/brand files
  final-designs/   design-team output, one entry per version uploaded
```

> ⚠️ **Not atomic.** Reference/brand-asset files upload once the request itself is created (so
> its `DR-####` code exists to name the folder) — see `submitDesignRequestBatch` in
> `src/lib/api.js`. This isn't wrapped in a database transaction (the anon REST client can't
> span one across multiple tables + storage calls), so a submission that fails partway through
> can leave an incomplete batch. Acceptable for an internal V1 tool; moving submission into a
> Postgres RPC or Edge Function would close this gap if it becomes a problem.

---

## 📧 Daily Approval Digest (email)

Requirement and design approvals aren't emailed one at a time. Once a day, a Supabase Edge
Function collects every pending approval (status `awaited_approval`), groups it by stakeholder,
and sends **one** email per stakeholder (not per request) with an **Approve Now** button that
deep-links into their scoped `/requests` view.

### How the link works without a login

Each stakeholder row has an `access_token` (added in `0006_stakeholder_tokens.sql`). The email's
button links to `/requests?token=<their token>` (`/approvals?token=...` still works too — it just
redirects there). Opening that link resolves the token — via the
`resolve_stakeholder_by_token` Postgres function, the *only* way the token can ever be read back
(a plain `select * from stakeholders` cannot see it; see the migration for why) — and scopes the
page to that person's approvals. Whoever holds the link is trusted as that stakeholder; there's
no second factor. That's a deliberate product decision (the email only ever goes to that
person's real inbox), not an oversight — see [Security Model](#-security-model--no-auth-tradeoffs)
for the actual exposure this leaves.

If a requester picks "Other" and types a stakeholder's name/email at submission time, that person
is automatically turned into a real stakeholder row too (see `findOrCreateStakeholder` in
`src/lib/api.js`), so they get a token and start receiving the digest exactly like a pre-listed
stakeholder.

### Deploying it

**You'll need:**
- The [Supabase CLI](https://supabase.com/docs/guides/cli), logged in and linked to this project (`supabase link`)
- A [Resend](https://resend.com) account + API key, with a sending domain/address verified there

**Steps:**

1. **Deploy the function** — `--no-verify-jwt` because `pg_cron` calls it over plain HTTP, not
   with a user JWT (the function checks its own shared secret instead, see below):

   ```bash
   supabase functions deploy send-approval-digest --no-verify-jwt
   ```

2. **Set its secrets** (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically —
   don't set those):

   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxx
   supabase secrets set DIGEST_FROM_EMAIL="Design Request Tool <notifications@yourdomain.com>"
   supabase secrets set SITE_URL=https://your-deployed-app-url.com
   supabase secrets set DIGEST_INVOKE_SECRET=<any long random string>
   ```

3. **Store that same invoke secret in Supabase Vault** (SQL Editor — do this once; do *not* put
   the real value in a committed file):

   ```sql
   select vault.create_secret('<the exact same random string from step 2>', 'digest_invoke_secret');
   ```

4. **Run `0007_daily_digest_cron.sql`, then `0012_digest_time_1525ist.sql`** — schedules a daily
   job (currently 15:25 IST / 09:55 UTC) that calls the function using the Vault secret from step
   3. Adjust the cron expression in `0012` (or `cron.alter_job` directly) if that time doesn't suit
   your stakeholders' timezone.

5. **Test it anytime**, without waiting for the schedule:

   ```bash
   curl -X POST https://your-project-ref.supabase.co/functions/v1/send-approval-digest \
     -H "x-digest-secret: <your DIGEST_INVOKE_SECRET>"
   ```

   Returns `{"stakeholdersNotified": N, "results": [...]}`.

### ⚠️ Known limitation

Any `design_requests` rows created **before** `0006_stakeholder_tokens.sql` was applied, where
the requester picked "Other" as the stakeholder, have no linked stakeholder row (the old flow
only stored a free-text name/email). Those won't appear in anyone's digest or scoped Approvals
view. New submissions don't have this problem — every "Other" pick now upserts a real
stakeholder row. If you have such rows and need them fixed up, match them to (or create) a
stakeholder by email and backfill `request_batches.stakeholder_id` manually.

---

## 🔐 Security Model / No-Auth Tradeoffs

**There is deliberately no login in V1.** Every request from the browser uses the public Supabase
`anon` key, so Row Level Security (RLS) — not application auth — decides what it can do. RLS is
**enabled on every table** (never disabled globally), with narrow policies (see `0002_rls.sql`)
that only allow the operations the app actually performs:

| Table | Select | Insert | Update | Delete | Notes |
|---|:---:|:---:|:---:|:---:|---|
| `stakeholders` | ✅ | ✅ | ✅ | ❌ | Select excludes `access_token` (column-level grant); insert lets "Other" upsert a stakeholder; update is for deactivating (`active = false`) rather than deleting |
| `request_batches` | ✅ | ✅ | ❌ | ❌ | Created once at submission, never touched again |
| `design_requests` | ✅ | ✅ | ✅ | ❌ | No delete from the app (`0010` dropped it) — "Delete" was replaced with **Archive** (`archived`/`archived_at`, a plain update). Only the scheduled `cleanup-old-requests` job (service role, bypasses RLS) ever removes a row, once it's 60+ days old |
| `attachments` | ✅ | ✅ | ❌ | ❌ | Same as above — only the retention cleanup job deletes rows |
| `approvals` | ✅ | ✅ | ✅ | ❌ | Same as above |

The `design-assets` storage bucket is public, with an insert policy scoped to that bucket only;
reads are served via Supabase's public-bucket CDN path.

> **What this means in practice:** anyone with the published anon key (not secret, but visible in
> this app's bundled JS) can call these same operations directly — e.g. approve any request, or
> move any request's status — without going through the UI, **as long as they can reach the right
> row**. That's an acceptable trade-off for an internal tool used by a small trusted team, but it
> is **not** a substitute for real authorization.

### One screen, two gates on top of this

Everything else (`/submit`) stays fully open. `/requests` is a single merged route — which of the
two gates below applies depends on how you arrive:

- **No token in the URL** — treated as the marketing team's view: a fixed allowlist of 5 emails
  plus one shared password (see `src/lib/teamAccess.js`). Whoever logs in stays logged in
  (in `localStorage`) until they hit "Log out". This is a soft barrier, nothing more — the email
  list and password both ship in the JS bundle, the check runs entirely in React, and the anon
  key underneath still has full read/write on every table regardless of whether someone's
  "logged in". It stops a random visitor from stumbling into the request-management UI; it does
  not stop someone who reads the bundle from bypassing it entirely.
- **`?token=...` in the URL** (or remembered in `sessionStorage` from an earlier visit) — shows
  only that stakeholder's own requests instead, per their personal magic link (delivered privately
  by the daily digest email). This is *link possession*, not authentication — there's no password,
  and no check that the person clicking the link is really that stakeholder.

Both checks stop casual/accidental access (you can't just browse to `/requests` and see
everything, unlike a truly open no-auth screen), but neither stops a determined user with the
anon key from bypassing the UI and calling the same REST endpoints directly. Real authorization
still requires Supabase Auth.

### Where to introduce auth later

1. Add a `user_id`/`role` concept (e.g. a `profiles` table keyed by `auth.uid()`).
2. Tighten the `design_requests`/`approvals` update policies to require `auth.uid()` to match the
   assigned stakeholder or a "design team" role, instead of the current `using (true)` — this is
   where the token-based stakeholder gating on `/requests` should move from "checked in React" to
   "enforced by Postgres".
3. Consider moving multi-step writes (submission, approvals) into Postgres functions
   (`security definer`) or Edge Functions so the anon key is never trusted with raw table writes
   at all.

None of this is needed for V1 to work correctly — it's the explicit boundary of what "no-auth"
means here, so a future contributor knows exactly what's open and why.

---

## ⚠️ Known Limitations (by design, for V1)

- No authentication, roles, or permissions — `/requests` has an allowlist+password gate for the
  team and link-based (magic-link token) gating for stakeholders (see
  [Security Model](#-security-model--no-auth-tradeoffs)); `/submit` is fully open.
- Submission isn't atomic across tables/storage (see [Storage Layout](#-storage-layout)).
- No kanban, task assignment, or analytics — out of scope per the V1 brief.
- Design requests created before `0006_stakeholder_tokens.sql`, with an "Other" stakeholder,
  aren't linked to a stakeholder row and won't appear in the digest/scoped requests view (see
  [Daily Approval Digest](#-daily-approval-digest-email)).
- Only 3 statuses (Awaited Approval / Approved / Rejected) — the design team's kanban-style
  view of "who still needs to upload" vs. "fully done" relies on reading `hasFinalDesign`
  alongside the status badge, not the badge alone (see [How It Works](#-how-it-works)).
