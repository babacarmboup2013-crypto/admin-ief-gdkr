-- ============================================================
-- IEF ADMIN — Schéma initial (migration 0001)
-- Conforme au Cahier des Charges du projet IEF ADMIN.
-- Sécurité au niveau base de données : RLS sur chaque table métier.
-- ============================================================

-- ============================================================
-- 1. TABLES RÉFÉRENTIELLES
-- ============================================================

create table if not exists public.bureaux (
  id            serial primary key,
  nom           text not null,
  created_at    timestamptz default now()
);

create table if not exists public.utilisateurs (
  id            uuid primary key references auth.users (id) on delete cascade,
  nom_complet   text not null,
  email         text unique not null,
  role          text not null check (
    role in (
      'super_admin',
      'chef_admin',
      'secretaire_general',
      'inspecteur',
      'responsable_bureau',
      'agent_bureau'
    )
  ),
  bureau_id     int references public.bureaux (id),
  fonction      text, -- ex : 'RH', 'Comptable', ...
  actif         boolean default true,
  created_at    timestamptz default now()
);

-- Liaison inspecteurs <-> bureaux (relation many-to-many)
create table if not exists public.inspecteurs_bureaux (
  id            serial primary key,
  inspecteur_id uuid references public.utilisateurs (id) on delete cascade,
  bureau_id     int references public.bureaux (id),
  unique (inspecteur_id, bureau_id)
);

-- Droits granulaires par bureau (lecture / saisie / validation)
create table if not exists public.droits_bureau (
  id            serial primary key,
  bureau_id     int references public.bureaux (id),
  utilisateur_id uuid references public.utilisateurs (id) on delete cascade,
  module        text not null, -- 'dossiers', 'rapports', 'personnel'
  droit         text not null, -- 'lecture','saisie','validation'
  unique (bureau_id, utilisateur_id, module, droit)
);

-- ============================================================
-- 2. MÉTIER : DOSSIERS / RAPPORTS
-- ============================================================

create table if not exists public.dossiers (
  id            serial primary key,
  bureau_id     int references public.bureaux (id),
  titre         text not null,
  statut        text default 'en_cours',
  echeance      date,
  assigne_a     uuid references public.utilisateurs (id),
  cree_par      uuid references public.utilisateurs (id),
  created_at    timestamptz default now()
);

create table if not exists public.rapports (
  id            serial primary key,
  bureau_id     int references public.bureaux (id),
  titre         text not null,
  contenu       text,
  statut        text default 'brouillon', -- brouillon / soumis / valide
  soumis_par    uuid references public.utilisateurs (id),
  valide_par    uuid references public.utilisateurs (id),
  created_at    timestamptz default now()
);

-- ============================================================
-- 3. PÉRIMÈTRE RH : ÉCOLES + PERSONNEL
-- ============================================================

create table if not exists public.ecoles (
  id            serial primary key,
  nom           text not null,
  cycle         text not null check (
    cycle in ('préscolaire', 'élémentaire', 'collège', 'daara_moderne', 'efa')
  ),
  localisation  text,
  effectif_eleves int,
  created_at    timestamptz default now()
);

-- Personnel : bureau (interne IEF) OU école (terrain) — jamais les deux.
create table if not exists public.personnel (
  id            serial primary key,
  bureau_id     int references public.bureaux (id),
  ecole_id      int references public.ecoles (id),
  nom_complet   text not null,
  fonction      text, -- ex : 'RH', 'Directeur d''école', 'Enseignant'
  date_entree   date,
  statut        text default 'actif',
  created_at    timestamptz default now(),
  constraint personnel_affectation_unique check (
    (bureau_id is not null and ecole_id is null)
    or
    (bureau_id is null and ecole_id is not null)
  )
);

-- ============================================================
-- 4. DÉLÉGATION DE POUVOIR (Chef Admin -> Secrétaire Général)
-- ============================================================

