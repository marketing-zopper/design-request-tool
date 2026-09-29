import { useEffect, useMemo, useState } from 'react'
import { Archive, ArchiveRestore, Lock } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer'
import RequestFiltersBar from '../components/requests/RequestFiltersBar'
import RequestTable from '../components/requests/RequestTable'
import RequestDetailDrawer from '../components/requests/RequestDetailDrawer'
import TeamLoginGate from '../components/requests/TeamLoginGate'
import RequirementApprovalCard from '../components/approvals/RequirementApprovalCard'
import DesignApprovalCard from '../components/approvals/DesignApprovalCard'
import CompletedRequestCard from '../components/approvals/CompletedRequestCard'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'
import {
  fetchAllRequests,
  fetchAwaitedApprovals,
  fetchCompletedApprovals,
  fetchFinalDesignAttachments,
} from '../lib/api'
import { useTeamAccess } from '../hooks/useTeamAccess'
import { useStakeholderAccess } from '../hooks/useStakeholderAccess'
import { DEFAULT_DAYS_FILTER } from '../lib/constants'

const EMPTY_FILTERS = { status: '', team: '', stakeholder: '', designType: '' }

/**
 * A stakeholder's magic-link token (see useStakeholderAccess) and a
 * marketing-team login (see useTeamAccess) both land on this one route —
 * there's no separate "Approvals" page/tab anymore. Whichever mode applies
 * decides what's rendered below; the two never overlap for one visit.
 */
export default function AllRequestsPage() {
  const stakeholderAccess = useStakeholderAccess()

  if (stakeholderAccess.hasToken) {
    return <StakeholderView {...stakeholderAccess} />
  }
  return <TeamView />
}

