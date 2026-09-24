import { useState } from 'react'
import { Plus } from 'lucide-react'
import Button from '../ui/Button'
import ConfirmationModal from '../ui/ConfirmationModal'
import DesignRequirementForm from './DesignRequirementForm'
import { CompactRequestCard } from './RequestSummaryCard'

export default function DesignRequirementsStep({ draft, onBack, onContinue }) {
  const { requirements, addRequirement, updateRequirement, removeRequirement, setRequirementSaved, setRequirementFiles, getRequirementFiles } =
    draft
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  const savedCount = requirements.filter((r) => r.isSaved).length
  const canContinue = requirements.length > 0 && requirements.every((r) => r.isSaved)

  return (
    <div className="flex flex-col gap-4">
      {requirements.map((requirement, index) =>
        requirement.isSaved ? (
          <CompactRequestCard
            key={requirement.draftId}
            requirement={requirement}
            index={index}
            onEdit={() => setRequirementSaved(requirement.draftId, false)}
            onDelete={() => setPendingDeleteId(requirement.draftId)}
          />
        ) : (
          <DesignRequirementForm
            key={requirement.draftId}
            requirement={requirement}
            index={index}
            referenceFiles={getRequirementFiles(requirement.draftId, 'referenceFiles')}
            brandAssetFiles={getRequirementFiles(requirement.draftId, 'brandAssetFiles')}
            onReferenceFilesChange={(files) => setRequirementFiles(requirement.draftId, 'referenceFiles', files)}
            onBrandAssetFilesChange={(files) => setRequirementFiles(requirement.draftId, 'brandAssetFiles', files)}
            canCancel={requirements.length > 1 || savedCount > 0}
            onCancel={() => {
              if (requirement.contentRequirement || requirement.designType) {
                setRequirementSaved(requirement.draftId, true)
              } else {
                removeRequirement(requirement.draftId)
              }
            }}
            onSave={(values) => {
              updateRequirement(requirement.draftId, values)
              setRequirementSaved(requirement.draftId, true)
            }}
          />
        )
      )}

      <button
        type="button"
        onClick={addRequirement}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-light/50 bg-brand-light/5 px-4 py-3.5 text-sm font-body font-medium text-brand-dark transition-colors hover:bg-brand-light/10"
      >
        <Plus className="h-4 w-4" /> Add Another Design Request
      </button>

      <div className="flex items-center justify-between border-t border-slate-100 pt-5">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onContinue} disabled={!canContinue}>
          Continue
        </Button>
      </div>

      <ConfirmationModal
        open={!!pendingDeleteId}
        title="Delete this design request?"
        description="This removes it from your submission. This can't be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          removeRequirement(pendingDeleteId)
          setPendingDeleteId(null)
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
