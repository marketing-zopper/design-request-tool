/**
 * File blobs can't be JSON-serialized into sessionStorage, so the multi-step
 * form's text fields are persisted there while actual File objects live here,
 * in a module-scoped map keyed by the requirement's client-side draft id.
 * This survives navigating between routes in the same tab session; it does not
 * survive a hard page reload (the browser never persists File contents itself).
 */
const store = new Map()

export function setDraftFiles(draftId, key, files) {
  const entry = store.get(draftId) || {}
  entry[key] = files
  store.set(draftId, entry)
}

export function getDraftFiles(draftId, key) {
  return store.get(draftId)?.[key] || []
}

export function clearDraftFiles(draftId) {
  store.delete(draftId)
}

export function clearAllDraftFiles() {
  store.clear()
}
