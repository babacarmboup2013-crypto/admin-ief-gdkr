-- ============================================================
-- 0021 — Suppression et archivage des courriers
-- ============================================================

-- La politique précédente n'autorisait la suppression qu'à l'auteur
-- (saisi_par = auth.uid()) ou à l'IEF/Super Admin. Les courriers importés
-- ayant été saisis par le compte d'import, le Secrétariat ne pouvait pas
-- les supprimer. On aligne la suppression sur la lecture/la mise à jour :
-- tout membre du bureau propriétaire peut supprimer ses courriers.
drop policy if exists "courriers_delete_owner_or_admin" on public.courriers;
drop policy if exists "courriers_delete_bureau_strict" on public.courriers;

create policy "courriers_delete_bureau_strict"
  on public.courriers for delete
  using (
    public.bureau_autorise(bureau_id)
    or public.peut_voir_tous_les_bureaux()
    or saisi_par = auth.uid()
  );

-- Le retrait du fichier joint suit la même logique que la lecture et le
-- dépôt dans le bucket courriers (tout personnel authentifié).
drop policy if exists "courriers_storage_delete" on storage.objects;
create policy "courriers_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'courriers' and auth.role() = 'authenticated');

-- Aucune modification n'est nécessaire pour l'archivage : il s'agit d'une
-- mise à jour du champ statut vers 'archive', déjà couverte par
-- "courriers_update_bureau_strict" (migration 0020).
