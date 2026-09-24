import { supabase, STORAGE_BUCKET } from './supabase'
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_MB } from './constants'

export function validateFile(file) {
  const isAcceptedType =
    ACCEPTED_FILE_TYPES.includes(file.type) ||
    /\.(png|jpe?g|webp|gif|svg|pdf|ppt|pptx|doc|docx)$/i.test(file.name)
  if (!isAcceptedType) {
    return `"${file.name}" isn't a supported file type.`
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `"${file.name}" is larger than ${MAX_FILE_SIZE_MB}MB.`
  }
  return null
}

/**
 * Uploads a single file to the design-assets bucket at the given storage path.
 * Supabase's JS client doesn't expose byte-level progress, so callers get
 * coarse status updates (uploading -> done/error) via onStatusChange.
 */
export async function uploadFile(file, path, { onStatusChange } = {}) {
  onStatusChange?.('uploading')
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    onStatusChange?.('error')
    throw error
  }

  onStatusChange?.('done')
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

export async function removeFile(path) {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])
  if (error) throw error
}

export function getPublicUrl(path) {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * A plain `<a href=publicUrl download>` doesn't reliably force a download —
 * Supabase Storage URLs are a different origin than the app, and browsers
 * ignore the `download` attribute cross-origin. Supabase's storage API
 * supports a `download` option that makes it respond with
 * `Content-Disposition: attachment`, which works regardless of origin.
 */
export function getDownloadUrl(path, filename) {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path, { download: filename || true })
  return data.publicUrl
}
