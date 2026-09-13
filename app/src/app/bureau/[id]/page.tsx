"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { BUREAUX } from "@/lib/data";
import { useRole } from "@/lib/role-context";
import { useRows } from "@/components/admin/use-rows";
import { useBureauxRef, useEcolesRef } from "@/components/admin/use-refs";
import { StatusBadge } from "@/components/admin/status";
import { PERSONNEL_STATUTS, type PersonnelRow } from "@/lib/admin-types";
import { ArrowLeft, Users, FileText, BarChart3 } from "lucide-react";

const PERSONNEL_SELECT = "id,bureau_id,ecole_id,nom_complet,fonction,date_entree,statut,matricule,sexe,telephone,email,corps,grade,source_feuille";

function canAccessBureau(role: string, profileBureauId: number | null, targetId: number): boolean {
  if (role === "super" || role === "chef") return true;
  return profileBureauId === targetId;
}

export default function BureauPage() {
  const params = useParams();
  const router = useRouter();
  const bureauId = Number(params.id);
  const { role, profile } = useRole();
  const bureaux = useBureauxRef();
  const ecoles = useEcolesRef();
  const bureau = BUREAUX.find((b) => b.id === bureauId);

  const { rows: personnel, loading: personnelLoading } = useRows<PersonnelRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("personnel")
        .select(PERSONNEL_SELECT)
        .eq("bureau_id", bureauId)
        .order("nom_complet", { ascending: true });
      return error || !data ? [] : (data as unknown as PersonnelRow[]);
    },
    [bureauId]
  );

  const { rows: dossiers, loading: dossiersLoading } = useRows<any>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("dossiers")
        .select("id,titre,statut,echeance,assigne_a,cree_par,created_at")
        .eq("bureau_id", bureauId)
        .order("created_at", { ascending: false });
      return error || !data ? [] : data;
    },
    [bureauId]
  );

  const { rows: rapports, loading: rapportsLoading } = useRows<any>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("rapports")
        .select("id,titre,statut,soumis_par,valide_par,created_at")
        .eq("bureau_id", bureauId)
        .order("created_at", { ascending: false });
      return error || !data ? [] : data;
    },
    [bureauId]
  );

  if (!bureau) {
    return (
      <div className="p-8 text-center text-ink-soft">
        Bureau inconnu. <Link href="/" className="text-primary underline">Retour</Link>
      </div>
    );
  }

  if (!canAccessBureau(role, profile.bureauId, bureauId)) {
    router.replace(`/bureau/${profile.bureauId ?? 1}`);
    return null;
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
        <h1 className="text-[26px] leading-tight text-navy">Bureau {bureau.id}</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">{bureau.nom}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-[12px] text-ink-soft mb-1">
            <Users className="size-3.5" /> Agents du bureau
          </div>
          <div className="text-[22px] font-semibold text-navy">{actifs.length} <span className="text-[13px] font-normal text-ink-soft">actifs</span></div>
          {inactifs.length > 0 && <div className="text-[12px] text-ink-soft mt-0.5">{inactifs.length} inactif(s)</div>}
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-[12px] text-ink-soft mb-1">
            <FileText className="size-3.5" /> Dossiers
          </div>
          <div className="text-[22px] font-semibold text-navy">{dossiers.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-[12px] text-ink-soft mb-1">
            <BarChart3 className="size-3.5" /> Rapports
          </div>
          <div className="text-[22px] font-semibold text-navy">{rapports.length}</div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden mb-6">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="font-serif text-[15.5px] text-navy">Personnel du bureau ({personnel.length})</h2>
        </div>
        {personnelLoading ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-soft">Chargement…</div>
        ) : personnel.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-soft">Aucun agent affecté à ce bureau.</div>
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
                    <td className="px-5 py-2.5 font-medium text-ink">{p.nom_complet}</td>
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

      {dossiers.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden mb-6">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="font-serif text-[15.5px] text-navy">Dossiers ({dossiers.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Titre</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Statut</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Échéance</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map((d: any) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-2.5 font-medium text-ink">{d.titre}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{d.statut}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{d.echeance ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rapports.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="font-serif text-[15.5px] text-navy">Rapports ({rapports.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Titre</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Statut</th>
                </tr>
              </thead>
              <tbody>
                {rapports.map((r: any) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-2.5 font-medium text-ink">{r.titre}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{r.statut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}