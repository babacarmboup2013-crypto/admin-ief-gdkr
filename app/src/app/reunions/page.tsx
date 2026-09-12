"use client";

import { Video } from "lucide-react";

const REUNIONS = [
  { titre: "Bilan mensuel RH", bureau: "Ressources Humaines", date: "16 sept. — 9h00", odj: "3 points", statut: "Planifiée" },
  { titre: "Revue budgétaire Q4", bureau: "Gestion Financière", date: "18 sept. — 14h30", odj: "5 points", statut: "Planifiée" },
  { titre: "Point hebdomadaire Communication", bureau: "Communication & Partenariats", date: "9 sept. — 10h00", odj: "2 points", statut: "Compte-rendu disponible" },
];

export default function ReunionsPage() {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="hidden sm:block" />
        <button className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-[12.5px] font-semibold text-white">
          + Planifier une réunion
        </button>
      </div>

      <div className="mb-5 flex flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-serif text-[15.5px] text-navy">Réunion en cours</h2>
          <span className="inline-block rounded-full bg-red-soft px-2.5 py-0.5 text-[11px] font-medium text-red">
            En direct
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-[14.5px] font-semibold">Coordination sessions Octobre</div>
            <div className="mt-1 text-[12.5px] text-ink-soft">
              Bureau Examens et Concours · commencée à 10h00
            </div>
            <div className="mt-2.5 flex gap-1.5">
              {["MB", "AC", "NT"].map((ini) => (
                <div key={ini} className="flex size-[26px] items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
                  {ini}
                </div>
              ))}
              <div className="flex size-[26px] items-center justify-center rounded-full bg-teal-soft text-[11px] font-semibold text-teal">
                +2
              </div>
            </div>
          </div>
          <button className="flex cursor-pointer items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-[13px] font-semibold text-white">
            <Video className="size-4" />
            Rejoindre la visioconférence
          </button>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-serif text-[15.5px] text-navy">Réunions planifiées</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Réunion", "Bureau", "Date", "Ordre du jour", "Statut"].map((h) => (
                  <th key={h} className="border-b border-border px-5 py-2.5 text-left text-[11px] font-medium text-ink-soft">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REUNIONS.map((r, i) => (
                <tr key={i}>
                  <td className="border-b border-border px-5 py-3 text-[13px]">{r.titre}</td>
                  <td className="border-b border-border px-5 py-3 text-[13px] text-ink-soft">{r.bureau}</td>
                  <td className="border-b border-border px-5 py-3 text-[13px] text-ink-soft">{r.date}</td>
                  <td className="border-b border-border px-5 py-3 text-[13px] text-ink-soft">{r.odj}</td>
                  <td className="border-b border-border px-5 py-3 text-[13px]">
                    <span
                      className={
                        r.statut === "Compte-rendu disponible"
                          ? "inline-block rounded-full bg-teal-soft px-2.5 py-0.5 text-[11px] font-medium text-teal"
                          : "inline-block rounded-full bg-gold-soft px-2.5 py-0.5 text-[11px] font-medium text-[#8a6a1f]"
                      }
                    >
                      {r.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}