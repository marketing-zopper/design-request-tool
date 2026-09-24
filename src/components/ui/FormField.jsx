import clsx from 'clsx'

export const inputBaseClass = clsx(
  'w-full h-11 rounded-lg border border-slate-200 bg-[#F6F8FC] px-3.5 text-sm font-body text-slate-700',
  'placeholder:text-slate-400 transition-colors',
  'focus:outline-none focus:ring-2 focus:ring-brand-light/50 focus:border-brand-light focus:bg-white'
)

export default function FormField({ label, htmlFor, error, hint, required, children, className }) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium font-body text-slate-600">
          {label}
          {required && <span className="text-brand-orange"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-[11px] font-body text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] font-body text-rose-500">{error}</p>}
    </div>
  )
}
