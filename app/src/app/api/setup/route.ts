import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const sql = `
    CREATE TABLE IF NOT EXISTS personnel_bureaux (
      personnel_id INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
      bureau_id INTEGER NOT NULL REFERENCES bureaux(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (personnel_id, bureau_id)
    );
    ALTER TABLE personnel_bureaux ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personnel_bureaux' AND policyname = 'pb_read') THEN
        CREATE POLICY pb_read ON personnel_bureaux FOR SELECT USING (auth.role() = 'authenticated');
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personnel_bureaux' AND policyname = 'pb_insert') THEN
        CREATE POLICY pb_insert ON personnel_bureaux FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND role IN ('super_admin','chef_admin')));
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personnel_bureaux' AND policyname = 'pb_delete') THEN
        CREATE POLICY pb_delete ON personnel_bureaux FOR DELETE USING (EXISTS (SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND role IN ('super_admin','chef_admin')));
      END IF;
    END $$;
  `;

  const { error } = await supabase.rpc("exec_sql" as any, { query: sql } as any);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
