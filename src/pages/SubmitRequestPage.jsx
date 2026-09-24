import { useState } from 'react'
import PageContainer from '../components/layout/PageContainer'
import Stepper from '../components/ui/Stepper'
import RequesterDetailsStep from '../components/form/RequesterDetailsStep'
import DesignRequirementsStep from '../components/form/DesignRequirementsStep'
import ReviewSubmitStep from '../components/form/ReviewSubmitStep'
import SubmissionSuccess from '../components/form/SubmissionSuccess'
import { useDraftForm } from '../hooks/useDraftForm'

const STEP_LABELS = ['Requester Details', 'Design Requirements', 'Review & Submit']

export default function SubmitRequestPage() {
  const draft = useDraftForm()
  const [submittedCodes, setSubmittedCodes] = useState(null)

  const handleSubmitAnother = () => {
    setSubmittedCodes(null)
  }

  return (
    <PageContainer>
      {!submittedCodes && (
        <h1 className="font-heading text-[28px] font-bold text-brand-dark sm:text-[32px]">Submit a Design Request</h1>
      )}

      <div className="mt-6 rounded-xl2 border border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
        {!submittedCodes && (
          <div className="mb-8">
            <Stepper steps={STEP_LABELS} currentStep={draft.step} />
          </div>
        )}

        {submittedCodes ? (
          <SubmissionSuccess requestCodes={submittedCodes} onSubmitAnother={handleSubmitAnother} />
        ) : draft.step === 1 ? (
          <RequesterDetailsStep
            defaultValues={draft.requester}
            onContinue={(values) => {
              draft.setRequester(values)
              draft.setStep(2)
            }}
          />
        ) : draft.step === 2 ? (
          <DesignRequirementsStep draft={draft} onBack={() => draft.setStep(1)} onContinue={() => draft.setStep(3)} />
        ) : (
          <ReviewSubmitStep
            draft={draft}
            onBack={() => draft.setStep(2)}
            onEditRequirement={(draftId) => {
              draft.setRequirementSaved(draftId, false)
              draft.setStep(2)
            }}
            onSubmitted={(codes) => {
              setSubmittedCodes(codes)
              draft.reset()
            }}
          />
        )}
      </div>
    </PageContainer>
  )
}
