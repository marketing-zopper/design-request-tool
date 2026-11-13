// Resolves a signed-in user's Design Request Tool role from the centrally
// managed Upstash Redis RBAC store owned by the Zopper Marketing Studio
// Master App. READ-ONLY: this module must never issue anything but HGET
// against Upstash — the Master App, not this tool, owns that data.
//
// Schema (verified by direct read-only inspection, not guessed): the key
// `zms:employees` is a Redis HASH, field = employee email (lowercase), value
// = a JSON string shaped like:
//   { "email": "...", "active": true,
//     "roles": { "design-request": "editor" | "admin" | "viewer" | ... } }
// Our tool's slug inside `roles` is "design-request".
//
// marketingext@zopper.com is the product's hardcoded "Global Super Admin" —
// confirmed NOT present in zms:employees at all, so it bypasses Upstash
// entirely rather than being looked up.
//
// Fail-closed: any missing record, inactive flag, unreadable Upstash
// response, or role value other than exactly "editor"/"admin" resolves to
// 'no_access' — this also covers "viewer", which the product intentionally
// disables for this tool.

const TOOL_SLUG = 'design-request'
const SUPER_ADMIN_EMAIL = 'marketingext@zopper.com'
const UPSTASH_TIMEOUT_MS = 5000

export type ResolvedRole = 'super_admin' | 'admin' | 'editor' | 'no_access'

export interface RoleResolution {
  email: string
  role: ResolvedRole
  source:
    | 'super_admin_hardcode'
    | 'upstash'
    | 'upstash_unreachable_fail_closed'
    | 'not_found_fail_closed'
    | 'inactive_fail_closed'
    | 'role_not_allowed_fail_closed'
}

export async function resolveRole(rawEmail: string): Promise<RoleResolution> {
  const email = (rawEmail || '').trim().toLowerCase()

  if (email === SUPER_ADMIN_EMAIL) {
    return { email, role: 'super_admin', source: 'super_admin_hardcode' }
  }

  const upstashUrl = Deno.env.get('UPSTASH_REDIS_REST_URL')
  const upstashToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')
  if (!upstashUrl || !upstashToken) {
    return { email, role: 'no_access', source: 'upstash_unreachable_fail_closed' }
  }

  let result: string | null = null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTASH_TIMEOUT_MS)
    const res = await fetch(`${upstashUrl}/hget/zms:employees/${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      return { email, role: 'no_access', source: 'upstash_unreachable_fail_closed' }
    }
    const body = await res.json()
    result = body?.result ?? null
  } catch {
    return { email, role: 'no_access', source: 'upstash_unreachable_fail_closed' }
  }

  if (!result) {
    return { email, role: 'no_access', source: 'not_found_fail_closed' }
  }

  let record: any
  try {
    record = JSON.parse(result)
  } catch {
    return { email, role: 'no_access', source: 'not_found_fail_closed' }
  }

  if (record?.active !== true) {
    return { email, role: 'no_access', source: 'inactive_fail_closed' }
  }

  const toolRole = record?.roles?.[TOOL_SLUG]
  if (toolRole === 'admin') return { email, role: 'admin', source: 'upstash' }
  if (toolRole === 'editor') return { email, role: 'editor', source: 'upstash' }
  return { email, role: 'no_access', source: 'role_not_allowed_fail_closed' }
}

export function hasAnyAccess(role: ResolvedRole) {
  return role === 'editor' || role === 'admin' || role === 'super_admin'
}

export function canArchive(role: ResolvedRole) {
  return role === 'admin' || role === 'super_admin'
}
