import clsx from 'clsx'
import { Check } from 'lucide-react'

export default function Stepper({ steps, currentStep }) {
  return (
    <ol className="flex w-full items-start">
      {steps.map((label, i) => {
        const stepNumber = i + 1
        const isComplete = stepNumber < currentStep
        const isActive = stepNumber === currentStep
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-heading font-semibold transition-colors',
                  isComplete && 'bg-brand-orange text-white',
                  isActive && 'bg-brand-dark text-white',
                  !isComplete && !isActive && 'bg-slate-100 text-slate-400'
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
              </div>
              <span
                className={clsx(
                  'whitespace-nowrap text-[12px] font-body font-medium',
                  isActive || isComplete ? 'text-brand-dark' : 'text-slate-400'
                )}
              >
                {label}
              </span>
            </div>
            {stepNumber !== steps.length && (
              <div
                className={clsx(
                  'mx-2 mt-[-18px] h-[2px] flex-1 rounded',
                  isComplete ? 'bg-brand-orange' : 'bg-slate-200'
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
