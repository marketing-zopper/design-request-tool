import { AlertTriangle } from 'lucide-react'
import Button from './Button'

export default function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-100 bg-rose-50/60 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
        <AlertTriangle className="h-5 w-5 text-rose-500" />
      </div>
      <div>
        <p className="font-heading text-[15px] font-semibold text-slate-700">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm font-body text-slate-500">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
