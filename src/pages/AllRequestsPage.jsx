import { useEffect, useMemo, useState } from 'react'
import PageContainer from '../components/layout/PageContainer'
import ManageRequestsTabs from '../components/layout/ManageRequestsTabs'
import RequestFiltersBar from '../components/requests/RequestFiltersBar'
import RequestTable from '../components/requests/RequestTable'
import RequestDetailDrawer from '../components/requests/RequestDetailDrawer'
import TeamLoginGate from '../components/requests/TeamLoginGate'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'
import { fetchAllRequests } from '../lib/api'
import { useTeamAccess } from '../hooks/useTeamAccess'

const EMPTY_FILTERS = { status: '', team: '', stakeholder: '', designType: '' }

export default function AllRequestsPage() {
  const { member, isAuthenticated, login, logout } = useTeamAccess()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [selectedId, setSelectedId] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchAllRequests()
      .then(setRequests)
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isAuthenticated) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const options = useMemo(
    () => ({
      teams: [...new Set(requests.map((r) => r.team).filter(Boolean))].sort(),
      stakeholders: [...new Set(requests.map((r) => r.stakeholderName).filter(Boolean))].sort(),
      designTypes: [...new Set(requests.map((r) => r.design_type).filter(Boolean))].sort(),
    }),
    [requests]
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return requests.filter((r) => {
      if (filters.status && r.status !== filters.status) return false
      if (filters.team && r.team !== filters.team) return false
      if (filters.stakeholder && r.stakeholderName !== filters.stakeholder) return false
      if (filters.designType && r.design_type !== filters.designType) return false
      if (!query) return true
      return (
        r.request_code?.toLowerCase().includes(query) ||
        r.requesterEmail?.toLowerCase().includes(query) ||
        r.design_type?.toLowerCase().includes(query)
      )
    })
  }, [requests, filters, search])

  return (
    <PageContainer wide>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[28px] font-bold text-brand-dark sm:text-[32px]">Design Requests</h1>
          <p className="mt-1 font-body text-sm text-slate-500">Track and manage all incoming design requirements.</p>
        </div>
        {isAuthenticated && (
          <p className="pt-1 text-[13px] font-body text-slate-400">
            Signed in as <span className="font-medium text-slate-600">{member.name}</span> ·{' '}
            <button onClick={logout} className="text-brand-light hover:underline">
              Log out
            </button>
          </p>
        )}
      </div>

      <div className="mt-6">
        <ManageRequestsTabs />
      </div>

      {!isAuthenticated ? (
        <TeamLoginGate onLogin={login} />
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          <RequestFiltersBar
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
            options={options}
          />

          {loading && <LoadingState rows={6} label="Loading requests..." />}
          {error && <ErrorState description="Couldn't load design requests." onRetry={load} />}
          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              title={requests.length === 0 ? 'No requests yet.' : 'No requests match your filters.'}
              description={requests.length === 0 ? 'Submitted design requests will show up here.' : 'Try adjusting your search or filters.'}
            />
          )}
          {!loading && !error && filtered.length > 0 && (
            <RequestTable requests={filtered} onSelect={(r) => setSelectedId(r.id)} />
          )}

          <RequestDetailDrawer requestId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />
        </div>
      )}
    </PageContainer>
  )
}
