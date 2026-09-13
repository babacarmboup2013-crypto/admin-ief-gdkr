"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { useRows } from "@/components/admin/use-rows";
import { StatusBadge } from "@/components/admin/status";
import { CYCLE_LABELS, PERSONNEL_STATUTS, type PersonnelRow } from "@/lib/admin-types";
import { ArrowLeft, Users } from "lucide-react";

const PERSONNEL_SELECT = "id,bureau_id,ecole_id,nom_complet,fonction,date_entree,statut,matricule,sexe,telephone,email,corps,grade,source_feuille";

interface EcoleInfo {
  id: number;
  nom: string;
  cycle: string;
  localisation: string | null;
  effectif_eleves: number | null;
}

export default function EcolePage() {
  const params = useParams();
  const router = useRouter();
  const ecoleId = Number(params.id);
  const { role, profile } = useRole();

  const [ecole, setEcole] = useState<EcoleInfo | null>(null);
  const [loadingEcole, setLoadingEcole] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("ecoles")
      .select("id, nom, cycle, localisation, effectif_eleves")
      .eq("id", ecoleId)
      .maybeSingle()
      .then(({ data, error }) => {
        setEcole(error || !data ? null : (data as EcoleInfo));
        setLoadingEcole(false);
      });
  }, [ecoleId]);

  const { rows: personnel, loading: personnelLoading } = useRows<PersonnelRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("personnel")
        .select(PERSONNEL_SELECT)
        .eq("ecole_id", ecoleId)
        .order("nom_complet", { ascending: true });
      return error || !data ? [] : (data as unknown as PersonnelRow[]);
    },
    [ecoleId]
  );

  if (loadingEcole) {
    return <div className="p-8 text-center text-ink-soft">Chargement…</div>;
  }

  if (!ecole) {
    return (
      <div className="p-8 text-center text-ink-soft">
        École inconnue. <Link href="/" className="text-primary underline">Retour</Link>
      </div>
    );
  }

  const actifs = personnel.filter((p) => p.statut === "actif");
  const inactifs = personnel.filter((p) => p.statut !== "actif");

  return (
    <div>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Retour au tableau de bord
      </Link>

      <div className="mb-6">
        <h1 className="text-[26px] leading-tight text-navy">{ecole.nom}</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          {CYCLE_LABELS[ecole.cycle] ?? ecole.cycle}
          {ecole.localisation ? ` — ${ecole.localisation}` : ""}
          {ecole.effectif_eleves != null ? ` — Effectif élèves : ${ecole.effectif_eleves}` : ""}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-[12px] text-ink-soft mb-1">
            <Users className="size-3.5" /> Personnel affecté
          </div>
          <div className="text-[22px] font-semibold text-navy">{actifs.length} <span className="text-[13px] font-normal text-ink-soft">actif(s)</span></div>
          {inactifs.length > 0 && <div className="text-[12px] text-ink-soft mt-0.5">{inactifs.length} inactif(s)</div>}
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-[12px] text-ink-soft mb-1">
            <Users className="size-3.5" /> Effectif élèves
          </div>
          <div className="text-[22px] font-semibold text-navy">{ecole.effectif_eleves ?? "—"}</div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="font-serif text-[15.5px] text-navy">Personnel affecté ({personnel.length})</h2>
        </div>
        {personnelLoading ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-soft">Chargement…</div>
        ) : personnel.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-soft">Aucun agent affecté à cette école.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Nom complet</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Fonction</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Matricule</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Téléphone</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Statut</th>
                </tr>
              </thead>
              <tbody>
                {personnel.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-2.5 font-medium text-ink"><Link href={`/agent/${p.id}`} className="text-primary hover:underline">{p.nom_complet}</Link></td>
                    <td className="px-5 py-2.5 text-ink-soft">{p.fonction ?? "—"}</td>
                    <td className="px-5 py-2.5 font-mono text-[12px] text-ink-soft">{p.matricule ?? "—"}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{p.telephone ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      <StatusBadge
                        label={(PERSONNEL_STATUTS[p.statut] ?? { label: p.statut }).label}
                        tone={(PERSONNEL_STATUTS[p.statut] ?? { tone: "attente" as const }).tone}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
