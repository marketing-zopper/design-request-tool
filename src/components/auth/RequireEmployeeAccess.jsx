import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'
import GoogleSignInGate from './GoogleSignInGate'
import NoAccessScreen from './NoAccessScreen'
import LoadingState from '../ui/LoadingState'
import PageContainer from '../layout/PageContainer'

/**
 * Gates an employee-only area (Submit Request, the team's All Requests
 * view) behind Google sign-in + an eligible Design Request Tool role
 * (Editor/Admin/Super Admin — Viewer and No Access are both denied here).
 * This is a UI convenience only — the real enforcement is server-side, in
 * supabase/functions/employee-actions and the RLS migrations it depends on.
 */
export default function RequireEmployeeAccess({ children }) {
  const { session, loading: authLoading } = useAuth()
  const { hasAnyAccess, roleLoading } = useRole()

  if (authLoading || (session && roleLoading)) {
    return (
      <PageContainer>
        <LoadingState rows={3} label="Checking your access..." />
      </PageContainer>
    )
  }

  if (!session) {
    return (
      <PageContainer>
        <GoogleSignInGate
          title="Sign in to continue"
          description="This area is for the internal Zopper Marketing Studio team."
        />
      </PageContainer>
    )
  }

  if (!hasAnyAccess) {
    return (
      <PageContainer>
        <NoAccessScreen />
      </PageContainer>
    )
  }

  return children
}
