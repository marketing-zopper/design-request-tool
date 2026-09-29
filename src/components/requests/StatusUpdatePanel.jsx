import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { UploadCloud, FileCheck2, Loader2 } from 'lucide-react'
import Button from '../ui/Button'
import { validateFile } from '../../lib/uploads'
import { uploadFinalDesign, updateRequestStatus } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { STATUS, ACCEPTED_FILE_EXTENSIONS, APPROVAL_TYPE, APPROVAL_STATUS } from '../../lib/constants'
import { formatFileSize } from '../../lib/format'

function latestApproval(approvals, type) {
  return (approvals || [])
    .filter((a) => a.approval_type === type)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]
}

/**
 * With only 3 statuses (Awaited Approval / Approved / Rejected), the team's
 * available actions depend on more than `request.status` alone — whether a
 * final design has ever been uploaded (`hasFinalDesign`, from
 * design_requests.attachments) and the latest final-design approval verdict
 * distinguish "needs a first upload" from "fully done" from "needs a
 * revision after a rejection."
 */
export default function StatusUpdatePanel({ request, finalDesignAttachments, onUpdated }) {
  const inputRef = useRef(null)
  const [pendingFiles, setPendingFiles] = useState([]) // [{file, status: 'uploading'|'done'|'error'}]
  const [submitting, setSubmitting] = useState(false)

  const hasFinalDesign = finalDesignAttachments.length > 0
  const finalDesignApproval = latestApproval(request.approvals, APPROVAL_TYPE.FINAL_DESIGN)

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList)
    const valid = []
    for (const file of files) {
      const error = validateFile(file)
      if (error) toast.error(error)
      else valid.push(file)
    }
    if (!valid.length) return

    setPendingFiles(valid.map((file) => ({ file, status: 'uploading' })))
    try {
      await uploadFinalDesign(request.request_code, request.id, valid)
      setPendingFiles(valid.map((file) => ({ file, status: 'done' })))
      toast.success('Design uploaded')
      onUpdated()
    } catch (err) {
      setPendingFiles(valid.map((file) => ({ file, status: 'error' })))
      toast.error(getErrorMessage(err, 'Upload failed'))
    }
  }

  const submitForReview = async () => {
    setSubmitting(true)
    try {
      await updateRequestStatus(request.id, STATUS.AWAITED_APPROVAL)
      toast.success('Submitted for stakeholder review')
      onUpdated()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not submit for review'))
    } finally {
      setSubmitting(false)
    }
  }

  // Ball's in the stakeholder's court either way — nothing for the team to do.
  if (request.status === STATUS.AWAITED_APPROVAL) {
    return (
      <p className="text-[13px] font-body text-slate-500">
        {hasFinalDesign
          ? 'Final design submitted — waiting on the stakeholder to approve it.'
          : 'Waiting on the stakeholder to approve the requirement.'}
      </p>
    )
  }

  // Terminal: the requirement itself was rejected before any design work started.
  if (request.status === STATUS.REJECTED && !hasFinalDesign) {
    return <p className="text-[13px] font-body text-slate-500">Requirement rejected by the stakeholder.</p>
  }

  // Terminal: the final design was uploaded and approved — fully done.
  if (request.status === STATUS.APPROVED && hasFinalDesign && finalDesignApproval?.status === APPROVAL_STATUS.APPROVED) {
    return <p className="text-[13px] font-body text-slate-500">Final design approved. Nothing more to do here.</p>
  }

  // Remaining cases both need the same upload-and-submit UI: APPROVED with
  // no design yet (first upload) or REJECTED with a design on file (the
  // stakeholder asked for changes — upload a revised version).
  return (
    <div className="flex flex-col gap-3">
      {request.status === STATUS.REJECTED && (
        <p className="text-[13px] font-body text-slate-500">
          Stakeholder requested changes{finalDesignApproval?.comment ? `: “${finalDesignApproval.comment}”` : '.'} Upload
          a new version below.
        </p>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-brand-light/50 bg-brand-light/5 px-4 py-5 text-center hover:bg-brand-light/10"
      >
        <UploadCloud className="h-5 w-5 text-brand-light" />
        <p className="text-sm font-body text-slate-500">
          <span className="font-medium text-brand-dark">{hasFinalDesign ? 'Upload New Version' : 'Upload Design'}</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_EXTENSIONS}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {pendingFiles.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {pendingFiles.map(({ file, status }, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-body text-slate-600">
              {status === 'uploading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-light" />}
              {status === 'done' && <FileCheck2 className="h-3.5 w-3.5 text-emerald-500" />}
              <span className="truncate">{file.name}</span>
              <span className="ml-auto text-[11px] text-slate-400">{formatFileSize(file.size)}</span>
            </li>
          ))}
        </ul>
      )}

      {!hasFinalDesign && (
        <p className="text-[11px] font-body text-slate-400">
          Upload the design output before submitting it for stakeholder review.
        </p>
      )}

      <Button variant="primary" size="sm" disabled={!hasFinalDesign} onClick={submitForReview} loading={submitting}>
        Submit for Stakeholder Review
      </Button>
    </div>
  )
}
