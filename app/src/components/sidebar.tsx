"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, MessageSquare, CalendarClock, Settings, LogOut, LogIn } from "lucide-react";
import { DASHBOARDS } from "@/lib/data";
import { useRole } from "@/lib/role-context";
import { fetchBureaux } from "@/lib/queries";
import { useSession } from "@/lib/use-session";
import { supabase } from "@/lib/supabase/client";
import type { Bureau } from "@/lib/types";
import { cn } from "@/lib/utils";

const canSeeAllBureaux = (role: string) =>
  role === "super" || role === "chef";

const MODULES = [
  { view: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, href: "/" },
  { view: "discussions", label: "Discussions", icon: MessageSquare, href: "/discussions" },
  { view: "reunions", label: "Réunions", icon: CalendarClock, href: "/reunions" },
  { view: "administration", label: "Administration", icon: Settings, href: "/administration" },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, profile } = useRole();
  const config = DASHBOARDS[role];
  const activeBureaux = config.activeBureaux;
  const [allBureaux, setAllBureaux] = useState<Bureau[]>([]);
  const [bureauCounts, setBureauCounts] = useState<Record<number, number>>({});
  const [direction, setDirection] = useState<{ nom_complet: string; fonction: string; email: string }[]>([]);
  const { session } = useSession();

  useEffect(() => {
    let active = true;
    fetchBureaux().then((b) => {
      if (active) setAllBureaux(b);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!supabase || !canSeeAllBureaux(role)) return;
    let active = true;
    (async () => {
      const { data: pers } = await supabase.from("personnel").select("bureau_id,ecole_id");
      if (!active || !pers) return;
      const counts: Record<number, number> = {};
      for (const p of pers as { bureau_id: number | null }[]) {
        if (p.bureau_id && p.bureau_id !== 24) counts[p.bureau_id] = (counts[p.bureau_id] ?? 0) + 1;
      }
      setBureauCounts(counts);
    })();
    return () => { active = false; };
  }, [role]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("utilisateurs")
        .select("nom_complet,fonction,email")
        .in("role", ["super_admin", "chef_admin", "secretaire_general", "inspecteur"])
        .order("role");
      if (active && data) setDirection(data as any[]);
    })();
    return () => { active = false; };
  }, []);

  const visibleBureaux = canSeeAllBureaux(role)
    ? allBureaux.filter((b) => b.id !== 24)
    : allBureaux.filter((b) => profile.bureauId != null && b.id === profile.bureauId && b.id !== 24);

  async function signOut() {
    await supabase?.auth.signOut();
    onClose();
    router.push("/auth");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-sidebar text-sidebar-foreground",
        "transition-transform duration-200 lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 pb-5 pt-7">
        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-sidebar-primary font-serif text-[15px] text-sidebar-primary">
          IA
        </div>
        <div className="leading-tight">
          <div className="font-serif text-[15px] text-white">IEF ADMIN</div>
          <div className="text-[11px] text-[#96a5c2]">Plateforme des 11 bureaux</div>
        </div>
      </div>

      {direction.length > 0 && (
        <>
          <div className="text-[11px] text-[#7c8bab] px-5 pt-5 pb-2">Direction</div>
          <nav className="px-3">
            <ul>
              {direction.map((d) => (
                <li key={d.email}>
                  <div className="mb-0.5 flex items-center gap-2.5 rounded px-2.5 py-2 text-[13.5px] text-[#c3cde0]">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/30 text-[10.5px] text-sidebar-primary">
                      {d.nom_complet.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] text-[#dfe6f2]">{d.nom_complet}</div>
                      <div className="truncate text-[10.5px] text-[#7c8bab]">{d.fonction}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}

      <div className="text-[11px] text-[#7c8bab] px-5 pt-5 pb-2">
        {visibleBureaux.length > 1 ? "Bureaux" : "Mon bureau"}
      </div>
      <nav className="px-3">
        <ul>
          {visibleBureaux.map((b) => {
            const onThisBureau = pathname === `/bureau/${b.id}`;
            const active = activeBureaux
              ? activeBureaux.includes(String(b.id))
              : onThisBureau;
            return (
              <li key={b.id}>
                <Link
                  href={`/bureau/${b.id}`}
                  onClick={onClose}
                  className={cn(
                    "mb-0.5 flex items-center gap-2.5 rounded px-2.5 py-2 text-[13.5px] text-[#c3cde0] transition-colors hover:bg-white/[0.06]",
                    active && "bg-white/[0.09] text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10.5px] text-[#96a5c2]",
                      active && "bg-sidebar-primary text-sidebar-primary-foreground"
                    )}
                  >
                    {b.id}
                  </span>
                  {b.nom}
                  {canSeeAllBureaux(role) && (
                    <span className="ml-auto text-[11px] text-[#7c8bab]">{bureauCounts[b.id] ?? 0}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {canSeeAllBureaux(role) && (
        <>
          <div className="text-[11px] text-[#7c8bab] px-5 pt-5 pb-2">Départ</div>
          <nav className="px-3">
            <ul>
              <li>
                <Link
                  href={`/bureau/24`}
                  onClick={onClose}
                  className={cn(
                    "mb-0.5 flex items-center gap-2.5 rounded px-2.5 py-2 text-[13.5px] text-[#c3cde0] transition-colors hover:bg-white/[0.06]",
                    pathname === "/bureau/24" && "bg-white/[0.09] text-white"
                  )}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10.5px] text-[#96a5c2]">
                    ✕
                  </span>
                  Anciens agents
                  <span className="ml-auto text-[11px] text-[#7c8bab]">{bureauCounts[24] ?? 0}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </>
      )}

      <div className="mt-2 px-5 pb-2 text-[11px] text-[#7c8bab]">Modules</div>
      <nav className="px-3">
        <ul>
          {MODULES.map((m) => {
            const active = m.href === "/" ? pathname === "/" : pathname.startsWith(m.href);
            return (
              <li key={m.view}>
                <Link
                  href={m.href}
                  onClick={onClose}
                  className={cn(
                    "mb-0.5 flex items-center gap-2.5 rounded px-2.5 py-2 text-[13.5px] text-[#c3cde0]",
                    active && "bg-white/[0.09] text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center text-[11px]",
                      active && "text-sidebar-primary"
                    )}
                  >
                    <m.icon className="size-4" />
                  </span>
                  {m.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-sidebar-border px-5 pb-5 pt-4">
        {session ? (
          <>
            <div className="text-[11px] text-[#7c8bab]">Connecté en tant que</div>
            <div className="truncate text-xs font-medium text-[#dfe6f2]">{session.user.email}</div>
            <div className="mt-0.5 text-[11px] text-[#96a5c2]">{config.foot}</div>
            <button
              onClick={signOut}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border py-2 text-[11.5px] font-medium text-[#c3cde0] transition-colors hover:bg-white/[0.06]"
            >
              <LogOut className="size-3.5" /> Se déconnecter
            </button>
          </>
        ) : (
          <>
            <div className="text-[11px] text-[#7c8bab]">Non connecté — mode démo</div>
            <div className="mt-0.5 text-[11px] text-[#96a5c2]">{config.foot}</div>
            <Link
              href="/auth"
              onClick={onClose}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border py-2 text-[11.5px] font-medium text-[#c3cde0] transition-colors hover:bg-white/[0.06]"
            >
              <LogIn className="size-3.5" /> Se connecter
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}