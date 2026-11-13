import { supabase } from './supabase'
import { storagePathFor } from './requestCodes'
import { uploadFile } from './uploads'
import { STATUS, APPROVAL_TYPE, APPROVAL_STATUS } from './constants'

const REQUEST_LIST_SELECT = `
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

/**
 * With only 3 top-level statuses (Awaited Approval / Approved / Rejected),
 * whether a request is waiting on its first requirement approval vs. a
 * final-design approval — and whether "Approved" means "done" vs. "team
 * still needs to upload" — is inferred from whether a final_design
 * attachment exists yet, rather than from status itself. See
 * StatusUpdatePanel and the digest Edge Function for the two other places
 * that lean on this same flag.
 */
function hasFinalDesignAttachment(row) {
  return (row.attachments || []).some((a) => a.category === 'final_design')
}

function flattenRequest(row) {
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

// ---------------------------------------------------------------------------
// Stakeholders
// ---------------------------------------------------------------------------
export async function fetchStakeholders() {
  const { data, error } = await supabase
    .from('stakeholders')
    .select('id, name, email')
    .eq('active', true)
    .eq('is_listed', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

// findOrCreateStakeholder (for the submit form's "Other" stakeholder pick)
// now lives server-side in supabase/functions/employee-actions/index.ts —
// submission as a whole moved there (see submitDesignRequestBatch below) so
// it can be role-checked before it runs.

/**
 * Resolves a stakeholder's magic-link token into their identity without ever
 * exposing the token itself or any other stakeholder's row (see
 * resolve_stakeholder_by_token in 0006_stakeholder_tokens.sql).
 */
export async function resolveStakeholderByToken(token) {
  const { data, error } = await supabase.rpc('resolve_stakeholder_by_token', { p_token: token })
  if (error) throw error
  return data?.[0] || null
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

/**
 * Uploads each requirement's files to Storage directly from the browser
 * (unchanged — Storage access is gated by its own policies, see 0017), then
 * hands the metadata + all requirement fields to the employee-actions Edge
 * Function, which does the actual multi-table insert with the service-role
 * key after verifying the caller is a signed-in Editor/Admin/Super Admin.
 * Submission now requires that login — this is an intentional behavior
 * change (see Phase 3 plan): /submit is no longer anonymous-writable.
 */
export async function submitDesignRequestBatch({ requester, requirements, onProgress }) {
  const requirementsPayload = []

  for (let i = 0; i < requirements.length; i += 1) {
    const req = requirements[i]
    onProgress?.({ step: 'saving', index: i, total: requirements.length })

    const filesToUpload = [
      ...(req.referenceFiles || []).map((file) => ({ file, category: 'reference' })),
      ...(req.brandAssetFiles || []).map((file) => ({ file, category: 'brand_asset' })),
    ]

    // Files are named after the request code once it exists server-side, so
    // a temporary, still-unique path is used here instead — the attachment
    // row stores whatever path/url the file actually landed at.
    const tempCode = `pending-${Date.now()}-${i}`
    const attachments = []
    for (let f = 0; f < filesToUpload.length; f += 1) {
      const { file, category } = filesToUpload[f]
      onProgress?.({ step: 'uploading', index: i, total: requirements.length, fileIndex: f, fileTotal: filesToUpload.length })
      const path = storagePathFor(tempCode, category, file.name)
      const { publicUrl } = await uploadFile(file, path)
      attachments.push({ file_name: file.name, file_path: path, file_url: publicUrl, file_type: file.type, category })
    }

    requirementsPayload.push({
      designType: req.designType,
      customDesignType: req.designType === 'Other' ? req.customDesignType : null,
      quantity: req.quantity,
      deadline: req.deadline,
      dimensions: req.dimensions || null,
      coBranding: !!req.coBranding,
      partnerName: req.coBranding ? req.partnerName : null,
      contentRequirement: req.contentRequirement,
      referenceLink: req.referenceLink || null,
      additionalNotes: req.additionalNotes || null,
      attachments,
    })
  }

  const { data, error } = await supabase.functions.invoke('employee-actions', {
    body: { action: 'submit_request', requester, requirements: requirementsPayload },
  })
  if (error) throw error

  onProgress?.({ step: 'done' })
  return data
}

// ---------------------------------------------------------------------------
// All Requests — employee (Editor/Admin/Super Admin) side, via
// employee-actions. See fetchRequestById below for the stakeholder's own
// direct-Postgres equivalent.
// ---------------------------------------------------------------------------
export async function fetchAllRequests() {
  const { data, error } = await supabase.functions.invoke('employee-actions', { body: { action: 'list_requests' } })
  if (error) throw error
  return data
}

export async function fetchRequestByIdForTeam(id) {
  const { data, error } = await supabase.functions.invoke('employee-actions', { body: { action: 'get_request', id } })
  if (error) throw error
  return data
}

/**
 * Direct-Postgres read, scoped by RLS (see 0017) to only the rows where the
 * caller's Google-verified email matches the invited stakeholder — used by
 * StakeholderView, never TeamView (which uses fetchRequestByIdForTeam
 * above, enforced via employee-actions instead).
 */
export async function fetchRequestById(id) {
  const { data, error } = await supabase
    .from('design_requests')
    .select(REQUEST_LIST_SELECT)
    .eq('id', id)
    .single()
  if (error) throw error

  const [{ data: attachments, error: attachError }, { data: approvals, error: approvalError }] =
    await Promise.all([
      supabase.from('attachments').select('*').eq('request_id', id).order('created_at', { ascending: true }),
      supabase.from('approvals').select('*').eq('request_id', id).order('created_at', { ascending: true }),
    ])
  if (attachError) throw attachError
  if (approvalError) throw approvalError

  return { ...flattenRequest(data), attachments, approvals }
}

/** Employee-only (e.g. a manual status override) — not currently exposed in the UI. */
export async function updateRequestStatus(id, status) {
  const { data, error } = await supabase.functions.invoke('employee-actions', { body: { action: 'update_status', id, status } })
  if (error) throw error
  return data
}

/**
 * Archives a design request — a reversible soft-hide from the default All
 * Requests view (and from pending-approval queries/digests) that replaced
 * the old hard "Delete" action. The row, its attachments and its approval
 * history all stay intact until the 60-day retention cleanup removes them
 * like any other request. Admin/Super Admin only — enforced in
 * employee-actions, not just hidden in the UI.
 */
export async function archiveDesignRequest(id) {
  const { data, error } = await supabase.functions.invoke('employee-actions', { body: { action: 'archive', id } })
  if (error) throw error
  return data
}

export async function unarchiveDesignRequest(id) {
  const { data, error } = await supabase.functions.invoke('employee-actions', { body: { action: 'unarchive', id } })
  if (error) throw error
  return data
}

export async function uploadFinalDesign(requestCode, requestId, files) {
  const uploadedFiles = []
  for (const file of files) {
    const path = storagePathFor(requestCode, 'final_design', file.name)
    const { publicUrl } = await uploadFile(file, path)
    uploadedFiles.push({ file_name: file.name, file_path: path, file_url: publicUrl, file_type: file.type })
  }
  const { data, error } = await supabase.functions.invoke('employee-actions', {
    body: { action: 'upload_final_design', requestId, files: uploadedFiles },
  })
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------
/**
 * All requests currently awaiting a stakeholder decision — both a first-time
 * requirement approval and a final-design approval share the AWAITED_APPROVAL
 * status, so callers split the result themselves via `.hasFinalDesign`
 * (false = requirement approval, true = design approval).
 */
export async function fetchAwaitedApprovals() {
  const { data, error } = await supabase
    .from('design_requests')
    .select(REQUEST_LIST_SELECT)
    .eq('status', STATUS.AWAITED_APPROVAL)
    .eq('archived', false)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(flattenRequest)
}

/**
 * Requests whose final design has been approved. Shown on the Approvals page
 * so a stakeholder can come back and re-download a design after approving it
 * — otherwise it just disappears from their view once approved. APPROVED
 * also covers "requirement approved, team hasn't uploaded yet" — hasFinalDesign
 * is what narrows this down to genuinely finished requests.
 */
export async function fetchCompletedApprovals() {
  const { data, error } = await supabase
    .from('design_requests')
    .select(REQUEST_LIST_SELECT)
    .eq('status', STATUS.APPROVED)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data.map(flattenRequest).filter((r) => r.hasFinalDesign)
}

export async function fetchFinalDesignAttachments(requestIds) {
  if (!requestIds.length) return {}
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('category', 'final_design')
    .in('request_id', requestIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.reduce((acc, row) => {
    if (!acc[row.request_id]) acc[row.request_id] = []
    acc[row.request_id].push(row)
    return acc
  }, {})
}

/**
 * Records a stakeholder's decision via record_stakeholder_approval() (see
 * 0018_stakeholder_approval_rpc.sql) — a SECURITY DEFINER function that
 * independently re-checks the caller's Google-verified email against the
 * invited stakeholder for this request before writing anything. The
 * magic-link token that got the stakeholder here is never consulted for
 * this check; a mismatch throws 'email_mismatch', which the approval card
 * components catch and render as EmailMismatchNotice.
 */
async function recordStakeholderApproval({ requestId, approvalType, decision, comment }) {
  const { error } = await supabase.rpc('record_stakeholder_approval', {
    p_request_id: requestId,
    p_approval_type: approvalType,
    p_decision: decision,
    p_comment: comment || null,
  })
  if (error) throw error
}

export async function approveRequirement(requestId, _stakeholderName, comment) {
  return recordStakeholderApproval({
    requestId,
    approvalType: APPROVAL_TYPE.REQUIREMENT,
    decision: APPROVAL_STATUS.APPROVED,
    comment,
  })
}

export async function rejectRequirement(requestId, _stakeholderName, comment) {
  return recordStakeholderApproval({
    requestId,
    approvalType: APPROVAL_TYPE.REQUIREMENT,
    decision: APPROVAL_STATUS.REJECTED,
    comment,
  })
}

export async function approveFinalDesign(requestId, _stakeholderName, comment) {
  return recordStakeholderApproval({
    requestId,
    approvalType: APPROVAL_TYPE.FINAL_DESIGN,
    decision: APPROVAL_STATUS.APPROVED,
    comment,
  })
}

export async function requestDesignChanges(requestId, _stakeholderName, comment) {
  return recordStakeholderApproval({
    requestId,
    approvalType: APPROVAL_TYPE.FINAL_DESIGN,
    decision: APPROVAL_STATUS.CHANGES_REQUESTED,
    comment,
  })
}
