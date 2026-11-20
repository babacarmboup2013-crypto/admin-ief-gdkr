"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { DASHBOARDS } from "@/lib/data";
import { RoleContext, type Profile } from "@/lib/role-context";
import type { RoleId } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { nomBureau } from "@/lib/admin-perms";
import { useSession } from "@/lib/use-session";
import { Sidebar } from "./sidebar";

const DB_ROLE_TO_UI: Record<string, RoleId> = {
  super_admin: "super",
  chef_admin: "chef",
  secretaire_general: "secretaire",
  inspecteur: "inspecteur",
  responsable_bureau: "responsable",
  agent_bureau: "agent",
};

interface ProfileRow {
  role: string;
  fonction: string | null;
  nom_complet: string | null;
  bureau_id: number | null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<RoleId>("super");
  const [profile, setProfile] = useState<Profile>({ nom: null, bureauId: null, fonction: null });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { session } = useSession();
  const uid = session?.user?.id ?? null;
  const [now, setNow] = useState<Date | null>(null);

  // Date et heure courantes, rafraîchies toutes les 30 secondes.
  // Initialisées après l'hydratation pour éviter un écart SSR / navigateur.
  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!uid || !supabase) return;
    let active = true;
    supabase
      .from("utilisateurs")
      .select("role, fonction, nom_complet, bureau_id")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        const row = data as ProfileRow;
        const mapped = DB_ROLE_TO_UI[row.role];
        if (mapped) setRole(mapped);
        if (row.bureau_id === 7) setRole("rh");
        else if (!mapped && row.fonction === "RH") setRole("rh");
        setProfile({ nom: row.nom_complet, bureauId: row.bureau_id, fonction: row.fonction });
      });
    return () => {
      active = false;
    };
  }, [uid]);

  const config = DASHBOARDS[role];
  let title = config.title;
  let sub = config.sub;
  if (pathname === "/discussions") {
    title = "Discussions";
    sub = "Chat et fils de discussion thématiques";
  } else if (pathname === "/reunions") {
    title = "Réunions";
    sub = "Planification, ordre du jour et visioconférence";
  } else if (pathname.startsWith("/administration")) {
    title = "Administration";
    sub = "Saisie et gestion des données réelles";
  } else if (pathname.startsWith("/transmissions")) {
    title = "Transmissions internes";
    sub = "Courriers et dossiers transmis entre bureaux";
  }

  if ((role === "responsable" || role === "agent") && profile.bureauId != null) {
    title = role === "agent"
      ? `Mes tâches — ${nomBureau(profile.bureauId)}`
      : `Tableau de bord — ${nomBureau(profile.bureauId)}`;
    sub = `Bureau n°${profile.bureauId}`;
  }
  if (role === "rh" && !pathname.startsWith("/administration") && pathname !== "/discussions" && pathname !== "/reunions") {
    sub = "";
  }

  const dateLabel = now
    ? now.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  if (sub && dateLabel) sub = `${sub} — ${dateLabel}`;

  if (pathname === "/auth") {
    return (
      <RoleContext.Provider value={{ role, setRole, uid, profile }}>
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          {children}
        </div>
      </RoleContext.Provider>
    );
  }

  return (
    <RoleContext.Provider value={{ role, setRole, uid, profile }}>
      <div className="flex min-h-dvh">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-navy-deep/45 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="min-w-0 flex-1 px-3 pb-14 pt-4 sm:px-5 lg:px-9 lg:pt-8">
          {role === "rh" && !pathname.startsWith("/administration") && pathname !== "/discussions" && pathname !== "/reunions" && (
            <div className="mb-2 text-right text-[11px] text-ink-soft sm:text-[12px]">
              {dateLabel}
            </div>
          )}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-7 sm:gap-5">
            <div className="flex items-start gap-2 sm:gap-3">
              <button
                aria-label="Ouvrir le menu"
                onClick={() => setSidebarOpen(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white lg:hidden"
              >
                <Menu className="size-4" />
              </button>
              <div>
                <h1 className="text-xl leading-tight text-navy sm:text-[26px]">{title}</h1>
                <p className="mt-1 text-[12px] text-ink-soft sm:text-[13.5px]">{sub}</p>
              </div>
            </div>
          </div>
          {children}
          <footer className="mt-10 border-t border-line py-4 text-center text-[10px] text-ink-soft sm:text-[11px]">
            © 2026 CN IEF Grand Dakar — Tous droits réservés
          </footer>
        </main>
      </div>
    </RoleContext.Provider>
  );
}