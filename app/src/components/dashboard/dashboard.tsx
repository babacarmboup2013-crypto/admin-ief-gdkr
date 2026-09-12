"use client";

import { useEffect, useState } from "react";
import { DASHBOARDS } from "@/lib/data";
import { buildRoleDashboard } from "@/lib/dashboard-data";
import { useRole } from "@/lib/role-context";
import type { RoleDashboard } from "@/lib/types";
import { Banner, KpiCard, Panel } from "./bits";

function KpiRow({ config }: { config: RoleDashboard }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {config.kpis.map((kpi, i) => (
        <KpiCard key={i} kpi={kpi} />
      ))}
    </div>
  );
}

function Panels({ config }: { config: RoleDashboard }) {
  const { panels, fullWidth = [] } = config;

  if (panels.length === 0) return null;

  const gridTwo = panels.length >= 2 && !fullWidth.includes(1) && !fullWidth.includes(2);

  if (gridTwo) {
    return (
      <div className="grid items-start gap-4 [grid-template-columns:1.4fr_1fr] lg:gap-[18px]">
        <Panel panel={panels[0]} />
        <Panel panel={panels[1]} />
        {panels.slice(2).map((p, i) => (
          <div key={i} className="[grid-column:1/-1]">
            <Panel panel={p} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={fullWidth.length > 0 ? "space-y-5" : "space-y-5 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:gap-[18px]"}>
      {panels.map((p, i) => (
        <Panel key={i} panel={p} />
      ))}
    </div>
  );
}

function SecretaireView({ config }: { config: RoleDashboard }) {
  if (!config.delegation) {
    return (
      <div>
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-[#e5d3a3] bg-gold-soft px-4 py-3.5 text-[13px] leading-relaxed text-[#7a5b17]">
          Aucune délégation active. En tant qu&apos;adjoint du Chef Admin, vous conservez vos droits
          habituels tant qu&apos;aucune délégation ne vous est accordée.
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-serif text-[15.5px] text-navy">Délégation de pouvoir</h2>
          </div>
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <div className="mb-3.5 text-sm text-ink">
              Le Chef Admin ne vous a délégué aucun pouvoir pour le moment.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start gap-2.5 rounded-lg border border-[#e6bfae] bg-red-soft px-4 py-3.5 text-[13px] leading-relaxed text-red">
        Délégation active — vous agissez avec les droits de l&apos;IEF (Chef Admin){" "}
        <strong>{config.delegation.delegant}</strong> jusqu&apos;au {config.delegation.fin}.
      </div>
      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {config.kpis.map((kpi, i) => (
          <KpiCard key={i} kpi={kpi} />
        ))}
      </div>
      <Panel panel={config.panels[0]} />
    </div>
  );
}

export function Dashboard() {
  const { role, uid, profile } = useRole();
  const [real, setReal] = useState<Partial<Record<string, RoleDashboard>>>({});

  useEffect(() => {
    if (!uid) return;
    let active = true;
    const key = `${role}:${uid}`;
    buildRoleDashboard(role, { uid, bureauId: profile.bureauId, nom: profile.nom }).then((d) => {
      if (active && d) setReal((prev) => ({ ...prev, [key]: d }));
    });
    return () => {
      active = false;
    };
  }, [role, uid, profile?.bureauId, profile?.nom]);

  const key = uid ? `${role}:${uid}` : "";
  const config = (key ? real[key] : undefined) ?? DASHBOARDS[role];

  return (
    <div>
      {config.banner && <Banner tone={config.banner.tone} text={config.banner.text} strong={config.banner.strong} />}

      {role === "secretaire" ? (
        <SecretaireView config={config} />
      ) : (
        <>
          <KpiRow config={config} />
          <Panels config={config} />
        </>
      )}
    </div>
  );
}