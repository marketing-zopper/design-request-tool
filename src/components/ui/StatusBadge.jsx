import clsx from 'clsx'
import { STATUS_LABELS, STATUS_STYLES } from '../../lib/constants'

export default function StatusBadge({ status, className }) {
  const label = STATUS_LABELS[status] || status
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium font-body whitespace-nowrap',
        style,
        className
      )}
    >
      {label}
    </span>
  )
}
