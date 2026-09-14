CREATE TABLE IF NOT EXISTS personnel_bureaux (
  personnel_id INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
  bureau_id    INTEGER NOT NULL REFERENCES bureaux(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (personnel_id, bureau_id)
);

ALTER TABLE personnel_bureaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY read_auth ON personnel_bureaux FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY insert_admin ON personnel_bureaux FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND role IN ('super_admin','chef_admin')));
CREATE POLICY delete_admin ON personnel_bureaux FOR DELETE USING (EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND role IN ('super_admin','chef_admin')));