create table if not exists public.delegations (
  id              serial primary key,
  delegant_id     uuid references public.utilisateurs (id),      -- Chef Admin (ou Super Admin en son absence)
  delegataire_id  uuid references public.utilisateurs (id),      -- Secrétaire Général
  date_debut      timestamptz not null,
  date_fin        timestamptz not null,
  motif           text,
  active          boolean default true,
  created_at      timestamptz default now()
);

-- ============================================================
-- 5. COMMUNICATION : FILS, MESSAGES, RÉUNIONS
-- ============================================================

create table if not exists public.fils_discussion (
  id            serial primary key,
  bureau_id     int references public.bureaux (id), -- null si fil transversal
  titre         text not null,
  cree_par      uuid references public.utilisateurs (id),
  created_at    timestamptz default now()
);

create table if not exists public.fil_participants (
  id              serial primary key,
  fil_id          int references public.fils_discussion (id) on delete cascade,
  utilisateur_id  uuid references public.utilisateurs (id) on delete cascade,
  unique (fil_id, utilisateur_id)
);

create table if not exists public.messages (
  id            serial primary key,
  fil_id        int references public.fils_discussion (id) on delete cascade, -- null si chat direct
  conversation_id int,                                                          -- chat 1-à-1 / petit groupe
  auteur_id     uuid references public.utilisateurs (id),
  contenu       text not null,
  piece_jointe_url text,
  created_at    timestamptz default now()
);

create table if not exists public.reunions (
  id              serial primary key,
  titre           text not null,
  bureau_id       int references public.bureaux (id), -- null si réunion multi-bureaux
  organise_par    uuid references public.utilisateurs (id),
  date_heure      timestamptz not null,
  ordre_du_jour   text,
  compte_rendu    text,
  lien_visio      text,
  statut          text default 'planifiee', -- planifiee / en_cours / terminee / annulee
  created_at      timestamptz default now()
);

create table if not exists public.reunion_participants (
  id            serial primary key,
  reunion_id    int references public.reunions (id) on delete cascade,
  utilisateur_id uuid references public.utilisateurs (id) on delete cascade,
  statut_presence text default 'invite', -- invite / confirme / absent / present
  unique (reunion_id, utilisateur_id)
);

-- ============================================================
-- 6. AUDIT
-- ============================================================

create table if not exists public.journal_activite (
  id            serial primary key,
  utilisateur_id uuid references public.utilisateurs (id),
  action        text not null,
  cible_table   text,
  cible_id      int,
  created_at    timestamptz default now()
);

-- ============================================================
-- 7. AIDES DE SÉCURITÉ (RLS)
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

-- L'utilisateur dispose-t-il d'une délégation active en tant que secrétaire général ?
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

-- L'utilisateur supervise-t-il un bureau donné (inspecteur) ?
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

-- Accès par bureau : le sien, super/chef admin, inspecteur assigné, ou délégation active.
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

-- ============================================================
-- 8. POLICIES RLS (résumé §4.2 du cahier des charges)
-- ============================================================

alter table public.bureaux enable row level security;
alter table public.utilisateurs enable row level security;
alter table public.inspecteurs_bureaux enable row level security;
alter table public.droits_bureau enable row level security;
alter table public.dossiers enable row level security;
alter table public.rapports enable row level security;
alter table public.ecoles enable row level security;
alter table public.personnel enable row level security;
alter table public.delegations enable row level security;
alter table public.fils_discussion enable row level security;
alter table public.fil_participants enable row level security;
alter table public.messages enable row level security;
alter table public.reunions enable row level security;
alter table public.reunion_participants enable row level security;
alter table public.journal_activite enable row level security;

-- --- bureaux : lecture pour tous les authentifiés, écriture super_admin ---
drop policy if exists "bureaux_select_all_auth" on public.bureaux;
create policy "bureaux_select_all_auth"
  on public.bureaux for select
  using (auth.role() = 'authenticated');

drop policy if exists "bureaux_write_super_admin" on public.bureaux;
create policy "bureaux_write_super_admin"
  on public.bureaux for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- --- utilisateurs : son profil + son bureau ; super/chef voient tout ---
