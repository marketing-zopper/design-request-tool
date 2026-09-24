import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'

const NAV_ITEMS = [
  { label: 'Submit Request', to: '/submit' },
  { label: 'Manage Requests', to: '/requests', match: ['/requests', '/approvals'] },
]

export default function AppHeader() {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <img src="/zopper-logo.png" alt="Zopper" className="h-7 w-auto" />
          <span className="h-5 w-px bg-slate-200" />
          <span className="font-heading text-[15px] font-bold uppercase tracking-wide text-brand-dark sm:text-base">
            Design Request Tool
          </span>
        </div>

        <nav className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1">
          {NAV_ITEMS.map((item) => {
            const isActive = (item.match || [item.to]).some((path) => location.pathname.startsWith(path))
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={clsx(
                  'rounded-lg px-3.5 py-2 text-[13px] font-body font-medium transition-colors sm:text-sm',
                  isActive ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-brand-dark'
                )}
              >
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
