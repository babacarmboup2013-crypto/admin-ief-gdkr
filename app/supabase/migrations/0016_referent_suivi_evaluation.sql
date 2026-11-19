-- Le bureau Suivi-Évaluation (id 4) est assuré par BABACAR MBOUP,
-- qui exerce également la fonction de Correspondant Numérique (bureau 6).
-- L'affectation principale devient le bureau 4 ; le rattachement secondaire
-- au bureau 6 est conservé dans personnel_bureaux.

UPDATE personnel
SET bureau_id = 4
WHERE id = 3669 AND nom_complet = 'BABACAR MBOUP';

INSERT INTO personnel_bureaux (personnel_id, bureau_id)
VALUES (3669, 4), (3669, 6)
ON CONFLICT (personnel_id, bureau_id) DO NOTHING;
