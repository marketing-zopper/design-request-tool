import { createContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { signInWithGoogle, signOut } from '../lib/auth'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    email: session?.user?.email ?? null,
    loading,
    signInWithGoogle: (redirectTo, options) => signInWithGoogle(redirectTo || window.location.href, options),
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