function StakeholderView({ stakeholder, loading: resolvingAccess, error: accessError }) {
  const [requirementApprovals, setRequirementApprovals] = useState([])
  const [designApprovals, setDesignApprovals] = useState([])
  const [completedApprovals, setCompletedApprovals] = useState([])
  const [finalDesignsByRequest, setFinalDesignsByRequest] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([fetchAwaitedApprovals(), fetchCompletedApprovals()])
      .then(async ([awaitedList, completedList]) => {
        // AWAITED_APPROVAL covers both a first-time requirement approval and
        // a final-design approval — hasFinalDesign is what tells them apart.
        setRequirementApprovals(awaitedList.filter((r) => !r.hasFinalDesign))
        setDesignApprovals(awaitedList.filter((r) => r.hasFinalDesign))
        setCompletedApprovals(completedList)
        const attachmentsByRequest = await fetchFinalDesignAttachments([
          ...awaitedList.filter((r) => r.hasFinalDesign).map((r) => r.id),
          ...completedList.map((r) => r.id),
        ])
        setFinalDesignsByRequest(attachmentsByRequest)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (stakeholder) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakeholder?.id])

  // A stakeholder only ever sees requests naming them — never anyone else's.
  const scopedRequirementApprovals = requirementApprovals.filter((r) => r.stakeholderId === stakeholder?.id)
  const scopedDesignApprovals = designApprovals.filter((r) => r.stakeholderId === stakeholder?.id)
  const scopedCompletedApprovals = completedApprovals.filter((r) => r.stakeholderId === stakeholder?.id)
  const nothingPending = scopedRequirementApprovals.length === 0 && scopedDesignApprovals.length === 0

  return (
    <PageContainer wide>
      <h1 className="font-heading text-[28px] font-bold text-brand-dark sm:text-[32px]">All Requests</h1>
      <p className="mt-1 font-body text-sm text-slate-500">
        Design requests where you&rsquo;re the stakeholder — review, approve or request changes.
      </p>

      {resolvingAccess && <LoadingState rows={3} label="Checking your approval link..." />}

      {!resolvingAccess && accessError && (
        <div className="mt-4">
          <ErrorState description="Couldn't verify your approval link." />
        </div>
      )}

      {!resolvingAccess && !accessError && !stakeholder && (
        <div className="mt-4">
          <EmptyState
            icon={Lock}
            title="This page is only accessible from your personal approval link."
            description="Check your email for the latest approval notification and use the “Approve Now” button there."
          />
        </div>
      )}

      {stakeholder && (
        <>
          <p className="mt-5 text-sm font-body text-slate-500">
            Showing requests for <span className="font-medium text-brand-dark">{stakeholder.name}</span>.
          </p>

          {loading && <LoadingState rows={4} label="Loading requests..." />}
          {error && <ErrorState description="Couldn't load requests." onRetry={load} />}

          {!loading && !error && (
            <div className="mt-4 flex flex-col gap-8">
              {nothingPending && scopedCompletedApprovals.length === 0 && (
                <EmptyState title="No requests yet." description="Requests naming you as stakeholder will show up here." />
              )}
              {nothingPending && scopedCompletedApprovals.length > 0 && (
                <EmptyState title="No approvals pending." description="You're all caught up." />
              )}

              {scopedRequirementApprovals.length > 0 && (
                <section>
                  <h2 className="font-heading text-lg font-semibold text-slate-700">Requirement Approvals</h2>
                  <div className="mt-3 flex flex-col gap-3">
                    {scopedRequirementApprovals.map((request) => (
                      <RequirementApprovalCard
                        key={request.id}
                        request={request}
                        onView={() => setSelectedId(request.id)}
                        onResolved={load}
                      />
                    ))}
                  </div>
                </section>
              )}

              {scopedDesignApprovals.length > 0 && (
                <section>
                  <h2 className="font-heading text-lg font-semibold text-slate-700">Design Approvals</h2>
                  <div className="mt-3 flex flex-col gap-3">
                    {scopedDesignApprovals.map((request) => (
                      <DesignApprovalCard
                        key={request.id}
                        request={request}
                        latestDesign={finalDesignsByRequest[request.id]?.[0]}
                        onView={() => setSelectedId(request.id)}
                        onResolved={load}
                      />
                    ))}
                  </div>
                </section>
              )}

              {scopedCompletedApprovals.length > 0 && (
                <section>
                  <h2 className="font-heading text-lg font-semibold text-slate-700">Completed</h2>
                  <div className="mt-3 flex flex-col gap-3">
                    {scopedCompletedApprovals.map((request) => (
                      <CompletedRequestCard
                        key={request.id}
                        request={request}
                        finalDesignAttachments={finalDesignsByRequest[request.id] || []}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          <RequestDetailDrawer
            requestId={selectedId}
            onClose={() => setSelectedId(null)}
            onChanged={load}
            allowManageActions={false}
          />
        </>
      )}
    </PageContainer>
  )
}

function TeamView() {
  const { member, isAuthenticated, login, logout } = useTeamAccess()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [daysFilter, setDaysFilter] = useState(DEFAULT_DAYS_FILTER)
  const [selectedId, setSelectedId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

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

  const activeRequests = useMemo(() => requests.filter((r) => !r.archived), [requests])
  const archivedRequests = useMemo(() => requests.filter((r) => r.archived), [requests])

  const options = useMemo(
    () => ({
      teams: [...new Set(activeRequests.map((r) => r.team).filter(Boolean))].sort(),
      stakeholders: [...new Set(activeRequests.map((r) => r.stakeholderName).filter(Boolean))].sort(),
      designTypes: [...new Set(activeRequests.map((r) => r.design_type).filter(Boolean))].sort(),
    }),
    [activeRequests]
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const cutoff = Date.now() - daysFilter * 24 * 60 * 60 * 1000
    return activeRequests.filter((r) => {
      if (new Date(r.created_at).getTime() < cutoff) return false
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
  }, [activeRequests, filters, search, daysFilter])

  return (
    <PageContainer wide>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[28px] font-bold text-brand-dark sm:text-[32px]">All Requests</h1>
          <p className="mt-1 font-body text-sm text-slate-500">Track, manage and archive all incoming design requests.</p>
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

      {!isAuthenticated ? (
        <div className="mt-6">
          <TeamLoginGate onLogin={login} />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <RequestFiltersBar
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
            options={options}
            daysFilter={daysFilter}
            onDaysFilterChange={setDaysFilter}
          />

          {loading && <LoadingState rows={6} label="Loading requests..." />}
          {error && <ErrorState description="Couldn't load design requests." onRetry={load} />}
          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              title={activeRequests.length === 0 ? 'No requests yet.' : 'No requests match your filters.'}
              description={
                activeRequests.length === 0
                  ? 'Submitted design requests will show up here.'
                  : 'Try adjusting your search, filters or time range.'
              }
            />
          )}
          {!loading && !error && filtered.length > 0 && (
            <RequestTable requests={filtered} onSelect={(r) => setSelectedId(r.id)} />
          )}

          {!loading && !error && (
            <div>
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-1.5 text-[13px] font-body font-medium text-slate-500 hover:text-brand-dark"
              >
                {showArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {showArchived ? 'Hide' : 'Show'} Archived Requests ({archivedRequests.length})
              </button>

              {showArchived && (
                <div className="mt-3">
                  {archivedRequests.length === 0 ? (
                    <EmptyState title="No archived requests." description="Requests you archive will show up here." />
                  ) : (
                    <RequestTable requests={archivedRequests} onSelect={(r) => setSelectedId(r.id)} />
                  )}
                </div>
              )}
            </div>
          )}

          <RequestDetailDrawer requestId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />
        </div>
      )}
    </PageContainer>
  )
}
