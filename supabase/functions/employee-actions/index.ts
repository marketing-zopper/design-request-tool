// Every operation only the internal "marketing team" (now: Editor/Admin/
// Super Admin employees, via centralized Google Login + Upstash RBAC) may
// perform — list all requests, view any request, archive/restore, upload a
// final design, update status, and submit a new request. Enforced HERE, not
// just hidden in the UI: this function verifies the caller's Supabase Auth
// JWT, resolves their role live against Upstash (see _shared/resolveRole.ts
// — never cached in this app's own database), and only on success performs
// the operation with the service-role key. Once the RLS migrations in
// 0017/0018 are applied, a direct PostgREST call (even with a valid
// employee JWT) can no longer do any of this at all — only this function's
// service-role client can.
//
// Deployed with the DEFAULT JWT verification (no --no-verify-jwt) — the
// Supabase gateway itself rejects a missing/invalid Supabase Auth JWT
// before this code runs.
//
// Secrets required: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (read
// inside resolveRole.ts). SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are
// provided automatically by the Edge Functions runtime.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveRole, hasAnyAccess, canArchive } from '../_shared/resolveRole.ts'
import { flattenRequest, REQUEST_LIST_SELECT } from '../_shared/flatten.ts'
import { CORS_HEADERS } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const STATUS = { AWAITED_APPROVAL: 'awaited_approval', APPROVED: 'approved', REJECTED: 'rejected' }
const VALID_STATUSES = new Set(Object.values(STATUS))

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

/** Mirrors findOrCreateStakeholder in src/lib/api.js, using the service-role client. */
async function findOrCreateStakeholder(admin: ReturnType<typeof createClient>, name: string, email: string) {
  const escapedEmail = email.replace(/[%_\\]/g, '\\$&')
  const { data: existing, error: findError } = await admin
    .from('stakeholders')
    .select('id, name, email')
    .ilike('email', escapedEmail)
    .maybeSingle()
  if (findError) throw findError
  if (existing) return existing

  const { data: created, error: insertError } = await admin
    .from('stakeholders')
    .insert({ name, email, is_listed: false })
    .select('id, name, email')
    .single()
  if (insertError) throw insertError
  return created
}

