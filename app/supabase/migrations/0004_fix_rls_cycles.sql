-- ============================================================
-- IEF ADMIN — Correctif 0004 : suppression des cycles RLS
-- ------------------------------------------------------------
-- Symptôme : toute requête sur public.reunions lève
--   "infinite recursion detected in policy for relation \"reunions\""
-- Cause : des policies se référencent mutuellement via des
--   sous-requêtes directes :
--   - reunions_select        -> subquery reunion_participants
--   - reunion_participants_* -> subquery reunions
--   - fils_discussion_select -> subquery fil_participants
--   - fil_participants_write -> subquery fils_discussion
--   - messages_select        -> subquery fils_discussion
-- Fix (pattern officiel Supabase) : encapsuler ces sous-requêtes
--   dans des fonctions security definer (périmètre du propriétaire,
--   RLS contournée) → plus aucune boucle dans le graphe de policies.
-- Idempotent.
-- ============================================================

-- --- Helpers security definer ---

create or replace function public.is_reunion_participant(p_reunion_id int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.reunion_participants rp
    where rp.reunion_id = p_reunion_id
      and rp.utilisateur_id = auth.uid()
  );
$$;

create or replace function public.owns_reunion(p_reunion_id int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.reunions r
    where r.id = p_reunion_id
      and r.organise_par = auth.uid()
  );
$$;

create or replace function public.is_fil_participant(p_fil_id int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.fil_participants fp
    where fp.fil_id = p_fil_id
      and fp.utilisateur_id = auth.uid()
  );
$$;

create or replace function public.owns_fil(p_fil_id int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.fils_discussion f
    where f.id = p_fil_id
      and f.cree_par = auth.uid()
  );
$$;

-- --- Policy reunions (select) : remplacer la sous-requête ---

drop policy if exists "reunions_select" on public.reunions;
create policy "reunions_select"
  on public.reunions for select
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or public.can_access_bureau(bureau_id)
    or public.is_reunion_participant(id)
  );

-- --- Policy reunion_participants (write) : remplacer la sous-requête ---

drop policy if exists "reunion_participants_write" on public.reunion_participants;
create policy "reunion_participants_write"
  on public.reunion_participants for all
  using (public.is_super_admin() or public.owns_reunion(reunion_id))
  with check (public.is_super_admin() or public.owns_reunion(reunion_id));

-- --- Policy fils_discussion (select) ---

drop policy if exists "fils_discussion_select" on public.fils_discussion;
create policy "fils_discussion_select"
  on public.fils_discussion for select
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or public.can_access_bureau(bureau_id)
    or public.is_fil_participant(id)
  );

-- --- Policy fil_participants (write) ---

drop policy if exists "fil_participants_write" on public.fil_participants;
create policy "fil_participants_write"
  on public.fil_participants for all
  using (public.is_super_admin() or public.is_chef_admin() or public.owns_fil(fil_id))
  with check (public.is_super_admin() or public.is_chef_admin() or public.owns_fil(fil_id));

-- --- Policy messages (select) ---

drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
  on public.messages for select
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or auteur_id = auth.uid()
    or fil_id in (
      select id from public.fils_discussion f
      where public.can_access_bureau(f.bureau_id)
         or public.is_fil_participant(f.id)
    )
  );