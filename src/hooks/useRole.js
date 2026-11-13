import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Resolves the signed-in user's Design Request Tool role against the
 * centrally-managed Upstash RBAC store (via the resolve-role Edge
 * Function). Cached only in memory for this session — never localStorage —
 * so a role change in the Master App takes effect on next reload, not
 * instantly. Fails closed: any network/server error resolves to 'no_access'
 * rather than defaulting to allow.
 */
export function useRole() {
  const { session, loading: authLoading } = useAuth()
  const [role, setRole] = useState(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [roleError, setRoleError] = useState(null)

  const refetch = useCallback(() => {
    if (!session) {
      setRole(null)
      setRoleLoading(false)
      return
    }
    setRoleLoading(true)
    setRoleError(null)
    supabase.functions
      .invoke('resolve-role')
      .then(({ data, error }) => {
        if (error) throw error
        setRole(data?.role || 'no_access')
      })
      .catch((err) => {
        setRole('no_access')
        setRoleError(err)
      })
      .finally(() => setRoleLoading(false))
  }, [session])

  useEffect(() => {
    if (authLoading) return
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id])

  return {
    role,
    roleLoading: authLoading || roleLoading,
    roleError,
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin',
    isEditor: role === 'editor',
    hasAnyAccess: role === 'editor' || role === 'admin' || role === 'super_admin',
    canArchive: role === 'admin' || role === 'super_admin',
    refetch,
  }
}
