-- ============================================================
-- IEF ADMIN — Extension du schéma personnel (migration 0005)
-- Ajoute les champs RH issus du fichier d'effectifs (mars 2026)
-- et des index d'unicité pour l'import (écoles par nom,
-- personnel par matricule).
-- ============================================================

alter table public.personnel
  add column if not exists matricule             text,
  add column if not exists sexe                  text check (sexe in ('M', 'F') or sexe is null),
  add column if not exists date_naissance        date,
  add column if not exists lieu_naissance        text,
  add column if not exists corps                 text,
  add column if not exists grade                 text,
  add column if not exists discipline            text,
  add column if not exists diplome_academique    text,
  add column if not exists diplome_professionnel text,
  add column if not exists anciennete_enseignement text,
  add column if not exists anciennete_poste      text,
  add column if not exists telephone             text,
  add column if not exists email                 text,
  add column if not exists n_cni                 text,
  add column if not exists sit_matrimoniale      text,
  add column if not exists nb_enfants            int,
  add column if not exists os_arrivee            text,
  add column if not exists motif_depart          text,
  add column if not exists depart_annee          text,
  add column if not exists source_feuille        text;

-- Unicité des écoles par nom (pour upsert école / rattachement personnel)
create unique index if not exists ecoles_nom_uniq
  on public.ecoles (nom);

-- Unicité du matricule (NULL autorisé : anciennes lignes seed, agents sans matricule)
create unique index if not exists personnel_matricule_uniq
  on public.personnel (matricule)
  where matricule is not null;

create index if not exists personnel_ecole_id_idx
  on public.personnel (ecole_id);

create index if not exists personnel_bureau_id_idx
  on public.personnel (bureau_id);