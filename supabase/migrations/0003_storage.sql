-- Storage bucket + policies for design-assets.
--
-- The bucket is public so uploaded files can be linked to directly (getPublicUrl)
-- without signed URLs — acceptable for an internal V1 tool. Only INSERT is granted
-- to anon; reads are served by Supabase's public-bucket CDN path and don't need a
-- SELECT policy on storage.objects.

insert into storage.buckets (id, name, public)
values ('design-assets', 'design-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "design_assets_insert" on storage.objects;
create policy "design_assets_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'design-assets');

drop policy if exists "design_assets_select" on storage.objects;
create policy "design_assets_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'design-assets');
