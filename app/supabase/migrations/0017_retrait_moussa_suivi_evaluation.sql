-- Le bureau Suivi-Évaluation (id 4) n'est plus assuré que par BABACAR MBOUP.
-- Moussa Ndiaye conserve son rattachement au Secrétariat (bureau 3), déjà
-- présent dans personnel_bureaux ; son affectation principale y est basculée.
-- La contrainte personnel_affectation_unique interdit un bureau_id NULL sans école.

DELETE FROM personnel_bureaux
WHERE personnel_id = 3668 AND bureau_id = 4;

UPDATE personnel
SET bureau_id = 3
WHERE id = 3668 AND nom_complet = 'MOUSSA NDIAYE';

-- Le compte reste actif mais est rattaché au Secrétariat, sans accès au bureau 4.
UPDATE utilisateurs
SET bureau_id = 3
WHERE id = '00000000-0000-4000-8000-000000000015';
