import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-brand-orange text-white hover:bg-orange-600 shadow-sm disabled:bg-orange-300',
  secondary:
    'bg-white text-brand-dark border border-brand-dark/15 hover:bg-brand-dark/5 disabled:text-slate-400 disabled:border-slate-200',
  outline:
    'bg-white text-brand-light border border-brand-light/40 hover:bg-brand-light/10 disabled:text-slate-400 disabled:border-slate-200',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
  danger: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 disabled:text-rose-200',
}

const SIZES = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  children,
  icon,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-body font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/50 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}
