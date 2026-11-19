"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { useBureauxRef, useUsersRef } from "@/components/admin/use-refs";
import { StatusBadge } from "@/components/admin/status";
import { sbThrow } from "@/components/admin/sb";
import { Button } from "@/components/ui/button";
import {
  TRANSMISSION_STATUTS,
  fmtDate,
  type TransmissionRow,
} from "@/lib/admin-types";
import { ArrowRightLeft, Check, CheckCheck, X } from "lucide-react";

type Onglet = "recues" | "envoyees" | "toutes";

export default function TransmissionsPage() {
  const { role, profile, uid } = useRole();
  const bureaux = useBureauxRef();
  const users = useUsersRef();
  const [rows, setRows] = useState<TransmissionRow[]>([]);
  const [loading, setLoading] = useState(supabase != null);
  const [erreur, setErreur] = useState<string | null>(
    supabase ? null : "Supabase n'est pas configuré (voir .env.local)."
  );
  const [onglet, setOnglet] = useState<Onglet>("recues");
  const [tick, setTick] = useState(0);

  const peutToutVoir = role === "super" || role === "chef";

  useEffect(() => {
    if (!supabase) return;
    let actif = true;
    supabase
      .from("transmissions")
      .select("*")
      .order("date_transmission", { ascending: false })
      .then(({ data, error }) => {
        if (!actif) return;
        if (error) {
          setErreur(error.message);
          setRows([]);
        } else {
          setErreur(null);
          setRows((data ?? []) as TransmissionRow[]);
        }
        setLoading(false);
      });
    return () => {
      actif = false;
    };
  }, [tick]);

  const affichees = useMemo(() => {
    const perimeter = peutToutVoir
      ? rows
      : rows.filter(
          (r) =>
            r.bureau_source_id === profile.bureauId ||
            r.bureau_destinataire_id === profile.bureauId
        );
    if (onglet === "toutes") return perimeter;
    if (onglet === "recues")
      return perimeter.filter((r) => r.bureau_destinataire_id === profile.bureauId);
    return perimeter.filter((r) => r.bureau_source_id === profile.bureauId);
  }, [rows, onglet, peutToutVoir, profile.bureauId]);

  function nomBureau(id: number | null) {
    if (id == null) return "—";
    return bureaux.rows.find((b) => b.id === id)?.nom ?? String(id);
  }

  function nomUser(id: string | null) {
    if (!id) return "—";
    return users.rows.find((u) => u.id === id)?.nom_complet ?? "—";
  }

  async function changerStatut(row: TransmissionRow, statut: string) {
    if (!supabase) return;
    sbThrow(
      (
        await supabase
          .from("transmissions")
          .update({
            statut,
            date_reponse: new Date().toISOString(),
            traite_par: uid,
          })
          .eq("id", row.id)
      ).error
    );
    setTick((t) => t + 1);
  }

  const onglets: { id: Onglet; label: string }[] = [
    { id: "recues", label: "Reçues" },
    { id: "envoyees", label: "Envoyées" },
    ...(peutToutVoir ? [{ id: "toutes" as Onglet, label: "Toutes" }] : []),
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight text-navy">Transmissions internes</h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Courriers et dossiers transmis entre bureaux — avec suivi et accusé de réception.
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {onglets.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOnglet(o.id)}
              className={
                "rounded px-3 py-1 text-[12px] font-medium transition-colors " +
                (onglet === o.id
                  ? "bg-primary/10 text-primary"
                  : "text-ink-soft hover:bg-muted/40")
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {erreur ? (
        <div className="mb-5 rounded-lg border border-red/30 bg-red-soft px-5 py-4 text-[13px] text-red">
          <p className="font-medium">Impossible de charger les transmissions.</p>
          <p className="mt-1">{erreur}</p>
          <p className="mt-2 text-[12px]">
            Si la table n&apos;existe pas encore, exécutez la migration{" "}
            <code className="font-mono">supabase/migrations/0019_transmissions.sql</code>{" "}
            dans l&apos;éditeur SQL Supabase.
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="px-5 py-10 text-center text-[13px] text-ink-soft">
            Chargement…
          </div>
        ) : affichees.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-ink-soft">
            Aucune transmission {onglet === "recues" ? "reçue" : onglet === "envoyees" ? "envoyée" : "enregistrée"}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Type</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Objet</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">De</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Vers</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Note</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Statut</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Date</th>
                  <th className="px-4 py-2.5 text-right font-medium text-ink-soft">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affichees.map((r) => {
                  const s = TRANSMISSION_STATUTS[r.statut] ?? {
                    label: r.statut,
                    tone: "cours" as const,
                  };
                  const peutRepondre =
                    r.bureau_destinataire_id === profile.bureauId || peutToutVoir;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-ink">
                          <ArrowRightLeft className="size-3.5 text-primary" />
                          {r.type_objet === "courrier" ? "Courrier" : "Dossier"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-ink">{r.objet_titre ?? `#${r.objet_id}`}</div>
                        {r.objet_ref ? (
                          <div className="font-mono text-[11px] text-ink-soft">{r.objet_ref}</div>
                        ) : null}
                        <div className="text-[11px] text-ink-soft">
                          Transmis par {nomUser(r.expediteur_id)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">{nomBureau(r.bureau_source_id)}</td>
                      <td className="px-4 py-2.5 font-medium text-ink">
                        {nomBureau(r.bureau_destinataire_id)}
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">{r.note ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge label={s.label} tone={s.tone} />
                        {r.date_reponse ? (
                          <div className="mt-0.5 text-[10.5px] text-ink-soft">
                            Répondu le {fmtDate(r.date_reponse)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">{fmtDate(r.date_transmission)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          {peutRepondre && r.statut === "en_attente" ? (
                            <>
                              <Button
                                variant="outline"
                                size="icon-sm"
                                title="Accepter"
                                onClick={() => changerStatut(r, "accepte")}
                              >
                                <Check />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon-sm"
                                title="Refuser"
                                onClick={() => changerStatut(r, "refuse")}
                              >
                                <X />
                              </Button>
                            </>
                          ) : null}
                          {peutRepondre && r.statut === "accepte" ? (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              title="Marquer comme traitée"
                              onClick={() => changerStatut(r, "traite")}
                            >
                              <CheckCheck />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-[11.5px] text-ink-soft">
        Une transmission ne déplace pas l&apos;objet : le courrier ou le dossier reste
        accessible au bureau d&apos;origine et au bureau destinataire.
      </p>
    </div>
  );
}
