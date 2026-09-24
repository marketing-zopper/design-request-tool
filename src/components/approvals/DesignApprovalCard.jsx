import { useState } from 'react'
import toast from 'react-hot-toast'
import { Eye, FileImage } from 'lucide-react'
import ApprovalCard from './ApprovalCard'
import Button from '../ui/Button'
import TextareaField from '../ui/TextareaField'
import { formatDate } from '../../lib/format'
import { approveFinalDesign, requestDesignChanges } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

function designTypeLabel(r) {
  return r.design_type === 'Other' ? r.custom_design_type || 'Other' : r.design_type
}

function isImage(file) {
  return file?.file_type?.startsWith('image/')
}

export default function DesignApprovalCard({ request, latestDesign, onView, onResolved }) {
  const [comment, setComment] = useState('')
  const [showComment, setShowComment] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const stakeholderName = request.stakeholderName

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      await approveFinalDesign(request.id, stakeholderName, comment)
      toast.success(`${request.request_code} marked Completed`)
      onResolved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not approve this design'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestChanges = async () => {
    setSubmitting(true)
    try {
      await requestDesignChanges(request.id, stakeholderName, comment)
      toast.success(`Changes requested on ${request.request_code}`)
      onResolved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not request changes'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ApprovalCard
      header={
        <>
          <div>
            <p className="font-heading text-sm font-semibold text-brand-dark">{request.request_code}</p>
            <p className="text-[13px] font-body text-slate-600">{designTypeLabel(request)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onView}>
            <Eye className="h-3.5 w-3.5" /> View Design
          </Button>
        </>
      }
      meta={
        <>
          <p>
            <span className="text-slate-400">By </span>
            {request.requesterName}
          </p>
          <p>
            <span className="text-slate-400">Deadline </span>
            {formatDate(request.deadline)}
          </p>
        </>
      }
      footer={
        <>
          {showComment && (
            <TextareaField
              rows={2}
              className="sm:mr-auto sm:max-w-xs"
              placeholder="Optional comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          )}
          {!showComment && (
            <button
              type="button"
              onClick={() => setShowComment(true)}
              className="mr-auto text-left text-[12px] font-body text-slate-400 underline-offset-2 hover:underline"
            >
              Add a comment
            </button>
          )}
          <Button variant="danger" size="sm" onClick={handleRequestChanges} loading={submitting}>
            Request Changes
          </Button>
          <Button variant="primary" size="sm" onClick={handleApprove} loading={submitting}>
            Approve Final
          </Button>
        </>
      }
    >
      {latestDesign ? (
        <a
          href={latestDesign.file_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-[#F6F8FC] p-2.5 hover:border-brand-light/50"
        >
          {isImage(latestDesign) ? (
            <img src={latestDesign.file_url} alt={latestDesign.file_name} className="h-14 w-14 rounded-md object-cover" />
          ) : (
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-white">
              <FileImage className="h-5 w-5 text-brand-dark/40" />
            </span>
          )}
          <span className="truncate text-[13px] font-body text-slate-600">{latestDesign.file_name}</span>
        </a>
      ) : (
        <p className="text-[13px] font-body text-slate-400">No final design file uploaded yet.</p>
      )}
    </ApprovalCard>
  )
}
