import { useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../ui/Button'
import { ReviewRequestCard } from './RequestSummaryCard'
import { submitDesignRequestBatch } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

function buildProgressLabel(progress, total) {
  if (!progress) return ''
  if (progress.step === 'saving') return `Saving request ${progress.index + 1} of ${total}...`
  if (progress.step === 'uploading')
    return `Uploading files for request ${progress.index + 1} of ${total} (${progress.fileIndex + 1}/${progress.fileTotal})...`
  return ''
}

export default function ReviewSubmitStep({ draft, onBack, onEditRequirement, onSubmitted }) {
  const { requester, requirements, getRequirementFiles } = draft
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setProgress(null)
    try {
      const payload = requirements.map((r) => ({
        ...r,
        referenceFiles: getRequirementFiles(r.draftId, 'referenceFiles'),
        brandAssetFiles: getRequirementFiles(r.draftId, 'brandAssetFiles'),
      }))
      const result = await submitDesignRequestBatch({
        requester,
        requirements: payload,
        onProgress: setProgress,
      })
      onSubmitted(result.requestCodes)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      toast.error(getErrorMessage(err, 'Something went wrong while submitting. Please try again.'))
    } finally {
      setSubmitting(false)
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-slate-200 bg-[#F6F8FC] p-4">
        <p className="text-[11px] font-body uppercase tracking-wide text-slate-400">Requested By</p>
        <p className="mt-0.5 font-body text-sm text-slate-700">
          {requester.team} · {requester.requesterEmail}
        </p>
        <p className="mt-3 text-[11px] font-body uppercase tracking-wide text-slate-400">Approver</p>
        <p className="mt-0.5 font-body text-sm text-slate-700">
          {requester.stakeholderId === 'other' ? requester.customStakeholderName : requester.stakeholderName}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {requirements.map((requirement, index) => (
          <ReviewRequestCard
            key={requirement.draftId}
            requirement={requirement}
            index={index}
            onEdit={() => onEditRequirement(requirement.draftId)}
          />
        ))}
      </div>

      <div className="flex flex-col items-end gap-2 border-t border-slate-100 pt-5">
        <div className="flex w-full items-center justify-between">
          <Button variant="ghost" onClick={onBack} disabled={submitting}>
            Back
          </Button>
          <Button variant="primary" size="lg" onClick={handleSubmit} loading={submitting} disabled={submitting}>
            Submit Requests
          </Button>
        </div>
        {submitting && (
          <p className="text-[12px] font-body text-slate-400">
            {buildProgressLabel(progress, requirements.length) || 'Preparing your submission...'}
          </p>
        )}
      </div>
    </div>
  )
}
