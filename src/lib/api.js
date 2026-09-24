import { supabase, STORAGE_BUCKET } from './supabase'
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
  created_at,
  updated_at,
  request_batches (
    requester_email,
    team,
    stakeholder_id,
    custom_stakeholder_name,
    custom_stakeholder_email,
    stakeholders ( id, name, email )
  )
`

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
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Finds a stakeholder by email (case-insensitive) or creates one. Used when a
 * requester picks "Other" and types a name/email, so that person also ends up
 * with a real stakeholder row — and therefore an access_token — and starts
 * receiving the daily approval digest like any listed stakeholder.
 */
async function findOrCreateStakeholder(name, email) {
  const { data: existing, error: findError } = await supabase
    .from('stakeholders')
    .select('id, name, email')
    .ilike('email', email)
    .maybeSingle()
  if (findError) throw findError
  if (existing) return existing

  const { data: created, error: insertError } = await supabase
    .from('stakeholders')
    .insert({ name, email })
    .select('id, name, email')
    .single()
  if (insertError) throw insertError
  return created
}

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
 * Creates one request_batch and one design_request per requirement, uploads
 * each requirement's files to storage (named after the freshly-generated
 * request code), and records the attachment + initial approval rows.
 *
 * Not wrapped in a DB transaction (the anon REST client can't span one across
 * multiple tables/storage calls) — acceptable for an internal V1 tool. See
 * README "Known limitations" for the atomicity trade-off and how an Edge
 * Function/RPC could close the gap later.
 */
export async function submitDesignRequestBatch({ requester, requirements, onProgress }) {
  let stakeholderId = requester.stakeholderId
  let stakeholderNameForApproval = requester.stakeholderName

  if (requester.stakeholderId === 'other') {
    const stakeholder = await findOrCreateStakeholder(requester.customStakeholderName, requester.customStakeholderEmail)
    stakeholderId = stakeholder.id
    stakeholderNameForApproval = stakeholder.name
  }

  const { data: batch, error: batchError } = await supabase
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

  const createdCodes = []

  for (let i = 0; i < requirements.length; i += 1) {
    const req = requirements[i]
    onProgress?.({ step: 'saving', index: i, total: requirements.length })

    const { data: designRequest, error: drError } = await supabase
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
        status: STATUS.PENDING_REQUIREMENT_APPROVAL,
      })
      .select()
      .single()
    if (drError) throw drError

    createdCodes.push(designRequest.request_code)

    const filesToUpload = [
      ...(req.referenceFiles || []).map((file) => ({ file, category: 'reference' })),
      ...(req.brandAssetFiles || []).map((file) => ({ file, category: 'brand_asset' })),
    ]

    for (let f = 0; f < filesToUpload.length; f += 1) {
      const { file, category } = filesToUpload[f]
      onProgress?.({ step: 'uploading', index: i, total: requirements.length, fileIndex: f, fileTotal: filesToUpload.length })
      const path = storagePathFor(designRequest.request_code, category, file.name)
      const { publicUrl } = await uploadFile(file, path)
      const { error: attachError } = await supabase.from('attachments').insert({
        request_id: designRequest.id,
        file_name: file.name,
        file_path: path,
        file_url: publicUrl,
        file_type: file.type,
        category,
      })
      if (attachError) throw attachError
    }

    const { error: approvalError } = await supabase.from('approvals').insert({
      request_id: designRequest.id,
      approval_type: APPROVAL_TYPE.REQUIREMENT,
      status: APPROVAL_STATUS.PENDING,
      stakeholder_name: stakeholderNameForApproval,
    })
    if (approvalError) throw approvalError
  }

  onProgress?.({ step: 'done' })
  return { batchId: batch.id, requestCodes: createdCodes }
}

// ---------------------------------------------------------------------------
// All Requests
// ---------------------------------------------------------------------------
export async function fetchAllRequests() {
  const { data, error } = await supabase
    .from('design_requests')
    .select(REQUEST_LIST_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(flattenRequest)
}

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

export async function updateRequestStatus(id, status) {
  const { data, error } = await supabase
    .from('design_requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Deletes a design request entirely: its storage files, then the row itself
 * (attachments/approvals rows cascade via the FK). Irreversible — callers
 * should confirm with the user first.
 */
export async function deleteDesignRequest(requestId, attachmentPaths = []) {
  if (attachmentPaths.length) {
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove(attachmentPaths)
    if (storageError) throw storageError
  }
  const { error } = await supabase.from('design_requests').delete().eq('id', requestId)
  if (error) throw error
}

export async function uploadFinalDesign(requestCode, requestId, files) {
  const uploaded = []
  for (const file of files) {
    const path = storagePathFor(requestCode, 'final_design', file.name)
    const { publicUrl } = await uploadFile(file, path)
    const { data, error } = await supabase
      .from('attachments')
      .insert({
        request_id: requestId,
        file_name: file.name,
        file_path: path,
        file_url: publicUrl,
        file_type: file.type,
        category: 'final_design',
      })
      .select()
      .single()
    if (error) throw error
    uploaded.push(data)
  }
  return uploaded
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------
export async function fetchPendingRequirementApprovals() {
  const { data, error } = await supabase
    .from('design_requests')
    .select(REQUEST_LIST_SELECT)
    .eq('status', STATUS.PENDING_REQUIREMENT_APPROVAL)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(flattenRequest)
}

export async function fetchDesignApprovals() {
  const { data, error } = await supabase
    .from('design_requests')
    .select(REQUEST_LIST_SELECT)
    .eq('status', STATUS.READY_FOR_REVIEW)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(flattenRequest)
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

async function recordApproval({ requestId, approvalType, status, stakeholderName, comment }) {
  const { data: existing, error: findError } = await supabase
    .from('approvals')
    .select('id')
    .eq('request_id', requestId)
    .eq('approval_type', approvalType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (findError) throw findError

  const payload = {
    status,
    stakeholder_name: stakeholderName,
    comment: comment || null,
    approved_at: status === APPROVAL_STATUS.APPROVED ? new Date().toISOString() : null,
  }

  if (existing) {
    const { error } = await supabase.from('approvals').update(payload).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('approvals').insert({
      request_id: requestId,
      approval_type: approvalType,
      ...payload,
    })
    if (error) throw error
  }
}

export async function approveRequirement(requestId, stakeholderName, comment) {
  await recordApproval({
    requestId,
    approvalType: APPROVAL_TYPE.REQUIREMENT,
    status: APPROVAL_STATUS.APPROVED,
    stakeholderName,
    comment,
  })
  return updateRequestStatus(requestId, STATUS.APPROVED)
}

export async function rejectRequirement(requestId, stakeholderName, comment) {
  await recordApproval({
    requestId,
    approvalType: APPROVAL_TYPE.REQUIREMENT,
    status: APPROVAL_STATUS.REJECTED,
    stakeholderName,
    comment,
  })
  return updateRequestStatus(requestId, STATUS.REJECTED)
}

export async function approveFinalDesign(requestId, stakeholderName, comment) {
  await recordApproval({
    requestId,
    approvalType: APPROVAL_TYPE.FINAL_DESIGN,
    status: APPROVAL_STATUS.APPROVED,
    stakeholderName,
    comment,
  })
  return updateRequestStatus(requestId, STATUS.COMPLETED)
}

export async function requestDesignChanges(requestId, stakeholderName, comment) {
  await recordApproval({
    requestId,
    approvalType: APPROVAL_TYPE.FINAL_DESIGN,
    status: APPROVAL_STATUS.CHANGES_REQUESTED,
    stakeholderName,
    comment,
  })
  return updateRequestStatus(requestId, STATUS.CHANGES_REQUESTED)
}
