"use client";

import { supabase } from "@/lib/supabase/client";
import { PERSONNEL_STATUTS, type PersonnelRow } from "@/lib/admin-types";
import { useRows } from "./use-rows";
import { AdminTable } from "./admin-table";
import { StatusBadge } from "./status";
import Link from "next/link";

const SELECT = "id,bureau_id,ecole_id,nom_complet,fonction,date_entree,statut,matricule,sexe,telephone,corps,grade,source_feuille,motif_depart,depart_annee";

export function DepartTab() {
  const { rows, loading } = useRows<PersonnelRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("personnel_archive")
        .select(SELECT)
        .order("nom_complet", { ascending: true });
      return error || !data ? [] : (data as unknown as PersonnelRow[]);
    },
    []
  );

  return (
    <AdminTable
      title="Personnel départ / muté"
      subtitle={`${rows.length} agent(s) ne faisant plus partie du personnel actif de l'IEF.`}
      columns={[
        {
          header: "Nom complet",
          cell: (r) => (
            <Link href={`/agent/${r.id}`} className="font-medium text-primary hover:underline">
              {r.nom_complet}
            </Link>
          ),
        },
        { header: "Fonction", cell: (r) => <span className="text-ink-soft">{r.fonction ?? "—"}</span> },
        { header: "Matricule", cell: (r) => <span className="font-mono text-[12px] text-ink-soft">{r.matricule ?? "—"}</span> },
        { header: "Motif départ", cell: (r) => <span className="text-ink-soft">{r.motif_depart ?? "—"}</span> },
        { header: "Année(s)", cell: (r) => <span className="text-ink-soft">{r.depart_annee ?? "—"}</span> },
        { header: "Source", cell: (r) => <span className="text-ink-soft">{r.source_feuille ?? "—"}</span> },
      ]}
      rows={rows}
      keyOf={(r) => r.id}
      loading={loading}
      canAdd={false}
      canEdit={false}
      canDelete={false}
      empty="Aucun agent départ/muté."
    />
  );
}
