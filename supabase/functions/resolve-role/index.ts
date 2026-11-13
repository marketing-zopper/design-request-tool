// Tells the frontend what role the CALLER (and only the caller — never an
// arbitrary email passed in the body, that would let anyone claim any
// identity) has for this tool, per the centrally-managed Upstash RBAC store.
//
// Deployed with the DEFAULT JWT verification (no --no-verify-jwt) — unlike
// the cron-only functions, Supabase's own gateway rejects a missing/invalid
// Supabase Auth JWT before this code ever runs. The caller's email comes
// from that verified JWT's claims.
//
// Secrets required (supabase secrets set ...), read inside resolveRole.ts:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveRole } from '../_shared/resolveRole.ts'
import { CORS_HEADERS } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization') || ''
  const accessToken = authHeader.replace(/^Bearer\s+/i, '')
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'not_authenticated' }), { status: 401, headers: CORS_HEADERS })
  }

  // A service-role client's auth.getUser(token) verifies ANY access token
  // passed to it explicitly — this avoids needing a separate anon-key env
  // var just to check the caller's own JWT.
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken)
  if (userError || !user?.email) {
    return new Response(JSON.stringify({ error: 'not_authenticated' }), { status: 401, headers: CORS_HEADERS })
  }

  const resolution = await resolveRole(user.email)

  return new Response(JSON.stringify(resolution), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
