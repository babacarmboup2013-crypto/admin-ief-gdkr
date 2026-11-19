-- ============================================================
-- Politiques d'acces au bucket Storage `courriers`
-- Pour que l'application puisse ouvrir les 54 PDF importes.
-- Sans ces politiques, Supabase repond "Object not found" (400)
-- aux utilisateurs authentifies.
-- A coller dans le SQL Editor Supabase puis Run.
-- ============================================================

drop policy if exists "courriers_storage_read" on storage.objects;
create policy "courriers_storage_read"
  on storage.objects for select
  using (bucket_id = 'courriers');

drop policy if exists "courriers_storage_insert" on storage.objects;
create policy "courriers_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'courriers');

drop policy if exists "courriers_storage_update" on storage.objects;
create policy "courriers_storage_update"
  on storage.objects for update
  using (bucket_id = 'courriers')
  with check (bucket_id = 'courriers');

drop policy if exists "courriers_storage_delete" on storage.objects;
create policy "courriers_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'courriers');

-- FIN DU SCRIPT — ne rien copier apres cette ligne
notify pgrst, 'reload schema';
