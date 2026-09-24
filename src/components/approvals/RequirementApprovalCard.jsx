import { useState } from 'react'
import toast from 'react-hot-toast'
import { Eye } from 'lucide-react'
import ApprovalCard from './ApprovalCard'
import Button from '../ui/Button'
import TextareaField from '../ui/TextareaField'
import { formatDate } from '../../lib/format'
import { approveRequirement, rejectRequirement } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

function designTypeLabel(r) {
  return r.design_type === 'Other' ? r.custom_design_type || 'Other' : r.design_type
}

export default function RequirementApprovalCard({ request, onView, onResolved }) {
  const [comment, setComment] = useState('')
  const [showComment, setShowComment] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const stakeholderName = request.stakeholderName

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      await approveRequirement(request.id, stakeholderName, comment)
      toast.success(`${request.request_code} approved`)
      onResolved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not approve this request'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!comment.trim() || comment.trim().length < 3) {
      setShowComment(true)
      toast.error('Add a short reason so the requester knows what to fix')
      return
    }
    setSubmitting(true)
    try {
      await rejectRequirement(request.id, stakeholderName, comment)
      toast.success(`${request.request_code} rejected`)
      onResolved()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not reject this request'))
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
            <Eye className="h-3.5 w-3.5" /> View Full Requirement
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
            <span className="text-slate-400">Team </span>
            {request.team}
          </p>
          <p>
            <span className="text-slate-400">Required </span>
            {formatDate(request.deadline)}
          </p>
          <p>Qty {request.quantity}</p>
        </>
      }
      footer={
        <>
          {showComment && (
            <TextareaField
              rows={2}
              className="sm:mr-auto sm:max-w-xs"
              placeholder="Optional comment (required if rejecting)"
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
          <Button variant="danger" size="sm" onClick={handleReject} loading={submitting}>
            Reject
          </Button>
          <Button variant="primary" size="sm" onClick={handleApprove} loading={submitting}>
            Approve
          </Button>
        </>
      }
    >
      {request.content_requirement && (
        <p className="line-clamp-2 text-[13px] font-body text-slate-500">{request.content_requirement}</p>
      )}
    </ApprovalCard>
  )
}