drop policy if exists "utilisateurs_select_own" on public.utilisateurs;
create policy "utilisateurs_select_own"
  on public.utilisateurs for select
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or public.has_active_delegation()
    or id = auth.uid()
    or bureau_id = public.auth_bureau()
  );

drop policy if exists "utilisateurs_insert_super_admin" on public.utilisateurs;
create policy "utilisateurs_insert_super_admin"
  on public.utilisateurs for insert
  with check (public.is_super_admin());

drop policy if exists "utilisateurs_update_own_or_admin" on public.utilisateurs;
create policy "utilisateurs_update_own_or_admin"
  on public.utilisateurs for update
  using (public.is_super_admin() or id = auth.uid())
  with check (public.is_super_admin() or id = auth.uid());

drop policy if exists "utilisateurs_delete_super_admin" on public.utilisateurs;
create policy "utilisateurs_delete_super_admin"
  on public.utilisateurs for delete
  using (public.is_super_admin());

-- --- inspecteurs_bureaux : gestion super_admin ---
drop policy if exists "inspecteurs_bureaux_read" on public.inspecteurs_bureaux;
create policy "inspecteurs_bureaux_read"
  on public.inspecteurs_bureaux for select
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or inspecteur_id = auth.uid()
  );

drop policy if exists "inspecteurs_bureaux_write_super_admin" on public.inspecteurs_bureaux;
create policy "inspecteurs_bureaux_write_super_admin"
  on public.inspecteurs_bureaux for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- --- dossiers / rapports : cloisonnement par bureau ---
drop policy if exists "dossiers_select_bureau_scope" on public.dossiers;
create policy "dossiers_select_bureau_scope"
  on public.dossiers for select
  using (public.can_access_bureau(bureau_id));

drop policy if exists "dossiers_insert_bureau_scope" on public.dossiers;
create policy "dossiers_insert_bureau_scope"
  on public.dossiers for insert
  with check (
    public.can_access_bureau(bureau_id)
    and (cree_par = auth.uid() or public.auth_role() in ('super_admin', 'chef_admin', 'responsable_bureau'))
  );

drop policy if exists "dossiers_update_bureau_scope" on public.dossiers;
create policy "dossiers_update_bureau_scope"
  on public.dossiers for update
  using (public.can_access_bureau(bureau_id))
  with check (public.can_access_bureau(bureau_id));

drop policy if exists "dossiers_delete_bureau_scope" on public.dossiers;
create policy "dossiers_delete_bureau_scope"
  on public.dossiers for delete
  using (public.can_access_bureau(bureau_id));

drop policy if exists "rapports_select_bureau_scope" on public.rapports;
create policy "rapports_select_bureau_scope"
  on public.rapports for select
  using (public.can_access_bureau(bureau_id));

drop policy if exists "rapports_insert_bureau_scope" on public.rapports;
create policy "rapports_insert_bureau_scope"
  on public.rapports for insert
  with check (
    public.can_access_bureau(bureau_id)
    and (soumis_par = auth.uid() or public.auth_role() in ('super_admin', 'chef_admin', 'responsable_bureau'))
  );

drop policy if exists "rapports_update_bureau_scope" on public.rapports;
create policy "rapports_update_bureau_scope"
  on public.rapports for update
  using (public.can_access_bureau(bureau_id))
  with check (public.can_access_bureau(bureau_id));

drop policy if exists "rapports_delete_bureau_scope" on public.rapports;
create policy "rapports_delete_bureau_scope"
  on public.rapports for delete
  using (public.can_access_bureau(bureau_id));

-- --- ecoles : lecture RH / super / chef ; écriture super et bureau RH ---
drop policy if exists "ecoles_select_rh_scope" on public.ecoles;
create policy "ecoles_select_rh_scope"
  on public.ecoles for select
  using (public.is_rh());

drop policy if exists "ecoles_write_rh_scope" on public.ecoles;
create policy "ecoles_write_rh_scope"
  on public.ecoles for all
  using (public.is_super_admin() or public.auth_bureau() = 7)
  with check (public.is_super_admin() or public.auth_bureau() = 7);

