import { Inbox } from 'lucide-react'

export default function EmptyState({ icon, title, description, action }) {
  const Icon = icon || Inbox
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-dark/5">
        <Icon className="h-5 w-5 text-brand-dark/50" />
      </div>
      <div>
        <p className="font-heading text-[15px] font-semibold text-slate-700">{title}</p>
        {description && <p className="mt-1 text-sm font-body text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}
