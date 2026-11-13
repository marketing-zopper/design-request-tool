// Shared by every Edge Function invoked directly from the browser (via
// supabase.functions.invoke) — unlike the cron-only functions, these need
// CORS headers on every response, including an explicit answer to the
// browser's OPTIONS preflight, or the request never even reaches the
// function body (same class of bug send-request-confirmation already hit
// once — see its own header comment).

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
