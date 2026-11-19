-- Moussa Ndiaye quitte le Secrétariat et remplace Mor Diabel Mbaye
-- comme planificateur du bureau 5 (Planification & Statistiques).

UPDATE personnel
SET bureau_id = 5, fonction = 'PLANIFICATEUR'
WHERE id = 3668 AND nom_complet = 'MOUSSA NDIAYE';

DELETE FROM personnel_bureaux WHERE personnel_id = 3668;
INSERT INTO personnel_bureaux (personnel_id, bureau_id)
VALUES (3668, 5)
ON CONFLICT (personnel_id, bureau_id) DO NOTHING;

UPDATE utilisateurs
SET bureau_id = 5, fonction = 'PLANIFICATEUR', role = 'responsable_bureau'
WHERE id = '00000000-0000-4000-8000-000000000015';

-- Mor Diabel Mbaye est parti à la retraite : transfert vers les archives.
INSERT INTO personnel_archive
SELECT * FROM personnel WHERE id = 3660
ON CONFLICT (id) DO NOTHING;

UPDATE personnel_archive
SET statut = 'inactif', motif_depart = 'Retraite', depart_annee = '2026'
WHERE id = 3660;

DELETE FROM personnel_bureaux WHERE personnel_id = 3660;
DELETE FROM personnel WHERE id = 3660;

-- Le compte est désactivé (conservé pour l'historique).
UPDATE utilisateurs
SET actif = false
WHERE id = '00000000-0000-4000-8000-000000000007';