async function sendConfirmationEmail(payload: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-request-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // best-effort — a submission that already succeeded must never fail because of this
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization') || ''
  const accessToken = authHeader.replace(/^Bearer\s+/i, '')
  if (!accessToken) return json({ error: 'not_authenticated' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(accessToken)
  if (userError || !user?.email) return json({ error: 'not_authenticated' }, 401)

  const { role } = await resolveRole(user.email)
  if (!hasAnyAccess(role)) return json({ error: 'forbidden' }, 403)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const { action } = body || {}

  try {
    switch (action) {
      case 'list_requests': {
        const { data, error } = await admin
          .from('design_requests')
          .select(REQUEST_LIST_SELECT)
          .order('created_at', { ascending: false })
        if (error) throw error
        return json(data.map(flattenRequest))
      }

      case 'get_request': {
        const { id } = body
        if (!id) return json({ error: 'missing_id' }, 400)
        const { data, error } = await admin.from('design_requests').select(REQUEST_LIST_SELECT).eq('id', id).single()
        if (error) throw error

        const [{ data: attachments, error: attachError }, { data: approvals, error: approvalError }] = await Promise.all([
          admin.from('attachments').select('*').eq('request_id', id).order('created_at', { ascending: true }),
          admin.from('approvals').select('*').eq('request_id', id).order('created_at', { ascending: true }),
        ])
        if (attachError) throw attachError
        if (approvalError) throw approvalError

        return json({ ...flattenRequest(data), attachments, approvals })
      }

      case 'archive':
      case 'unarchive': {
        if (!canArchive(role)) return json({ error: 'forbidden_requires_admin' }, 403)
        const { id } = body
        if (!id) return json({ error: 'missing_id' }, 400)
        const patch =
          action === 'archive' ? { archived: true, archived_at: new Date().toISOString() } : { archived: false, archived_at: null }
        const { data, error } = await admin.from('design_requests').update(patch).eq('id', id).select().single()
        if (error) throw error
        return json(data)
      }

      case 'upload_final_design': {
        const { requestId, files } = body
        if (!requestId || !Array.isArray(files) || files.length === 0) return json({ error: 'missing_files' }, 400)
        const rows = files.map((f: any) => ({
          request_id: requestId,
          file_name: f.file_name,
          file_path: f.file_path,
          file_url: f.file_url,
          file_type: f.file_type,
          category: 'final_design',
        }))
        const { data, error } = await admin.from('attachments').insert(rows).select()
        if (error) throw error
        return json(data)
      }

      case 'update_status': {
        const { id, status } = body
        if (!id || !VALID_STATUSES.has(status)) return json({ error: 'invalid_status' }, 400)
        const { data, error } = await admin.from('design_requests').update({ status }).eq('id', id).select().single()
        if (error) throw error
        return json(data)
      }

      case 'submit_request': {
        const { requester, requirements } = body
        if (!requester?.requesterEmail || !Array.isArray(requirements) || requirements.length === 0) {
          return json({ error: 'invalid_submission' }, 400)
        }

        let stakeholderId = requester.stakeholderId
        let stakeholderNameForApproval = requester.stakeholderName

        if (requester.stakeholderId === 'other') {
          const stakeholder = await findOrCreateStakeholder(admin, requester.customStakeholderName, requester.customStakeholderEmail)
          stakeholderId = stakeholder.id
          stakeholderNameForApproval = stakeholder.name
        }

        const { data: batch, error: batchError } = await admin
          .from('request_batches')
          .insert({
            requester_email: requester.requesterEmail,
            team: requester.team,
            stakeholder_id: stakeholderId,
            custom_stakeholder_name: requester.stakeholderId === 'other' ? requester.customStakeholderName : null,
            custom_stakeholder_email: requester.stakeholderId === 'other' ? requester.customStakeholderEmail : null,
          })
          .select()
          .single()
        if (batchError) throw batchError

        const createdCodes: string[] = []
        const confirmationItems: any[] = []

        for (const req of requirements) {
          const { data: designRequest, error: drError } = await admin
            .from('design_requests')
            .insert({
              batch_id: batch.id,
              design_type: req.designType,
              custom_design_type: req.designType === 'Other' ? req.customDesignType : null,
              quantity: req.quantity,
              deadline: req.deadline,
              dimensions: req.dimensions || null,
              co_branding: !!req.coBranding,
              partner_name: req.coBranding ? req.partnerName : null,
              content_requirement: req.contentRequirement,
              reference_link: req.referenceLink || null,
              additional_notes: req.additionalNotes || null,
              status: STATUS.AWAITED_APPROVAL,
            })
            .select()
            .single()
          if (drError) throw drError

          createdCodes.push(designRequest.request_code)
          confirmationItems.push({
            requestCode: designRequest.request_code,
            designType: req.designType === 'Other' ? req.customDesignType : req.designType,
            deadline: req.deadline,
          })

          const attachmentRows = (req.attachments || []).map((a: any) => ({
            request_id: designRequest.id,
            file_name: a.file_name,
            file_path: a.file_path,
            file_url: a.file_url,
            file_type: a.file_type,
            category: a.category,
          }))
          if (attachmentRows.length > 0) {
            const { error: attachError } = await admin.from('attachments').insert(attachmentRows)
            if (attachError) throw attachError
          }

          const { error: approvalError } = await admin.from('approvals').insert({
            request_id: designRequest.id,
            approval_type: 'requirement',
            status: 'pending',
            stakeholder_name: stakeholderNameForApproval,
          })
          if (approvalError) throw approvalError
        }

        await sendConfirmationEmail({
          requesterEmail: requester.requesterEmail,
          stakeholderName: stakeholderNameForApproval,
          requestCodes: createdCodes,
          items: confirmationItems,
        })

        return json({ batchId: batch.id, requestCodes: createdCodes })
      }

      default:
        return json({ error: 'unknown_action' }, 400)
    }
  } catch (err) {
    return json({ error: String(err?.message || err) }, 500)
  }
})
