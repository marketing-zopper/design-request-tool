// Sends one batched email per stakeholder who has pending approvals — never
// one email per request. Invoked once a day by pg_cron (see
// supabase/migrations/0007_daily_digest_cron.sql).
//
// Deployed with --no-verify-jwt (see README) because pg_cron calls this over
// plain HTTP, not with a Supabase user JWT. Instead it must present the
// DIGEST_INVOKE_SECRET header — that's this function's only auth check.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Edge Functions runtime; only the vars below need to be set manually
// with `supabase secrets set`:
//   RESEND_API_KEY        - from resend.com
//   DIGEST_FROM_EMAIL     - e.g. "Design Request Tool <notifications@yourdomain.com>"
//   SITE_URL               - e.g. "https://your-app-domain.com" (no trailing slash)
//   DIGEST_INVOKE_SECRET   - any random string; must match the one used in 0007's cron job

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const DIGEST_FROM_EMAIL = Deno.env.get('DIGEST_FROM_EMAIL')!
const SITE_URL = Deno.env.get('SITE_URL')!
const DIGEST_INVOKE_SECRET = Deno.env.get('DIGEST_INVOKE_SECRET')!

const BATCH_SELECT = `
  id, request_code, design_type, custom_design_type, quantity, deadline,
  request_batches (
    requester_email,
    stakeholder_id,
    stakeholders ( id, name, email, access_token )
  )
`

function designTypeLabel(row: any) {
  return row.design_type === 'Other' ? row.custom_design_type || 'Other' : row.design_type
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

function renderDigestHtml(stakeholderName: string, requirementItems: any[], designItems: any[], approveLink: string) {
  const row = (r: any) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eef1f6;font-family:sans-serif;font-size:13px;color:#1F4091;font-weight:600;">${r.request_code}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eef1f6;font-family:sans-serif;font-size:13px;color:#334155;">${designTypeLabel(r)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eef1f6;font-family:sans-serif;font-size:13px;color:#334155;">${r.request_batches?.requester_email ?? ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eef1f6;font-family:sans-serif;font-size:13px;color:#64748b;">${formatDate(r.deadline)}</td>
    </tr>`

  const section = (title: string, items: any[]) =>
    items.length === 0
      ? ''
      : `<h3 style="font-family:sans-serif;font-size:15px;color:#1F4091;margin:24px 0 8px;">${title} (${items.length})</h3>
         <table style="width:100%;border-collapse:collapse;">
           <thead>
             <tr>
               <th align="left" style="padding:8px 12px;font-family:sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;">Request</th>
               <th align="left" style="padding:8px 12px;font-family:sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;">Type</th>
               <th align="left" style="padding:8px 12px;font-family:sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;">Requested By</th>
               <th align="left" style="padding:8px 12px;font-family:sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;">Deadline</th>
             </tr>
           </thead>
           <tbody>${items.map(row).join('')}</tbody>
         </table>`

  return `
  <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
    <h2 style="color:#1F4091;">Design requests awaiting your approval</h2>
    <p style="color:#334155;font-size:14px;">Hi ${stakeholderName}, you have ${requirementItems.length + designItems.length}
      design request${requirementItems.length + designItems.length === 1 ? '' : 's'} waiting on you today.</p>
    ${section('Requirement Approvals', requirementItems)}
    ${section('Design Approvals', designItems)}
    <p style="margin-top:28px;">
      <a href="${approveLink}" style="background:#EE773D;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;">
        Approve Now
      </a>
    </p>
    <p style="color:#94a3b8;font-size:11px;margin-top:24px;">This link is personal to you — please don't forward it.</p>
  </div>`
}

Deno.serve(async (req) => {
  if (req.headers.get('x-digest-secret') !== DIGEST_INVOKE_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const [{ data: requirementRows, error: reqError }, { data: designRows, error: designError }] = await Promise.all([
    supabase.from('design_requests').select(BATCH_SELECT).eq('status', 'pending_requirement_approval'),
    supabase.from('design_requests').select(BATCH_SELECT).eq('status', 'ready_for_review'),
  ])
  if (reqError) return new Response(JSON.stringify({ error: reqError.message }), { status: 500 })
  if (designError) return new Response(JSON.stringify({ error: designError.message }), { status: 500 })

  const byStakeholder = new Map<string, { stakeholder: any; requirement: any[]; design: any[] }>()
  const addRow = (row: any, kind: 'requirement' | 'design') => {
    const stakeholder = row.request_batches?.stakeholders
    if (!stakeholder?.email) return
    if (!byStakeholder.has(stakeholder.id)) {
      byStakeholder.set(stakeholder.id, { stakeholder, requirement: [], design: [] })
    }
    byStakeholder.get(stakeholder.id)![kind].push(row)
  }
  ;(requirementRows ?? []).forEach((r) => addRow(r, 'requirement'))
  ;(designRows ?? []).forEach((r) => addRow(r, 'design'))

  const results = []
  for (const { stakeholder, requirement, design } of byStakeholder.values()) {
    const approveLink = `${SITE_URL}/approvals?token=${stakeholder.access_token}`
    const html = renderDigestHtml(stakeholder.name, requirement, design, approveLink)
    const total = requirement.length + design.length

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: DIGEST_FROM_EMAIL,
        to: stakeholder.email,
        subject: `${total} design request${total === 1 ? '' : 's'} awaiting your approval`,
        html,
      }),
    })
    results.push({ stakeholder: stakeholder.email, ok: res.ok, status: res.status })
  }

  return new Response(JSON.stringify({ stakeholdersNotified: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
