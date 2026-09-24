import { Pencil, Trash2 } from 'lucide-react'
import Button from '../ui/Button'
import { formatShortDate } from '../../lib/format'

function designTypeLabel(requirement) {
  return requirement.designType === 'Other' ? requirement.customDesignType || 'Other' : requirement.designType
}

export function CompactRequestCard({ requirement, index, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-card">
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-dark/5 text-xs font-heading font-semibold text-brand-dark">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold text-slate-700">{designTypeLabel(requirement)}</p>
          <p className="truncate text-[12px] font-body text-slate-400">
            Qty {requirement.quantity} · Required {formatShortDate(requirement.deadline)}
          </p>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" className="!px-2" onClick={onEdit} aria-label="Edit request">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="!px-2 text-rose-400 hover:bg-rose-50 hover:text-rose-500" onClick={onDelete} aria-label="Delete request">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function ReviewRequestCard({ requirement, index, onEdit }) {
  const attachmentCount = (requirement.referenceFileNames?.length || 0) + (requirement.brandAssetFileNames?.length || 0)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="font-heading text-[15px] font-semibold text-slate-700">
          {String(index + 1).padStart(2, '0')} — {designTypeLabel(requirement)}
        </p>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-[13px] font-body text-slate-500 sm:grid-cols-3">
        <p>{requirement.quantity} units</p>
        {requirement.dimensions && <p>{requirement.dimensions}</p>}
        <p>Required: {formatShortDate(requirement.deadline)}</p>
        <p>Co-branding: {requirement.coBranding ? 'Yes' : 'No'}</p>
        {attachmentCount > 0 && <p>{attachmentCount} attachment{attachmentCount > 1 ? 's' : ''}</p>}
      </dl>
    </div>
  )
}
