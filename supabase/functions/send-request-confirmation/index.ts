// Sends a one-time confirmation email to the requester right after they
// submit a design request batch. Invoked directly from the browser via
// supabase.functions.invoke (see submitDesignRequestBatch in
// src/lib/api.js) — best-effort: a failure here never blocks the submission
// itself, which has already succeeded in the database by the time this runs.
//
// Deployed with the default JWT verification (unlike the two cron-only
// functions) since this is called from the browser with the anon key.
// RESEND_API_KEY and DIGEST_FROM_EMAIL are the same secrets already set for
// send-approval-digest — no extra `supabase secrets set` needed.
//
// Unlike the two cron-only functions (server-to-server, no browser
// involved), this one is called directly from the browser via
// supabase.functions.invoke — so it needs CORS headers on every response,
// including an explicit answer to the browser's OPTIONS preflight.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const DIGEST_FROM_EMAIL = Deno.env.get('DIGEST_FROM_EMAIL')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

function renderHtml(stakeholderName: string, items: any[]) {
  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eef1f6;font-family:sans-serif;font-size:13px;color:#1F4091;font-weight:600;">${i.requestCode}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eef1f6;font-family:sans-serif;font-size:13px;color:#334155;">${i.designType || '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eef1f6;font-family:sans-serif;font-size:13px;color:#64748b;">${formatDate(i.deadline)}</td>
        </tr>`
    )
    .join('')

  const plural = items.length === 1 ? '' : 's'

  return `
  <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
    <h2 style="color:#1F4091;">We&rsquo;ve received your design request${plural}</h2>
    <p style="color:#334155;font-size:14px;">
      ${items.length} request${plural} ${items.length === 1 ? 'has' : 'have'} been submitted and ${items.length === 1 ? 'is' : 'are'} now
      awaiting approval from <strong>${stakeholderName}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <thead>
        <tr>
          <th align="left" style="padding:8px 12px;font-family:sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;">Request</th>
          <th align="left" style="padding:8px 12px;font-family:sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;">Type</th>
          <th align="left" style="padding:8px 12px;font-family:sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;">Deadline</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#94a3b8;font-size:11px;margin-top:24px;">
      You&rsquo;ll hear from us again once ${items.length === 1 ? 'it is' : 'they are'} approved and moved into design.
    </p>
  </div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { requesterEmail, stakeholderName, requestCodes, items } = await req.json()
    if (!requesterEmail || !Array.isArray(requestCodes) || requestCodes.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing requesterEmail or requestCodes' }), {
        status: 400,
        headers: CORS_HEADERS,
      })
    }

    const rows = Array.isArray(items) && items.length ? items : requestCodes.map((c: string) => ({ requestCode: c }))
    const html = renderHtml(stakeholderName || 'your stakeholder', rows)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: DIGEST_FROM_EMAIL,
        to: requesterEmail,
        subject: `Design request${requestCodes.length === 1 ? '' : 's'} submitted: ${requestCodes.join(', ')}`,
        html,
      }),
    })

    return new Response(JSON.stringify({ ok: res.ok, status: res.status }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS_HEADERS })
  }
})
