import clsx from 'clsx'

export function Skeleton({ className }) {
  return <div className={clsx('animate-pulse rounded-lg bg-slate-200/70', className)} />
}

export default function LoadingState({ rows = 4, label }) {
  return (
    <div className="flex flex-col gap-3 py-6" role="status" aria-live="polite">
      {label && <p className="text-sm font-body text-slate-400">{label}</p>}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}
