-- ============================================================
-- 0022 — Pièce jointe sur les transmissions internes
-- ============================================================
-- La transmission ne déplace pas le courrier : elle doit donc porter
-- la référence du fichier joint pour que le bureau destinataire puisse
-- télécharger le document annexe depuis sa liste de transmissions.

alter table public.transmissions
  add column if not exists fichier_path text,
  add column if not exists fichier_nom text;

create index if not exists transmissions_fichier_idx
  on public.transmissions (fichier_path)
  where fichier_path is not null;

-- Les politiques RLS existantes (transmissions_read / insert / update)
-- couvrent déjà ces colonnes : aucune modification nécessaire.