-- --- personnel : cloisonnement + exception lecture RH transverse ---
drop policy if exists "personnel_select_scope" on public.personnel;
create policy "personnel_select_scope"
  on public.personnel for select
  using (
    public.is_rh() -- exception RH : bureaux ET écoles
    or public.can_access_bureau(bureau_id)
  );

drop policy if exists "personnel_insert_scope" on public.personnel;
create policy "personnel_insert_scope"
  on public.personnel for insert
  with check (
    public.is_super_admin()
    or public.auth_bureau() = 7
    or (
      public.can_access_bureau(bureau_id)
      and public.auth_role() in ('chef_admin', 'responsable_bureau')
    )
  );

drop policy if exists "personnel_update_scope" on public.personnel;
create policy "personnel_update_scope"
  on public.personnel for update
  using (
    public.is_super_admin()
    or public.auth_bureau() = 7
    or (public.can_access_bureau(bureau_id) and public.auth_role() in ('chef_admin', 'responsable_bureau'))
  )
  with check (
    public.is_super_admin()
    or public.auth_bureau() = 7
    or (public.can_access_bureau(bureau_id) and public.auth_role() in ('chef_admin', 'responsable_bureau'))
  );

drop policy if exists "personnel_delete_scope" on public.personnel;
create policy "personnel_delete_scope"
  on public.personnel for delete
  using (
    public.is_super_admin()
    or public.auth_bureau() = 7
    or (public.can_access_bureau(bureau_id) and public.auth_role() in ('chef_admin', 'responsable_bureau'))
  );

-- --- droits_bureau : super_admin + responsable de son propre bureau ---
drop policy if exists "droits_bureau_select" on public.droits_bureau;
create policy "droits_bureau_select"
  on public.droits_bureau for select
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or utilisateur_id = auth.uid()
  );

drop policy if exists "droits_bureau_write" on public.droits_bureau;
create policy "droits_bureau_write"
  on public.droits_bureau for all
  using (
    public.is_super_admin()
    or (
      public.auth_role() = 'responsable_bureau'
      and bureau_id = public.auth_bureau()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.auth_role() = 'responsable_bureau'
      and bureau_id = public.auth_bureau()
    )
  );

-- --- delegations : lecture rôles concernés ; écriture super + chef admin délégant ---
drop policy if exists "delegations_select" on public.delegations;
create policy "delegations_select"
  on public.delegations for select
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or delegant_id = auth.uid()
    or delegataire_id = auth.uid()
  );

drop policy if exists "delegations_insert" on public.delegations;
create policy "delegations_insert"
  on public.delegations for insert
  with check (
    public.is_super_admin()
    or (public.is_chef_admin() and delegant_id = auth.uid())
  );

drop policy if exists "delegations_update" on public.delegations;
create policy "delegations_update"
  on public.delegations for update
  using (
    public.is_super_admin()
    or (public.is_chef_admin() and delegant_id = auth.uid())
  )
  with check (
    public.is_super_admin()
    or (public.is_chef_admin() and delegant_id = auth.uid())
  );

-- --- fils_discussion / messages : bureau OU participant transversal OU super/chef ---
drop policy if exists "fils_discussion_select" on public.fils_discussion;
create policy "fils_discussion_select"
  on public.fils_discussion for select
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or public.can_access_bureau(bureau_id)
    or exists (
      select 1 from public.fil_participants fp
      where fp.fil_id = fils_discussion.id
        and fp.utilisateur_id = auth.uid()
    )
  );

drop policy if exists "fils_discussion_insert" on public.fils_discussion;
create policy "fils_discussion_insert"
  on public.fils_discussion for insert
  with check (
    cree_par = auth.uid()
    and (
      public.can_access_bureau(bureau_id)
      or bureau_id is null -- fil transversal, participation gérée via fil_participants
    )
  );

drop policy if exists "fil_participants_select" on public.fil_participants;
create policy "fil_participants_select"
  on public.fil_participants for select
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or utilisateur_id = auth.uid()
  );

