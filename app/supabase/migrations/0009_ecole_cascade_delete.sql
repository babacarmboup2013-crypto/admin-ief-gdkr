-- Supprime l'ancienne FK personnel→ecoles puis recrée avec ON DELETE CASCADE
ALTER TABLE personnel DROP CONSTRAINT IF EXISTS personnel_ecole_id_fkey;
ALTER TABLE personnel
  ADD CONSTRAINT personnel_ecole_id_fkey
  FOREIGN KEY (ecole_id) REFERENCES ecoles(id) ON DELETE CASCADE;
