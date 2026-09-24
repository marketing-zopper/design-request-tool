import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

const TABS = [
  { label: 'All Requests', to: '/requests' },
  { label: 'Approvals', to: '/approvals' },
]

export default function ManageRequestsTabs() {
  return (
    <div className="flex gap-6 border-b border-slate-200">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            clsx(
              'relative pb-3 text-sm font-body font-medium transition-colors',
              isActive ? 'text-brand-dark' : 'text-slate-400 hover:text-slate-600'
            )
          }
        >
          {({ isActive }) => (
            <>
              {tab.label}
              {isActive && (
                <span className="absolute -bottom-px left-0 h-[2px] w-full rounded-full bg-brand-orange" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}
