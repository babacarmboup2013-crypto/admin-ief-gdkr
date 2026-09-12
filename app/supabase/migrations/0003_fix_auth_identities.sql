-- ============================================================
-- IEF ADMIN — Correctif 0003 : auth.identities pour la connexion
-- ------------------------------------------------------------
-- Le seed a rempli auth.users sans les lignes auth.identities
-- correspondantes (attendues par GoTrue pour la connexion email).
-- Idempotent : ne crée que les lignes manquantes pour le provider 'email'.
-- ============================================================

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select
  u.id,
  u.id,
  jsonb_build_object('sub', u.id, 'email', u.email),
  'email',
  u.email,
  u.last_sign_in_at,
  u.created_at,
  u.updated_at
from auth.users u
where not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
);