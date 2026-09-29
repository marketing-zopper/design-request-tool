import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
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

/**
 * Like SelectField, but editable — pick a suggestion or just type your own
 * value. For fields like Design Type, where most requests fit a preset but
 * some need something the list doesn't cover; typing something that isn't
 * in `options` is always a valid value, not just picking one.
 */
const ComboField = forwardRef(function ComboField(
  { className, options, placeholder, value, onChange, onBlur, name, disabled, ...rest },
  forwardedRef
) {
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [displayValue, setDisplayValue] = useState(value ?? '')

  useEffect(() => {
    if (value !== undefined) setDisplayValue(value)
  }, [value])

  // Uncontrolled (react-hook-form) usage: seed from the DOM once mounted
  // (covers a one-time `reset(defaultValues)`), then stay in sync via events.
  useEffect(() => {
    const el = inputRef.current
    if (!el || value !== undefined) return
    setDisplayValue(el.value)
    const handler = () => setDisplayValue(el.value)
    el.addEventListener('input', handler)
    return () => el.removeEventListener('input', handler)
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

  const filteredOptions = useMemo(() => {
    const query = (displayValue || '').trim().toLowerCase()
    if (!query) return options
    return options.filter((opt) => opt.toLowerCase().includes(query))
  }, [options, displayValue])

  const selectOption = (optionValue) => {
    const el = inputRef.current
    if (el) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(el, optionValue)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    setDisplayValue(optionValue)
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={mergeRefs(inputRef, forwardedRef)}
        type="text"
        name={name}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setDisplayValue(e.target.value)
          setOpen(true)
          onChange?.(e)
        }}
        onBlur={onBlur}
        className={clsx(inputBaseClass, disabled && 'cursor-not-allowed opacity-60', className)}
        {...(value !== undefined ? { value } : {})}
        {...rest}
      />

      {open && filteredOptions.length > 0 && (
        <ul className="scroll-thin absolute z-30 mt-1.5 max-h-[116px] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-pop">
          {filteredOptions.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(opt)}
                className={clsx(
                  'flex w-full items-center px-3.5 py-2 text-left text-sm font-body text-slate-600 hover:bg-brand-light/10',
                  opt === displayValue && 'font-medium text-brand-dark'
                )}
              >
                <span className="truncate">{opt}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

export default ComboField
