-- ============================================================
-- Durcissement des politiques RLS.
-- Règle : seuls l'IEF (chef_admin) et le Super Admin voient tous les bureaux.
-- Tous les autres utilisateurs sont limités à leur propre bureau.
-- À exécuter depuis le SQL Editor Supabase (le DDL n'est pas accessible via l'API).
-- ============================================================

-- ---------- 1. Aides de sécurité ----------
create or replace function public.peut_voir_tous_les_bureaux()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_super_admin() or public.is_chef_admin();
$$;

create or replace function public.bureau_autorise(p_bureau_id int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.is_super_admin()
    or public.is_chef_admin()
    or public.auth_bureau() = p_bureau_id;
$$;

-- Un dossier transmis reste lisible par le bureau destinataire, même s'il
-- appartient encore au bureau d'origine.
create or replace function public.dossier_visible(p_id bigint, p_bureau_id int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.peut_voir_tous_les_bureaux()
    or public.auth_bureau() = p_bureau_id
    or exists (
      select 1
      from public.transmissions t
      where t.type_objet = 'dossier'
        and t.objet_id = p_id
        and t.bureau_destinataire_id = public.auth_bureau()
        and t.statut in ('en_attente', 'accepte', 'traite')
    );
$$;

-- ---------- 2. Courriers ----------
drop policy if exists "courriers_all" on public.courriers;
drop policy if exists "courriers_select" on public.courriers;
drop policy if exists "courriers_insert" on public.courriers;
drop policy if exists "courriers_update" on public.courriers;
drop policy if exists "courriers_delete" on public.courriers;

create policy "courriers_select_bureau_strict"
  on public.courriers for select
  using (public.bureau_autorise(bureau_id));

create policy "courriers_insert_bureau_strict"
  on public.courriers for insert
  with check (
    saisi_par = auth.uid()
    and public.bureau_autorise(bureau_id)
  );

create policy "courriers_update_bureau_strict"
  on public.courriers for update
  using (public.bureau_autorise(bureau_id))
  with check (public.bureau_autorise(bureau_id));

create policy "courriers_delete_owner_or_admin"
  on public.courriers for delete
  using (
    saisi_par = auth.uid()
    or public.peut_voir_tous_les_bureaux()
  );

-- ---------- 3. Dossiers et rapports ----------
drop policy if exists "dossiers_select_bureau_scope" on public.dossiers;
drop policy if exists "dossiers_insert_bureau_scope" on public.dossiers;
drop policy if exists "dossiers_update_bureau_scope" on public.dossiers;
drop policy if exists "dossiers_delete_bureau_scope" on public.dossiers;

create policy "dossiers_select_bureau_strict"
  on public.dossiers for select
  using (public.dossier_visible(id, bureau_id));

create policy "dossiers_insert_bureau_strict"
  on public.dossiers for insert
  with check (
    public.bureau_autorise(bureau_id)
    and (cree_par = auth.uid() or public.auth_role() in ('super_admin', 'chef_admin', 'responsable_bureau'))
  );

create policy "dossiers_update_bureau_strict"
  on public.dossiers for update
  using (
    public.bureau_autorise(bureau_id)
    and public.dossier_visible(id, bureau_id)
  )
  with check (public.bureau_autorise(bureau_id));

create policy "dossiers_delete_bureau_strict"
  on public.dossiers for delete
  using (public.bureau_autorise(bureau_id));

drop policy if exists "rapports_select_bureau_scope" on public.rapports;
drop policy if exists "rapports_insert_bureau_scope" on public.rapports;
drop policy if exists "rapports_update_bureau_scope" on public.rapports;
drop policy if exists "rapports_delete_bureau_scope" on public.rapports;

create policy "rapports_select_bureau_strict"
  on public.rapports for select
  using (public.bureau_autorise(bureau_id));

create policy "rapports_insert_bureau_strict"
  on public.rapports for insert
  with check (
    public.bureau_autorise(bureau_id)
    and (soumis_par = auth.uid() or public.auth_role() in ('super_admin', 'chef_admin', 'responsable_bureau'))
  );

create policy "rapports_update_bureau_strict"
  on public.rapports for update
  using (public.bureau_autorise(bureau_id))
  with check (public.bureau_autorise(bureau_id));

create policy "rapports_delete_bureau_strict"
  on public.rapports for delete
  using (public.bureau_autorise(bureau_id));

-- ---------- 4. Transmissions ----------
drop policy if exists "transmissions_all" on public.transmissions;
drop policy if exists "transmissions_read" on public.transmissions;
drop policy if exists "transmissions_insert" on public.transmissions;
drop policy if exists "transmissions_update" on public.transmissions;

create policy "transmissions_read_bureau_strict"
  on public.transmissions for select
  using (
    public.peut_voir_tous_les_bureaux()
    or bureau_source_id = public.auth_bureau()
    or bureau_destinataire_id = public.auth_bureau()
  );

create policy "transmissions_insert_bureau_strict"
  on public.transmissions for insert
  with check (
    expediteur_id = auth.uid()
    and (
      public.peut_voir_tous_les_bureaux()
      or bureau_source_id = public.auth_bureau()
    )
  );

create policy "transmissions_update_destinataire"
  on public.transmissions for update
  using (
    public.peut_voir_tous_les_bureaux()
    or bureau_destinataire_id = public.auth_bureau()
  )
  with check (
    public.peut_voir_tous_les_bureaux()
    or bureau_destinataire_id = public.auth_bureau()
  );

-- ---------- 5. Storage : bucket courriers ----------
-- Lecture : réservée aux utilisateurs authentifiés (les PDF importés sont
-- stockés sous le dossier du Super Admin, tous bureaux confondus).
-- Écriture : chaque agent ne gère que ses propres fichiers ; IEF et Super Admin
-- peuvent gérer tous les fichiers du bucket.
drop policy if exists "courriers_all" on storage.objects;
drop policy if exists "courriers_storage_all" on storage.objects;
drop policy if exists "courriers_storage_read" on storage.objects;
drop policy if exists "courriers_storage_insert" on storage.objects;
drop policy if exists "courriers_storage_update" on storage.objects;
drop policy if exists "courriers_storage_delete" on storage.objects;

create policy "courriers_storage_read"
  on storage.objects for select
  using (bucket_id = 'courriers' and auth.role() = 'authenticated');

create policy "courriers_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'courriers'
    and auth.role() = 'authenticated'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.peut_voir_tous_les_bureaux()
    )
  );

create policy "courriers_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'courriers'
    and auth.role() = 'authenticated'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.peut_voir_tous_les_bureaux()
    )
  )
  with check (
    bucket_id = 'courriers'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.peut_voir_tous_les_bureaux()
    )
  );

create policy "courriers_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'courriers'
    and auth.role() = 'authenticated'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.peut_voir_tous_les_bureaux()
    )
  );

notify pgrst, 'reload schema';

-- FIN DU SCRIPT
