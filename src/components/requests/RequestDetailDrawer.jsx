import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { X, Paperclip, ExternalLink, Trash2 } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import StatusUpdatePanel from './StatusUpdatePanel'
import FinalDesignDownloadList from './FinalDesignDownloadList'
import LoadingState from '../ui/LoadingState'
import ErrorState from '../ui/ErrorState'
import ConfirmationModal from '../ui/ConfirmationModal'
import { fetchRequestById, deleteDesignRequest } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatDate, formatDateTime, formatFileSize } from '../../lib/format'
import { APPROVAL_STATUS } from '../../lib/constants'

function DetailRow({ label, children }) {
  if (children === null || children === undefined || children === '') return null
  return (
    <div className="grid grid-cols-3 gap-2 py-2 text-[13px] font-body">
      <dt className="text-slate-400">{label}</dt>
      <dd className="col-span-2 text-slate-700">{children}</dd>
    </div>
  )
}

function AttachmentList({ title, attachments }) {
  if (!attachments.length) return null
  return (
    <div>
      <p className="text-[11px] font-body font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {attachments.map((a) => (
          <li key={a.id}>
            <a
              href={a.file_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-body text-slate-600 hover:border-brand-light/50 hover:bg-brand-light/5"
            >
              <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-brand-dark/40" />
              <span className="truncate">{a.file_name}</span>
              <ExternalLink className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

const APPROVAL_STATUS_TEXT = {
  [APPROVAL_STATUS.PENDING]: 'Pending',
  [APPROVAL_STATUS.APPROVED]: 'Approved',
  [APPROVAL_STATUS.REJECTED]: 'Rejected',
  [APPROVAL_STATUS.CHANGES_REQUESTED]: 'Changes Requested',
}

export default function RequestDetailDrawer({ requestId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    if (!requestId) return
    setLoading(true)
    setError(null)
    fetchRequestById(requestId)
      .then(setDetail)
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    setShowDeleteConfirm(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  if (!requestId) return null

  const attachments = detail?.attachments || []
  const references = attachments.filter((a) => a.category === 'reference')
  const brandAssets = attachments.filter((a) => a.category === 'brand_asset')
  const finalDesigns = attachments.filter((a) => a.category === 'final_design')

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteDesignRequest(
        detail.id,
        attachments.map((a) => a.file_path)
      )
      toast.success(`${detail.request_code} deleted`)
      setShowDeleteConfirm(false)
      onChanged?.()
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete this request'))
    } finally {
      setDeleting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="scroll-thin relative flex h-full w-full flex-col overflow-y-auto bg-white shadow-pop sm:w-[460px]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <p className="font-heading text-base font-bold text-brand-dark">{detail?.request_code || '—'}</p>
            {detail && <StatusBadge status={detail.status} />}
          </div>
          <div className="flex items-center gap-1">
            {detail && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                aria-label="Delete request"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 px-5 py-4">
          {loading && <LoadingState rows={5} />}
          {error && <ErrorState description="Couldn't load this request." onRetry={load} />}

          {detail && !loading && !error && (
            <div className="flex flex-col gap-6">
              <dl className="divide-y divide-slate-50">
                <DetailRow label="Design Type">
                  {detail.design_type === 'Other' ? detail.custom_design_type : detail.design_type}
                </DetailRow>
                <DetailRow label="Requester">
                  {detail.team} · {detail.requesterEmail}
                </DetailRow>
                <DetailRow label="Stakeholder">
                  {detail.stakeholderName}
                  {detail.stakeholderEmail && <span className="text-slate-400"> · {detail.stakeholderEmail}</span>}
                </DetailRow>
                <DetailRow label="Quantity">{detail.quantity}</DetailRow>
                <DetailRow label="Deadline">{formatDate(detail.deadline)}</DetailRow>
                <DetailRow label="Dimensions">{detail.dimensions}</DetailRow>
                <DetailRow label="Co-branding">{detail.co_branding ? 'Yes' : 'No'}</DetailRow>
                {detail.co_branding && <DetailRow label="Partner">{detail.partner_name}</DetailRow>}
                <DetailRow label="Created">{formatDateTime(detail.created_at)}</DetailRow>
              </dl>

              {detail.content_requirement && (
                <div>
                  <p className="text-[11px] font-body font-semibold uppercase tracking-wide text-slate-400">
                    Content Requirement
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] font-body text-slate-600">
                    {detail.content_requirement}
                  </p>
                </div>
              )}

              {detail.reference_link && (
                <div>
                  <p className="text-[11px] font-body font-semibold uppercase tracking-wide text-slate-400">
                    Reference Link
                  </p>
                  <a
                    href={detail.reference_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 block truncate text-[13px] font-body text-brand-light hover:underline"
                  >
                    {detail.reference_link}
                  </a>
                </div>
              )}

              {detail.additional_notes && (
                <div>
                  <p className="text-[11px] font-body font-semibold uppercase tracking-wide text-slate-400">
                    Additional Notes
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] font-body text-slate-600">
                    {detail.additional_notes}
                  </p>
                </div>
              )}

              <AttachmentList title="References" attachments={references} />
              <AttachmentList title="Brand Assets" attachments={brandAssets} />

              <div className="rounded-xl border border-slate-200 bg-[#F6F8FC] p-4">
                <p className="text-[11px] font-body font-semibold uppercase tracking-wide text-slate-400">Final Design</p>
                <div className="mt-2">
                  <FinalDesignDownloadList attachments={finalDesigns} />
                </div>
                <div className="mt-3">
                  <StatusUpdatePanel
                    request={detail}
                    finalDesignAttachments={finalDesigns}
                    onUpdated={() => {
                      load()
                      onChanged?.()
                    }}
                  />
                </div>
              </div>

              {detail.approvals?.length > 0 && (
                <div>
                  <p className="text-[11px] font-body font-semibold uppercase tracking-wide text-slate-400">
                    Approval Activity
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-2">
                    {detail.approvals.map((a) => (
                      <li key={a.id} className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-[12px] font-body">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-600">
                            {a.approval_type === 'requirement' ? 'Requirement Approval' : 'Final Design Approval'}
                          </span>
                          <span className="text-slate-400">{APPROVAL_STATUS_TEXT[a.status]}</span>
                        </div>
                        {a.comment && <p className="mt-1 text-slate-500">"{a.comment}"</p>}
                        <p className="mt-1 text-slate-300">{formatDateTime(a.updated_at)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        open={showDeleteConfirm}
        title={`Delete ${detail?.request_code}?`}
        description="This permanently removes the request, its attachments and its approval history. This can't be undone."
        confirmLabel="Delete Request"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>,
    document.body
  )
}
