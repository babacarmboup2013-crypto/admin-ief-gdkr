"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { type PersonnelRow } from "@/lib/admin-types";
import { useRows } from "./use-rows";
import { AdminTable } from "./admin-table";
import Link from "next/link";
import { SearchBar } from "./search-bar";

const SELECT = "id,bureau_id,ecole_id,nom_complet,fonction,date_entree,statut,matricule,sexe,telephone,corps,grade,source_feuille,motif_depart,depart_annee";

export function DepartTab() {
  const [search, setSearch] = useState("");
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

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.nom_complet?.toLowerCase().includes(q) ||
      r.matricule?.toLowerCase().includes(q) ||
      r.fonction?.toLowerCase().includes(q) ||
      r.motif_depart?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <>
      <SearchBar value={search} onChange={setSearch} placeholder="Rechercher par nom, matricule, fonction, motif..." />
      <AdminTable
        title="Personnel départ / muté"
        subtitle={`${filteredRows.length} agent(s) muté(s) sur ${rows.length}.`}
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
        rows={filteredRows}
        keyOf={(r) => r.id}
        loading={loading}
        canAdd={false}
        canEdit={false}
        canDelete={false}
        empty="Aucun agent départ/muté."
      />
    </>
  );
}
