// Mirrors flattenRequest/hasFinalDesignAttachment in src/lib/api.js. Deno
// Edge Functions can't import from src/, so this is kept in sync by hand —
// if that shape changes, update both places.

export function hasFinalDesignAttachment(row: any) {
  return (row.attachments || []).some((a: any) => a.category === 'final_design')
}

export function flattenRequest(row: any) {
  const batch = row.request_batches
  const stakeholderName = batch?.stakeholders?.name || batch?.custom_stakeholder_name || '—'
  const stakeholderEmail = batch?.stakeholders?.email || batch?.custom_stakeholder_email || null
  return {
    ...row,
    requesterEmail: batch?.requester_email,
    team: batch?.team,
    stakeholderName,
    stakeholderEmail,
    stakeholderId: batch?.stakeholder_id ?? null,
    hasFinalDesign: hasFinalDesignAttachment(row),
  }
}

export const REQUEST_LIST_SELECT = `
  id,
  request_code,
  batch_id,
  design_type,
  custom_design_type,
  quantity,
  deadline,
  dimensions,
  co_branding,
  partner_name,
  content_requirement,
  reference_link,
  additional_notes,
  status,
  archived,
  archived_at,
  created_at,
  updated_at,
  attachments ( category ),
  request_batches (
    requester_email,
    team,
    stakeholder_id,
    custom_stakeholder_name,
    custom_stakeholder_email,
    stakeholders ( id, name, email )
  )
`
