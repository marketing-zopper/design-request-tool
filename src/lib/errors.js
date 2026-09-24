/**
 * Raw browser/network error messages (e.g. "TypeError: Failed to fetch" when
 * Supabase is unreachable or misconfigured) aren't useful to end users. Real
 * Supabase/Postgrest error messages usually are, so those pass through.
 */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const message = err?.message || ''
  if (!message || /failed to fetch|network|NetworkError/i.test(message)) {
    return "Couldn't reach the server. Check your connection and try again."
  }
  return message || fallback
}
