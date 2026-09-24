/**
 * Lightweight access gate for "All Requests" (the design/marketing team's
 * request-management view) — an allowlist of team emails plus one shared
 * password. This is a soft barrier, not real authentication: the check runs
 * entirely in the browser, the password ships in the JS bundle, and the
 * underlying Supabase RLS policies still grant the anon key full read/write
 * regardless of this gate (same caveat as the stakeholder token gate on
 * /approvals — see README "No-auth security tradeoffs"). It stops casual
 * access, not a determined bypass.
 */

export const MARKETING_TEAM = [
  { name: 'Arpit Jain', email: 'arpit.jain@zopper.com' },
  { name: 'Vasundhra Khatter', email: 'vasundhra.khatter@zopper.com' },
  { name: 'Shreesh Singh', email: 'shreesh.singh@zopper.com' },
  { name: 'Ritika Yadav', email: 'ritika.yadav@zopper.com' },
  { name: 'Farman Khan', email: 'farman.khan@zopper.com' },
]

const TEAM_PASSWORD = 'marketing@zopper'
const STORAGE_KEY = 'manage-requests-team-session'

export function verifyTeamLogin(email, password) {
  const member = MARKETING_TEAM.find((m) => m.email.toLowerCase() === (email || '').toLowerCase())
  if (!member) {
    return { ok: false, error: 'Select your name from the list.' }
  }
  if (password !== TEAM_PASSWORD) {
    return { ok: false, error: 'Incorrect password.' }
  }
  return { ok: true, member }
}

export function saveTeamSession(member) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(member))
  } catch {
    // localStorage unavailable (private mode, etc.) — session just won't persist.
  }
}

export function loadTeamSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return MARKETING_TEAM.some((m) => m.email === parsed?.email) ? parsed : null
  } catch {
    return null
  }
}

export function clearTeamSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
