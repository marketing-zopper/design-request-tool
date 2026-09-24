import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { resolveStakeholderByToken } from '../lib/api'

const STORAGE_KEY = 'approvals-access-token'

/**
 * Gates the Approvals page without a login system: a stakeholder only gets in
 * via the personal ?token=... link sent in their daily digest email. The
 * token is remembered in sessionStorage so refreshing /approvals doesn't
 * require clicking the email link again, but there's no further identity
 * check — whoever holds the link is trusted as that stakeholder, by design.
 */
export function useStakeholderAccess() {
  const [searchParams] = useSearchParams()
  const urlToken = searchParams.get('token')

  const [stakeholder, setStakeholder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = urlToken || sessionStorage.getItem(STORAGE_KEY)
    if (!token) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    resolveStakeholderByToken(token)
      .then((resolved) => {
        if (resolved) {
          sessionStorage.setItem(STORAGE_KEY, token)
          setStakeholder(resolved)
        } else {
          sessionStorage.removeItem(STORAGE_KEY)
          setStakeholder(null)
        }
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [urlToken])

  return { stakeholder, loading, error, hasToken: Boolean(urlToken || sessionStorage.getItem(STORAGE_KEY)) }
}
