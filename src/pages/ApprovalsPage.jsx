import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import PageContainer from '../components/layout/PageContainer'
import ManageRequestsTabs from '../components/layout/ManageRequestsTabs'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'
import RequirementApprovalCard from '../components/approvals/RequirementApprovalCard'
import DesignApprovalCard from '../components/approvals/DesignApprovalCard'
import CompletedRequestCard from '../components/approvals/CompletedRequestCard'
import RequestDetailDrawer from '../components/requests/RequestDetailDrawer'
import {
  fetchPendingRequirementApprovals,
  fetchDesignApprovals,
  fetchCompletedApprovals,
  fetchFinalDesignAttachments,
} from '../lib/api'
import { useStakeholderAccess } from '../hooks/useStakeholderAccess'

export default function ApprovalsPage() {
  const { stakeholder, loading: resolvingAccess, error: accessError } = useStakeholderAccess()

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
    Promise.all([fetchPendingRequirementApprovals(), fetchDesignApprovals(), fetchCompletedApprovals()])
      .then(async ([reqApprovals, designApprovalsList, completedList]) => {
        setRequirementApprovals(reqApprovals)
        setDesignApprovals(designApprovalsList)
        setCompletedApprovals(completedList)
        const attachmentsByRequest = await fetchFinalDesignAttachments([
          ...designApprovalsList.map((r) => r.id),
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

  const scopedRequirementApprovals = requirementApprovals.filter((r) => r.stakeholderId === stakeholder?.id)
  const scopedDesignApprovals = designApprovals.filter((r) => r.stakeholderId === stakeholder?.id)
  const scopedCompletedApprovals = completedApprovals.filter((r) => r.stakeholderId === stakeholder?.id)
  const nothingPending = scopedRequirementApprovals.length === 0 && scopedDesignApprovals.length === 0

  return (
    <PageContainer wide>
      <h1 className="font-heading text-[28px] font-bold text-brand-dark sm:text-[32px]">Approvals</h1>
      <p className="mt-1 font-body text-sm text-slate-500">
        Review design requirements and completed designs awaiting approval.
      </p>

      <div className="mt-6">
        <ManageRequestsTabs />
      </div>

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
            Showing approvals for <span className="font-medium text-brand-dark">{stakeholder.name}</span>.
          </p>

          {loading && <LoadingState rows={4} label="Loading approvals..." />}
          {error && <ErrorState description="Couldn't load approvals." onRetry={load} />}

          {!loading && !error && (
            <div className="mt-4 flex flex-col gap-8">
              {nothingPending && <EmptyState title="No approvals pending." description="You're all caught up." />}

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

          <RequestDetailDrawer requestId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />
        </>
      )}
    </PageContainer>
  )
}
