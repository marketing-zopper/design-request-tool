import { supabase } from './supabase'

/**
 * redirectTo should be the CURRENT url (including query string) in almost
 * every caller — that's what lets a stakeholder's ?token=... survive the
 * Google OAuth round-trip and land them back on the same approval link.
 *
 * No `prompt` param by default — this lets Google silently re-authenticate
 * someone with an already-active browser session (e.g. arriving via Master
 * App, already signed into Google there) with just a brief redirect and no
 * visible account picker, per the product spec. Pass
 * `{ prompt: 'select_account' }` explicitly only for an intentional
 * "switch account" action (see EmailMismatchNotice).
 */
export function signInWithGoogle(redirectTo, { prompt } = {}) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      ...(prompt ? { queryParams: { prompt } } : {}),
    },
  })
}

export function signOut() {
  return supabase.auth.signOut()
}
