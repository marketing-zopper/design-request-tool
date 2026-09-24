/**
 * Human-readable request codes (e.g. "DR-1021") are generated server-side by a
 * Postgres sequence + trigger (see supabase/migrations/0001_init.sql). This keeps
 * generation race-safe under concurrent submissions, unlike a client-side
 * "select max + 1" approach. This module just helps format/parse the codes.
 */

const CODE_PREFIX = 'DR-'

export function formatRequestCode(numericId) {
  return `${CODE_PREFIX}${numericId}`
}

export function isRequestCode(value) {
  return typeof value === 'string' && new RegExp(`^${CODE_PREFIX}\\d+$`).test(value)
}

export function storagePathFor(requestCode, category, fileName) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const folder = { reference: 'references', brand_asset: 'brand-assets', final_design: 'final-designs' }[
    category
  ]
  return `${requestCode}/${folder}/${Date.now()}-${safeName}`
}
