"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { DASHBOARDS } from "@/lib/data";
import { RoleContext, type Profile } from "@/lib/role-context";
import type { RoleId } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
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
  }
  if (role === "rh" && !pathname.startsWith("/administration") && pathname !== "/discussions" && pathname !== "/reunions") {
    sub = "";
  }

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
      <div className="flex min-h-screen">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-navy-deep/45 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="min-w-0 flex-1 px-4 pb-14 pt-5 sm:px-6 lg:px-9 lg:pt-8">
          {role === "rh" && !pathname.startsWith("/administration") && pathname !== "/discussions" && pathname !== "/reunions" && (
            <div className="mb-2 text-right text-[12px] text-ink-soft">
              {new Date().toLocaleString("fr-SN", { dateStyle: "full", timeStyle: "short" })}
            </div>
          )}
          <div className="mb-7 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-3">
              <button
                aria-label="Ouvrir le menu"
                onClick={() => setSidebarOpen(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white lg:hidden"
              >
                <Menu className="size-4" />
              </button>
              <div>
                <h1 className="text-[26px] leading-tight text-navy">{title}</h1>
                <p className="mt-1 text-[13.5px] text-ink-soft">{sub}</p>
              </div>
            </div>
          </div>
          {children}
          <footer className="mt-10 border-t border-line py-4 text-center text-[11px] text-ink-soft">
            © 2026 CN IEF Grand Dakar Built by Groupe InTechSoft Enterprises — Tous droits réservés
          </footer>
        </main>
      </div>
    </RoleContext.Provider>
  );
}