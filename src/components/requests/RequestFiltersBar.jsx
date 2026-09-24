import { Search } from 'lucide-react'
import SelectField from '../ui/SelectField'
import { inputBaseClass } from '../ui/FormField'
import { STATUS_LABELS } from '../../lib/constants'

export default function RequestFiltersBar({ search, onSearchChange, filters, onFilterChange, options }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by request ID, requester email or design type"
          className={`${inputBaseClass} pl-9`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-shrink-0">
        <SelectField
          className="!h-10 sm:w-36"
          includePlaceholderOption={false}
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>

        <SelectField
          className="!h-10 sm:w-36"
          includePlaceholderOption={false}
          value={filters.team}
          onChange={(e) => onFilterChange('team', e.target.value)}
        >
          <option value="">All Teams</option>
          {options.teams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </SelectField>

        <SelectField
          className="!h-10 sm:w-40"
          includePlaceholderOption={false}
          value={filters.stakeholder}
          onChange={(e) => onFilterChange('stakeholder', e.target.value)}
        >
          <option value="">All Stakeholders</option>
          {options.stakeholders.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </SelectField>

        <SelectField
          className="!h-10 sm:w-40"
          includePlaceholderOption={false}
          value={filters.designType}
          onChange={(e) => onFilterChange('designType', e.target.value)}
        >
          <option value="">All Design Types</option>
          {options.designTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  )
}
