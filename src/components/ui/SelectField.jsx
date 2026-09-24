import { Children, forwardRef, isValidElement, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, ChevronDown } from 'lucide-react'
import { inputBaseClass } from './FormField'

function mergeRefs(...refs) {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return
      if (typeof ref === 'function') ref(node)
      else ref.current = node
    })
  }
}

function extractOptions(children) {
  const options = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== 'option') return
    options.push({ value: child.props.value, label: child.props.children, disabled: child.props.disabled })
  })
  return options
}

/**
 * Renders like a native <select> but the open list is a custom, scrollable
 * listbox — a plain native <select>'s dropdown can't be styled (no reliable
 * max-height/scroll across browsers), which becomes a real problem once a
 * list has more than a handful of options (it can grow taller than the
 * viewport with no way to scroll it). A real, hidden <select> underneath
 * still holds the actual value, so react-hook-form's `register()` and plain
 * controlled `value`/`onChange` usage both keep working unchanged.
 */
const SelectField = forwardRef(function SelectField(
  { className, children, placeholder, includePlaceholderOption = true, value, onChange, onBlur, name, disabled, ...rest },
  forwardedRef
) {
  const selectRef = useRef(null)
  const containerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [displayValue, setDisplayValue] = useState(value ?? '')

  const options = useMemo(() => extractOptions(children), [children])

  useEffect(() => {
    if (value !== undefined) setDisplayValue(value)
  }, [value])

  // Uncontrolled (react-hook-form) usage: seed from the DOM once mounted
  // (covers a one-time `reset(defaultValues)`), then stay in sync via events.
  useEffect(() => {
    const el = selectRef.current
    if (!el || value !== undefined) return
    setDisplayValue(el.value)
    const handler = () => setDisplayValue(el.value)
    el.addEventListener('change', handler)
    return () => el.removeEventListener('change', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const selectOption = (optionValue) => {
    const el = selectRef.current
    if (el) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
      setter.call(el, optionValue)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    setDisplayValue(optionValue)
    setOpen(false)
  }

  const selectedOption = options.find((o) => o.value === displayValue)
  const isPlaceholderShown = !selectedOption

  return (
    <div className="relative" ref={containerRef}>
      <select
        ref={mergeRefs(selectRef, forwardedRef)}
        name={name}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        {...(value !== undefined ? { value } : {})}
        {...rest}
      >
        {includePlaceholderOption && <option value="">{placeholder || 'Select an option'}</option>}
        {children}
      </select>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          inputBaseClass,
          'flex items-center justify-between text-left',
          isPlaceholderShown && 'text-slate-400',
          disabled && 'cursor-not-allowed opacity-60',
          className
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder || 'Select an option'}</span>
        <ChevronDown className={clsx('h-4 w-4 flex-shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul className="scroll-thin absolute z-30 mt-1.5 max-h-[116px] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-pop">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                disabled={opt.disabled}
                onClick={() => selectOption(opt.value)}
                className={clsx(
                  'flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm font-body',
                  opt.disabled ? 'cursor-not-allowed text-slate-300' : 'text-slate-600 hover:bg-brand-light/10',
                  opt.value === displayValue && 'font-medium text-brand-dark'
                )}
              >
                <span className="truncate">{opt.label}</span>
                {opt.value === displayValue && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

export default SelectField