drop policy if exists "fil_participants_write" on public.fil_participants;
create policy "fil_participants_write"
  on public.fil_participants for all
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or fil_id in (
      select id from public.fils_discussion where cree_par = auth.uid()
    )
  )
  with check (
    public.is_super_admin()
    or public.is_chef_admin()
    or fil_id in (
      select id from public.fils_discussion where cree_par = auth.uid()
    )
  );

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
         or exists (
           select 1 from public.fil_participants fp
           where fp.fil_id = f.id and fp.utilisateur_id = auth.uid()
         )
    )
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert"
  on public.messages for insert
  with check (auteur_id = auth.uid());

-- --- reunions : visibles si bureau / participant / super-chef ; modification organisateur ---
drop policy if exists "reunions_select" on public.reunions;
create policy "reunions_select"
  on public.reunions for select
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or public.can_access_bureau(bureau_id)
    or exists (
      select 1 from public.reunion_participants rp
      where rp.reunion_id = reunions.id
        and rp.utilisateur_id = auth.uid()
    )
  );

drop policy if exists "reunions_insert" on public.reunions;
create policy "reunions_insert"
  on public.reunions for insert
  with check (organise_par = auth.uid());

drop policy if exists "reunions_update_organizer" on public.reunions;
create policy "reunions_update_organizer"
  on public.reunions for update
  using (organise_par = auth.uid() or public.is_super_admin())
  with check (organise_par = auth.uid() or public.is_super_admin());

drop policy if exists "reunion_participants_select" on public.reunion_participants;
create policy "reunion_participants_select"
  on public.reunion_participants for select
  using (
    public.is_super_admin()
    or public.is_chef_admin()
    or utilisateur_id = auth.uid()
  );

drop policy if exists "reunion_participants_write" on public.reunion_participants;
create policy "reunion_participants_write"
  on public.reunion_participants for all
  using (
    public.is_super_admin()
    or reunion_id in (
      select id from public.reunions where organise_par = auth.uid()
    )
  )
  with check (
    public.is_super_admin()
    or reunion_id in (
      select id from public.reunions where organise_par = auth.uid()
    )
  );

-- --- journal_activite : lecture super/chef ; écriture automatique (voir triggers) ---
drop policy if exists "journal_activite_select" on public.journal_activite;
create policy "journal_activite_select"
  on public.journal_activite for select
  using (public.is_super_admin() or public.is_chef_admin());

drop policy if exists "journal_activite_insert_auto" on public.journal_activite;
create policy "journal_activite_insert_auto"
  on public.journal_activite for insert
  with check (utilisateur_id = auth.uid());

-- ============================================================
-- 9. TRIGGERS DE JOURNALISATION
-- ============================================================

create or replace function public.log_action()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.journal_activite (utilisateur_id, action, cible_table, cible_id)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_journal_dossiers on public.dossiers;
create trigger trg_journal_dossiers
  after insert or update or delete on public.dossiers
  for each row execute function public.log_action();

drop trigger if exists trg_journal_rapports on public.rapports;
create trigger trg_journal_rapports
  after insert or update or delete on public.rapports
  for each row execute function public.log_action();

drop trigger if exists trg_journal_personnel on public.personnel;
create trigger trg_journal_personnel
  after insert or update or delete on public.personnel
  for each row execute function public.log_action();

drop trigger if exists trg_journal_droits on public.droits_bureau;
create trigger trg_journal_droits
  after insert or update or delete on public.droits_bureau
  for each row execute function public.log_action();

drop trigger if exists trg_journal_delegations on public.delegations;
create trigger trg_journal_delegations
  after insert or update or delete on public.delegations
  for each row execute function public.log_action();

-- ============================================================
-- 10. DONNÉES INITIALES (seed) — 11 bureaux
-- ============================================================

insert into public.bureaux (nom) values
  ('Gestion Financière'),
  ('Gestion Matérielle'),
  ('Secrétariat'),
  ('Suivi-Évaluation'),
  ('Planification & Statistiques'),
  ('Correspondant Numérique'),
  ('Ressources Humaines'),
  ('Examens et Concours'),
  ('Bureau Genre'),
  ('Communication & Partenariats'),
  ('Enseignement Arabe')
on conflict do nothing;