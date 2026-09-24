import { forwardRef } from 'react'
import clsx from 'clsx'

const TextareaField = forwardRef(function TextareaField({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={clsx(
        'w-full rounded-lg border border-slate-200 bg-[#F6F8FC] px-3.5 py-3 text-sm font-body text-slate-700',
        'placeholder:text-slate-400 transition-colors resize-none',
        'focus:outline-none focus:ring-2 focus:ring-brand-light/50 focus:border-brand-light focus:bg-white',
        className
      )}
      {...props}
    />
  )
})

export default TextareaField
