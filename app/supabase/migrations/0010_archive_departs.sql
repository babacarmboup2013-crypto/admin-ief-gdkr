-- Table d'archive pour les agents mutés/parts (hors personnel actif IEF)
CREATE TABLE IF NOT EXISTS personnel_archive (
  LIKE personnel INCLUDING ALL
);

-- Copier les inactifs dans l'archive
INSERT INTO personnel_archive
SELECT * FROM personnel WHERE statut = 'inactif';

-- Supprimer les inactifs de la table active
DELETE FROM personnel WHERE statut = 'inactif';

-- Vérification
SELECT 'archive' AS src, count(*) FROM personnel_archive
UNION ALL
SELECT 'actif', count(*) FROM personnel;
