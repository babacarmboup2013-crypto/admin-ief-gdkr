-- ============================================================
-- IEF ADMIN — Correction 0002 : récursion RLS (stack overflow)
-- ------------------------------------------------------------
-- Les fonctions d'aide interrogent public.utilisateurs et d'autres
-- tables. Sans `security definer`, ces requêtes réévaluent les
-- policies RLS → récursion infinie ("stack depth limit exceeded").
-- En les déclarant `security definer set search_path = public`,
-- leurs requêtes internes contournent RLS (privilèges du propriétaire),
-- ce qui supprime la récursion. (Pattern officiel Supabase.)
-- ============================================================

create or replace function public.auth_role()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role from public.utilisateurs where id = auth.uid()),
    ''
  );
$$;

create or replace function public.auth_bureau()
returns int
language sql stable security definer set search_path = public
as $$
  select bureau_id from public.utilisateurs where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.auth_role() = 'super_admin';
$$;

create or replace function public.is_chef_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.auth_role() = 'chef_admin';
$$;

create or replace function public.is_rh()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.auth_role() in ('super_admin', 'chef_admin')
         or (select fonction from public.utilisateurs where id = auth.uid()) = 'RH';
$$;

create or replace function public.has_active_delegation()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.delegations d
    where d.delegataire_id = auth.uid()
      and d.active
      and d.date_debut <= now()
      and d.date_fin >= now()
  );
$$;

create or replace function public.supervises_bureau(p_bureau_id int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.inspecteurs_bureaux ib
    where ib.inspecteur_id = auth.uid()
      and ib.bureau_id = p_bureau_id
  );
$$;

create or replace function public.can_access_bureau(p_bureau_id int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.is_super_admin()
    or public.is_chef_admin()
    or public.has_active_delegation()
    or public.auth_bureau() = p_bureau_id
    or public.supervises_bureau(p_bureau_id);
$$;