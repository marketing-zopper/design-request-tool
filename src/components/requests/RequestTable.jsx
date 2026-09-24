import { ChevronRight } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { formatDate } from '../../lib/format'

const COLUMNS = ['Request ID', 'Requirement', 'Requested By', 'Team', 'Stakeholder', 'Deadline', 'Status', 'Created']

function requirementLabel(request) {
  return request.design_type === 'Other' ? request.custom_design_type || 'Other' : request.design_type
}

export default function RequestTable({ requests, onSelect }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {COLUMNS.map((col) => (
                <th key={col} className="px-4 py-3 text-[11px] font-body font-semibold uppercase tracking-wide text-slate-400">
                  {col}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr
                key={request.id}
                onClick={() => onSelect(request)}
                className="cursor-pointer border-b border-slate-100 text-sm font-body text-slate-600 last:border-0 hover:bg-brand-light/5"
              >
                <td className="px-4 py-3.5 font-heading font-semibold text-brand-dark">{request.request_code}</td>
                <td className="max-w-[180px] truncate px-4 py-3.5">{requirementLabel(request)}</td>
                <td className="px-4 py-3.5">{request.requesterEmail}</td>
                <td className="px-4 py-3.5">{request.team}</td>
                <td className="max-w-[140px] truncate px-4 py-3.5">{request.stakeholderName}</td>
                <td className="px-4 py-3.5">{formatDate(request.deadline)}</td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={request.status} />
                </td>
                <td className="px-4 py-3.5 text-slate-400">{formatDate(request.created_at)}</td>
                <td className="px-4 py-3.5 text-slate-300">
                  <ChevronRight className="h-4 w-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {requests.map((request) => (
          <button
            key={request.id}
            onClick={() => onSelect(request)}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="font-heading text-sm font-semibold text-brand-dark">{request.request_code}</span>
              <StatusBadge status={request.status} />
            </div>
            <p className="text-sm font-body font-medium text-slate-700">{requirementLabel(request)}</p>
            <div className="flex items-center justify-between text-[12px] font-body text-slate-400">
              <span>
                {request.requesterEmail} · {request.team}
              </span>
              <span>Due {formatDate(request.deadline)}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
