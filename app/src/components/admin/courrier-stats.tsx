"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { BarChart3, CalendarDays } from "lucide-react";

type Granularite = "jour" | "semaine" | "mois";

type LigneCourrier = {
  date_courrier: string | null;
  nature_ordinaire: string | null;
  nature_confidentielle: string | null;
  transmission_interne: string[] | null;
};

type StatPeriode = {
  cle: string;
  libelle: string;
  recus: number;
  traites: number;
  instance: number;
  total: number;
};

const ARRIVEES = ["arriv__ordinaire", "arriv_e_confidentiel"];
const DEPARTS = ["d_part_ordinaire", "d_part_confidentiel"];

function natureDu(row: LigneCourrier): string | null {
  return row.nature_ordinaire ?? row.nature_confidentielle;
}

function libelleJour(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Semaine ISO (lundi = premier jour). */
function semaineISO(date: string): { cle: string; libelle: string } {
  const d = new Date(`${date}T00:00:00`);
  const cible = new Date(d.valueOf());
  const decalage = (d.getDay() + 6) % 7;
  cible.setDate(cible.getDate() - decalage + 3);
  const premierJeudi = new Date(cible.getFullYear(), 0, 4);
  const semaine =
    1 +
    Math.round(
      (cible.getTime() - premierJeudi.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
  return {
    cle: `${cible.getFullYear()}-S${String(semaine).padStart(2, "0")}`,
    libelle: `S${String(semaine).padStart(2, "0")} ${cible.getFullYear()}`,
  };
}

function mois(date: string): { cle: string; libelle: string } {
  const d = new Date(`${date}T00:00:00`);
  return {
    cle: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    libelle: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
  };
}

function periodeDe(date: string | null, granularite: Granularite) {
  if (!date) return { cle: "sans-date", libelle: "Sans date" };
  if (granularite === "jour") return { cle: date, libelle: libelleJour(date) };
  if (granularite === "semaine") return semaineISO(date);
  return mois(date);
}

export function CourrierStats({ bureauId }: { bureauId: number }) {
  const [lignes, setLignes] = useState<LigneCourrier[]>([]);
  const [chargement, setChargement] = useState(supabase != null);
  const [granularite, setGranularite] = useState<Granularite>("mois");

  useEffect(() => {
    if (!supabase) return;
    let actif = true;
    supabase
      .from("courriers")
      .select(
        "date_courrier,nature_ordinaire,nature_confidentielle,transmission_interne"
      )
      .eq("bureau_id", bureauId)
      .then(({ data }) => {
        if (!actif) return;
        setLignes((data ?? []) as LigneCourrier[]);
        setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [bureauId]);

  const totaux = useMemo(() => {
    let recus = 0;
    let traites = 0;
    let instance = 0;
    for (const row of lignes) {
      const nature = natureDu(row);
      if (DEPARTS.includes(nature ?? "")) traites += 1;
      else if (ARRIVEES.includes(nature ?? "")) {
        recus += 1;
        if ((row.transmission_interne ?? []).length === 0) instance += 1;
      }
    }
    return { recus, traites, instance, total: recus + traites };
  }, [lignes]);

  const periodes = useMemo(() => {
    const carte = new Map<string, StatPeriode>();
    for (const row of lignes) {
      const nature = natureDu(row);
      const estRecu = ARRIVEES.includes(nature ?? "");
      const estTraite = DEPARTS.includes(nature ?? "");
      if (!estRecu && !estTraite) continue;

      const periode = periodeDe(row.date_courrier, granularite);
      const entree =
        carte.get(periode.cle) ??
        ({
          cle: periode.cle,
          libelle: periode.libelle,
          recus: 0,
          traites: 0,
          instance: 0,
          total: 0,
        } as StatPeriode);
      if (estTraite) entree.traites += 1;
      else if (estRecu) {
        entree.recus += 1;
        if ((row.transmission_interne ?? []).length === 0) entree.instance += 1;
      }
      entree.total = entree.recus + entree.traites;
      carte.set(periode.cle, entree);
    }
    return [...carte.values()].sort((a, b) => a.cle.localeCompare(b.cle)).reverse();
  }, [lignes, granularite]);

  const max = Math.max(1, ...periodes.map((p) => p.total));

  if (chargement) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-8 text-center text-[13px] text-ink-soft mb-6">
        Calcul des statistiques…
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-2 font-serif text-[15.5px] text-navy">
          <BarChart3 className="size-4 text-primary" />
          Statistiques des courriers du Secrétariat
        </h2>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {(["jour", "semaine", "mois"] as Granularite[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularite(g)}
              className={
                "rounded px-2.5 py-1 text-[12px] font-medium capitalize transition-colors " +
                (granularite === g
                  ? "bg-primary/10 text-primary"
                  : "text-ink-soft hover:bg-muted/40")
              }
            >
              {g === "jour" ? "Jour" : g === "semaine" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-border p-5 sm:grid-cols-4">
        <div className="rounded-md bg-sky-50 px-3 py-2.5">
          <div className="text-[11.5px] text-sky-800/80">Courriers reçus</div>
          <div className="text-[22px] font-semibold text-sky-900">{totaux.recus}</div>
        </div>
        <div className="rounded-md bg-emerald-50 px-3 py-2.5">
          <div className="text-[11.5px] text-emerald-800/80">Courriers traités</div>
          <div className="text-[22px] font-semibold text-emerald-900">
            {totaux.traites}
          </div>
        </div>
        <div className="rounded-md bg-amber-50 px-3 py-2.5">
          <div className="text-[11.5px] text-amber-800/80">En instance</div>
          <div className="text-[22px] font-semibold text-amber-900">
            {totaux.instance}
          </div>
        </div>
        <div className="rounded-md bg-muted/50 px-3 py-2.5">
          <div className="text-[11.5px] text-ink-soft">Total enregistré</div>
          <div className="text-[22px] font-semibold text-navy">{totaux.total}</div>
        </div>
      </div>

      {periodes.length === 0 ? (
        <div className="px-5 py-8 text-center text-[13px] text-ink-soft">
          Aucun courrier enregistré pour ce bureau.
        </div>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted/60">
                <th className="px-5 py-2.5 font-medium text-ink-soft">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" /> Période
                  </span>
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-ink-soft">Reçus</th>
                <th className="px-4 py-2.5 text-right font-medium text-ink-soft">Traités</th>
                <th className="px-4 py-2.5 text-right font-medium text-ink-soft">
                  En instance
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-ink-soft">Total</th>
                <th className="px-5 py-2.5 font-medium text-ink-soft">Répartition</th>
              </tr>
            </thead>
            <tbody>
              {periodes.map((p) => (
                <tr
                  key={p.cle}
                  className="border-b border-border last:border-0 hover:bg-muted/20"
                >
                  <td className="px-5 py-2.5 font-medium capitalize text-ink">
                    {p.libelle}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sky-800">{p.recus}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-800">
                    {p.traites}
                  </td>
                  <td className="px-4 py-2.5 text-right text-amber-800">
                    {p.instance}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-navy">
                    {p.total}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex h-2 w-full min-w-[90px] overflow-hidden rounded-full bg-muted">
                      <div
                        className="bg-sky-500"
                        style={{ width: `${(p.recus / max) * 100}%` }}
                        title={`${p.recus} reçus`}
                      />
                      <div
                        className="bg-emerald-500"
                        style={{ width: `${(p.traites / max) * 100}%` }}
                        title={`${p.traites} traités`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-border px-5 py-2.5 text-[11px] text-ink-soft">
        Reçus = natures « Arrivée » · Traitée = natures « Départ » · En instance =
        courrier reçu sans destinataire en transmission interne.
      </p>
    </section>
  );
}
