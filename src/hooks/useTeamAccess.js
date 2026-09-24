import { useCallback, useState } from 'react'
import { clearTeamSession, loadTeamSession, saveTeamSession, verifyTeamLogin } from '../lib/teamAccess'

export function useTeamAccess() {
  const [member, setMember] = useState(loadTeamSession)

  const login = useCallback((email, password) => {
    const result = verifyTeamLogin(email, password)
    if (result.ok) {
      saveTeamSession(result.member)
      setMember(result.member)
    }
    return result
  }, [])

  const logout = useCallback(() => {
    clearTeamSession()
    setMember(null)
  }, [])

  return { member, isAuthenticated: Boolean(member), login, logout }
}
