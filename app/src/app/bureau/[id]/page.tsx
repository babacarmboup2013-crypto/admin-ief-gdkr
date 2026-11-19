"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { BUREAUX, dossiersLabel, referentBureau } from "@/lib/data";
import { useRole } from "@/lib/role-context";
import { useRows } from "@/components/admin/use-rows";
import { StatusBadge } from "@/components/admin/status";
import { CourrierStats } from "@/components/admin/courrier-stats";
import { PERSONNEL_STATUTS, type DossierRow, type PersonnelRow, type RapportRow } from "@/lib/admin-types";
import { ArrowLeft, Users, FileText, BarChart3, Lock, UserRound } from "lucide-react";

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
  const bureau = BUREAUX.find((b) => b.id === bureauId);

  const { rows: personnel, loading: personnelLoading } = useRows<PersonnelRow>(
    async () => {
      if (!supabase) return [];
      const [primaryRes, extraRes] = await Promise.all([
        supabase
          .from("personnel")
          .select(PERSONNEL_SELECT)
          .eq("bureau_id", bureauId)
          .order("nom_complet", { ascending: true }),
        supabase
          .from("personnel_bureaux")
          .select("personnel_id")
          .eq("bureau_id", bureauId),
      ]);
      const primary = (primaryRes.data ?? []) as unknown as PersonnelRow[];
      const extraIds = (extraRes.data ?? [])
        .map((r) => (r as { personnel_id: number }).personnel_id)
        .filter((id) => !primary.some((p) => p.id === id));
      let extra: PersonnelRow[] = [];
      if (extraIds.length > 0) {
        const { data: extraData } = await supabase
          .from("personnel")
          .select(PERSONNEL_SELECT)
          .in("id", extraIds)
          .order("nom_complet", { ascending: true });
        extra = (extraData ?? []) as unknown as PersonnelRow[];
      }
      return [...primary, ...extra];
    },
    [bureauId]
  );

  const { rows: dossiers } = useRows<DossierRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("dossiers")
        .select("id,bureau_id,titre,statut,echeance,assigne_a,cree_par,created_at")
        .eq("bureau_id", bureauId)
        .order("created_at", { ascending: false });
      return error || !data ? [] : data;
    },
    [bureauId]
  );

  const { rows: rapports } = useRows<RapportRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("rapports")
        .select("id,bureau_id,titre,contenu,statut,soumis_par,valide_par,created_at")
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
  const referent = referentBureau(bureau.id);

  return (
    <div>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Retour au tableau de bord
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight text-navy">Bureau {bureau.id}</h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">{bureau.nom}</p>
          {referent && (
            <div className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[12px] text-primary">
              <UserRound className="size-3.5" />
              Assuré par
              <span className="font-semibold">{referent.nom}</span>
              <span className="text-ink-soft">— {referent.fonction}</span>
            </div>
          )}
        </div>
        {bureauId === 3 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/courriers"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[12.5px] font-medium text-primary transition-colors hover:bg-muted/40"
            >
              <FileText className="size-3.5" /> Courriers ordinaires
            </Link>
            <Link
              href="/courriers-confidentiels"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[12.5px] font-medium text-primary transition-colors hover:bg-muted/40"
            >
              <Lock className="size-3.5" /> Courriers confidentiels
            </Link>
          </div>
        )}
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
            <FileText className="size-3.5" /> {dossiersLabel(bureauId)}
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

      {bureauId === 3 && <CourrierStats bureauId={bureauId} />}

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

      {dossiers.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden mb-6">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="font-serif text-[15.5px] text-navy">
              {dossiersLabel(bureauId)} ({dossiers.length})
            </h2>
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
                {dossiers.map((d) => (
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
                {rapports.map((r) => (
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