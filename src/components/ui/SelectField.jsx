import { forwardRef } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { inputBaseClass } from './FormField'

const SelectField = forwardRef(function SelectField(
  { className, children, placeholder, includePlaceholderOption = true, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={clsx(inputBaseClass, 'appearance-none pr-9 cursor-pointer', className)}
        {...props}
      >
        {includePlaceholderOption && (
          <option value="" disabled>
            {placeholder || 'Select an option'}
          </option>
        )}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    </div>
  )
})

export default SelectField
