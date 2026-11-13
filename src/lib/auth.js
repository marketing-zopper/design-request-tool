import { supabase } from './supabase'

/**
 * redirectTo should be the CURRENT url (including query string) in almost
 * every caller — that's what lets a stakeholder's ?token=... survive the
 * Google OAuth round-trip and land them back on the same approval link.
 */
export function signInWithGoogle(redirectTo) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { prompt: 'select_account' },
    },
  })
}

export function signOut() {
  return supabase.auth.signOut()
}
