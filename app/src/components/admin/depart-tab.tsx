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
  const [search, setSearch] = useState<Record<string, string>>({});
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
    const q = (k: string) => (search[k] ?? "").toLowerCase().trim();
    const hasQ = Object.values(search).some((v) => v.trim());
    if (!hasQ) return rows;
    return rows.filter((r) => {
      if (q("nom") && !r.nom_complet?.toLowerCase().includes(q("nom"))) return false;
      if (q("matricule") && !r.matricule?.toLowerCase().includes(q("matricule"))) return false;
      if (q("motif") && !r.motif_depart?.toLowerCase().includes(q("motif"))) return false;
      return true;
    });
  }, [rows, search]);

  return (
    <>
      <SearchBar
        fields={[
          { key: "nom", label: "Nom", placeholder: "Nom complet..." },
          { key: "matricule", label: "Matricule", placeholder: "N° matricule..." },
          { key: "motif", label: "Motif", placeholder: "Motif départ..." },
        ]}
        values={search}
        onChange={(k, v) => setSearch((prev) => ({ ...prev, [k]: v }))}
      />
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
