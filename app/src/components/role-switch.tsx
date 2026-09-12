"use client";

import { ROLES } from "@/lib/data";
import { useRole } from "@/lib/role-context";
import { cn } from "@/lib/utils";

export function RoleSwitch() {
  const { role, setRole } = useRole();

  return (
    <div className="flex flex-wrap gap-0.5 rounded-2xl border border-border bg-card p-[3px]">
      {ROLES.map((r) => (
        <button
          key={r.id}
          onClick={() => setRole(r.id)}
          className={cn(
            "whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] font-medium text-ink-soft",
            "transition-colors hover:bg-muted",
            role === r.id && "bg-primary text-white hover:bg-primary"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}