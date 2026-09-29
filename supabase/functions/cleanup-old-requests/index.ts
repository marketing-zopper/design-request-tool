// Enforces the 60-day retention window: deletes design_requests (and their
// storage files) older than that, plus any request_batches left with no
// remaining design_requests. Invoked once a day by pg_cron (see
// supabase/migrations/0011_retention_cleanup_cron.sql).
//
// Deployed with --no-verify-jwt, same as send-approval-digest, since pg_cron
// calls this over plain HTTP and authenticates with the x-digest-secret
// header instead of a Supabase user JWT.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DIGEST_INVOKE_SECRET = Deno.env.get('DIGEST_INVOKE_SECRET')!
const STORAGE_BUCKET = 'design-assets'
const RETENTION_DAYS = 60

Deno.serve(async (req) => {
  if (req.headers.get('x-digest-secret') !== DIGEST_INVOKE_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: expired, error: findError } = await supabase
    .from('design_requests')
    .select('id, batch_id, attachments (file_path)')
    .lt('created_at', cutoff)
  if (findError) return new Response(JSON.stringify({ error: findError.message }), { status: 500 })

  if (!expired || expired.length === 0) {
    return new Response(JSON.stringify({ deleted: 0, orphanBatchesDeleted: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const filePaths = expired.flatMap((r: any) => (r.attachments || []).map((a: any) => a.file_path))
  if (filePaths.length) {
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove(filePaths)
    if (storageError) {
      // Don't let an orphaned file block the DB cleanup — log and continue.
      console.error('storage cleanup error', storageError.message)
    }
  }

  const ids = expired.map((r: any) => r.id)
  const batchIds = [...new Set(expired.map((r: any) => r.batch_id))]

  const { error: deleteError } = await supabase.from('design_requests').delete().in('id', ids)
  if (deleteError) return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 })

  const { data: stillReferenced, error: stillRefError } = await supabase
    .from('design_requests')
    .select('batch_id')
    .in('batch_id', batchIds)
  if (stillRefError) return new Response(JSON.stringify({ error: stillRefError.message }), { status: 500 })

  const stillReferencedIds = new Set((stillReferenced ?? []).map((r: any) => r.batch_id))
  const orphanBatchIds = batchIds.filter((id) => !stillReferencedIds.has(id))
  if (orphanBatchIds.length) {
    const { error: batchDeleteError } = await supabase.from('request_batches').delete().in('id', orphanBatchIds)
    if (batchDeleteError) console.error('orphan batch cleanup error', batchDeleteError.message)
  }

  return new Response(
    JSON.stringify({ deleted: ids.length, orphanBatchesDeleted: orphanBatchIds.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
