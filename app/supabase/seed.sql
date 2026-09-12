-- ============================================================
-- IEF ADMIN — Seed (après la migration 0001_init.sql)
-- Crée des comptes de démonstration dans auth.users + public.utilisateurs,
-- puis des données fictives cohérentes avec la maquette.
--
-- Mot de passe de démo commun à tous les comptes : IefAdmin2026!
-- ============================================================

-- ---------- 1. UTILISATEURS (auth + profil) ----------
do $$
declare
  u record;
begin
  for u in
    select
      t.id::uuid       as id,
      t.email::text    as email,
      t.nom::text      as nom,
      t.role::text     as role,
      t.bureau_id::int as bureau_id,
      t.fonction::text as fonction
    from (values
    ('00000000-0000-4000-8000-000000000001', 'super@ief.local',     'Super Admin IEF',  'super_admin',       null, 'Administrateur'),
    ('00000000-0000-4000-8000-000000000002', 'ief@ief.local',        'Ibrahima Sow',     'chef_admin',        null, 'IEF'),
    ('00000000-0000-4000-8000-000000000003', 'secretaire@ief.local', 'Aminata Keita',    'secretaire_general', null, 'Adjoint Chef Admin'),
    ('00000000-0000-4000-8000-000000000004', 'moussa.barry@ief.local','Moussa Barry',    'inspecteur',         null, 'Inspecteur'),
    ('00000000-0000-4000-8000-000000000005', 'aicha.camara@ief.local','Aïcha Camara',    'inspecteur',         null, 'Inspecteur'),
    ('00000000-0000-4000-8000-000000000006', 'oumar.sylla@ief.local','Oumar Sylla',      'inspecteur',         null, 'Inspecteur'),
    ('00000000-0000-4000-8000-000000000007', 'nafi.toure@ief.local', 'Nafi Touré',       'responsable_bureau', '7', 'Responsable RH'),
    ('00000000-0000-4000-8000-000000000008', 'mariam.cisse@ief.local','Mariam Cissé',    'agent_bureau',        '8', 'Agent Examens'),
    ('00000000-0000-4000-8000-000000000009', 'hawa.diakite@ief.local','Hawa Diakité',    'agent_bureau',        '7', 'RH'),
    ('00000000-0000-4000-8000-00000000000a', 'ibrahima.konate@ief.local','Ibrahima Konaté','agent_bureau',       '7', 'Agent RH'),
    ('00000000-0000-4000-8000-00000000000b', 'awa.diallo@ief.local', 'Awa Diallo',       'agent_bureau',        '1', 'Comptable'),
    ('00000000-0000-4000-8000-00000000000c', 's.kane@ief.local',     'S. Kane',          'agent_bureau',        '2', 'Agent Matériel'),
    ('00000000-0000-4000-8000-00000000000d', 'f.bah@ief.local',      'F. Bah',           'agent_bureau',        '4', 'Chargé d''études'),
    ('00000000-0000-4000-8000-00000000000e', 'com.bur@ief.local',    'M. Ndiaye',        'agent_bureau',        '10', 'Chargé de communication')
  ) as t(id, email, nom, role, bureau_id, fonction)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user
    ) values (
      '00000000-0000-0000-0000-000000000000',
      u.id,
      'authenticated',
      'authenticated',
      u.email,
      crypt('IefAdmin2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('nom_complet', u.nom, 'fonction', u.fonction),
      now(), now(), false
    )
    on conflict (id) do nothing;

    insert into public.utilisateurs (id, nom_complet, email, role, bureau_id, fonction, actif)
    values (u.id, u.nom, u.email, u.role, u.bureau_id, u.fonction, true)
    on conflict (id) do update
      set nom_complet = excluded.nom_complet, email = excluded.email, role = excluded.role,
          bureau_id = excluded.bureau_id, fonction = excluded.fonction;
  end loop;
end
$$;

-- ---------- 2. LIAISON INSPECTEURS <-> BUREAUX ----------
insert into public.inspecteurs_bureaux (inspecteur_id, bureau_id) values
  ('00000000-0000-4000-8000-000000000004', 1),
  ('00000000-0000-4000-8000-000000000004', 8),
  ('00000000-0000-4000-8000-000000000004', 9),
  ('00000000-0000-4000-8000-000000000005', 2),
  ('00000000-0000-4000-8000-000000000005', 4),
  ('00000000-0000-4000-8000-000000000005', 10),
  ('00000000-0000-4000-8000-000000000006', 3),
  ('00000000-0000-4000-8000-000000000006', 5),
  ('00000000-0000-4000-8000-000000000006', 6)
on conflict do nothing;

-- ---------- 3. DOSSIERS ----------
insert into public.dossiers (bureau_id, titre, statut, echeance, assigne_a, cree_par) values
  (7, 'Recrutement — poste comptable',              'en_cours',  null,          null, '00000000-0000-4000-8000-000000000007'),
  (7, 'Renouvellement contrats saisonniers',        'a_traiter', null,          '00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000007'),
  (7, 'Dossier disciplinaire #12',                  'en_cours',  null,          null, '00000000-0000-4000-8000-000000000007'),
  (7, 'Formation continue — module Q3',             'cloture',   null,          null, '00000000-0000-4000-8000-000000000007'),
  (8, 'Candidats session Octobre — vérification pièces', 'en_cours', date '2026-09-18',
        '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000007'),
  (8, 'Mise à jour liste des jurys',                'a_faire',   date '2026-09-22',
        '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000008'),
  (8, 'Archivage session Juin',                     'termine',   null,
        '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000008');

-- ---------- 4. RAPPORTS ----------
insert into public.rapports (bureau_id, titre, contenu, statut, soumis_par, valide_par) values
  (1,  'Bilan trimestriel Q3',                'Chiffres consolidés du 3e trimestre.', 'soumis',
        '00000000-0000-4000-8000-00000000000b', null),
  (8,  'Session concours — clôture',          'Clôture de la session de concours.',   'soumis',
        '00000000-0000-4000-8000-000000000008', null),
  (4,  'Rapport de mission — zone Nord',      'Mission de suivi en zone Nord.',       'en_revision',
        '00000000-0000-4000-8000-00000000000d', null),
  (2,  'Inventaire matériel annuel',          'Inventaire des matériels.',            'valide',
        '00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-000000000002'),
  (10, 'Bilan communication trimestriel',     'Bilan des actions de communication.',  'valide',
        '00000000-0000-4000-8000-00000000000e', '00000000-0000-4000-8000-000000000002');

-- ---------- 5. ÉCOLES ----------
insert into public.ecoles (nom, cycle, localisation, effectif_eleves) values
  ('École primaire de Sabalibougou',  'élémentaire',   'Sabalibougou',    320),
  ('Collège de Kalaban-Coro',         'collège',       'Kalaban-Coro',    540),
  ('Préscolaire Niamakoro',           'préscolaire',   'Niamakoro',       140),
  ('Daara Moderne Centre',            'daara_moderne', 'Centre-ville',    210),
  ('EFA Régional',                    'efa',           'Région Nord',     380);

-- ---------- 6. PERSONNEL (bureaux IEF + écoles) ----------
insert into public.personnel (bureau_id, ecole_id, nom_complet, fonction, statut) values
  (7, null, 'Nafi Touré',        'RH',                        'actif'),
  (7, null, 'Hawa Diakité',      'RH',                        'actif'),
  (1, null, 'Awa Diallo',        'Comptable',                 'actif'),
  (8, null, 'Mariam Cissé',      'Agent Examens',             'actif'),
  (null, 1, 'I. Traoré',         'Directeur d''école',        'actif'),
  (null, 1, 'A. Kanté',          'Enseignante',               'actif'),
  (null, 2, 'M. Sangaré',        'Directeur',                 'actif'),
  (null, 3, 'B. Coulibaly',      'Éducatrice préscolaire',    'actif'),
  (null, 4, 'D. Touré',          'Directeur Daara',           'actif'),
  (null, 5, 'S. Doumbia',        'Enseignant EFA',            'actif');

-- ---------- 7. DROITS GRANULAIRES ----------
insert into public.droits_bureau (bureau_id, utilisateur_id, module, droit) values
  (8, '00000000-0000-4000-8000-000000000008', 'dossiers', 'lecture'),
  (8, '00000000-0000-4000-8000-000000000008', 'dossiers', 'saisie'),
  (8, '00000000-0000-4000-8000-000000000008', 'rapports', 'lecture'),
  (8, '00000000-0000-4000-8000-000000000008', 'rapports', 'saisie'),
  (7, '00000000-0000-4000-8000-00000000000a', 'dossiers', 'lecture'),
  (7, '00000000-0000-4000-8000-000000000007', 'dossiers', 'validation'),
  (7, '00000000-0000-4000-8000-000000000007', 'rapports', 'validation');

-- ---------- 8. DÉLÉGATION (Chef Admin -> Secrétaire Général) ----------
insert into public.delegations
  (delegant_id, delegataire_id, date_debut, date_fin, motif, active)
values
  ('00000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000003',
   date '2026-09-05', date '2026-09-19',
   'Absence du Chef Admin', true);

-- ---------- 9. FILS DE DISCUSSION + MESSAGES ----------
insert into public.fils_discussion (bureau_id, titre, cree_par) values
  (8,    'Session concours Octobre',      '00000000-0000-4000-8000-000000000008'),
  (1,    'Budget Q4',                     '00000000-0000-4000-8000-00000000000b'),
  (null, 'Coordination RH ↔ Examens',     '00000000-0000-4000-8000-000000000007');

insert into public.fil_participants (fil_id, utilisateur_id) values
  (3, '00000000-0000-4000-8000-000000000007'),
  (3, '00000000-0000-4000-8000-000000000008'),
  (3, '00000000-0000-4000-8000-000000000009');

insert into public.messages (fil_id, auteur_id, contenu, created_at) values
  (1, '00000000-0000-4000-8000-000000000008', 'On a validé la liste des jurys pour la session d''octobre.', now() - interval '1 hour'),
  (1, '00000000-0000-4000-8000-000000000004', 'Parfait, il reste combien de candidats à vérifier ?',      now() - interval '50 minutes'),
  (1, '00000000-0000-4000-8000-000000000008', '23 dossiers restants, je les termine demain matin.',        now() - interval '40 minutes'),
  (2, '00000000-0000-4000-8000-00000000000b', 'Le bilan trimestriel est en retard de 2 jours, on peut décaler la réunion ?', now() - interval '3 hours'),
  (3, '00000000-0000-4000-8000-00000000000a', 'On aura besoin de 3 surveillants supplémentaires pour la session.', now() - interval '2 hours'),
  (3, '00000000-0000-4000-8000-000000000007', 'Je regarde les disponibilités et je reviens vers vous demain.', now() - interval '90 minutes');

-- ---------- 10. RÉUNIONS + PARTICIPANTS ----------
insert into public.reunions
  (titre, bureau_id, organise_par, date_heure, ordre_du_jour, compte_rendu, statut)
values
  ('Coordination sessions Octobre', 8, '00000000-0000-4000-8000-000000000004',
   now() - interval '1 hour', 'Préparation de la session.', null, 'en_cours'),
  ('Bilan mensuel RH', 7, '00000000-0000-4000-8000-000000000007',
   date '2026-09-16' + time '09:00', 'Effectifs, vacances, recrutements.', null, 'planifiee'),
  ('Revue budgétaire Q4', 1, '00000000-0000-4000-8000-00000000000b',
   date '2026-09-18' + time '14:30', 'Budget et dépenses du trimestre.', null, 'planifiee'),
  ('Point hebdomadaire Communication', 10, '00000000-0000-4000-8000-00000000000e',
   date '2026-09-09' + time '10:00', 'Actions en cours.',
   'Compte-rendu rédigé et diffusé.', 'terminee');

insert into public.reunion_participants (reunion_id, utilisateur_id, statut_presence) values
  (1, '00000000-0000-4000-8000-000000000004', 'present'),
  (1, '00000000-0000-4000-8000-000000000008', 'present'),
  (1, '00000000-0000-4000-8000-000000000007', 'present'),
  (1, '00000000-0000-4000-8000-00000000000a', 'invite'),
  (1, '00000000-0000-4000-8000-000000000009', 'invite'),
  (2, '00000000-0000-4000-8000-000000000007', 'confirme'),
  (2, '00000000-0000-4000-8000-000000000009', 'confirme'),
  (3, '00000000-0000-4000-8000-00000000000b', 'confirme'),
  (3, '00000000-0000-4000-8000-000000000002', 'invite');

-- ============================================================
-- 11. ADAPTATION GOTRUE (auth.users / auth.identities)
--     Requis pour que la connexion email fonctionne après un
--     insert SQL direct dans auth.users (voir correctifs 0003).
-- ============================================================

-- 11a. Colonnes de jetons NULL -> '' (évite "Database error querying schema")
update auth.users set
  confirmation_token = '',
  recovery_token = '',
  email_change = '',
  email_change_token_new = '',
  email_change_token_current = ''
where confirmation_token is null or recovery_token is null or email_change is null
   or email_change_token_new is null or email_change_token_current is null;

-- 11b. Lignes auth.identities manquantes (provider 'email')
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