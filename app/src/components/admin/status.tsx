import { cn } from "@/lib/utils";
import type { AdminTone } from "@/lib/admin-types";

const TONE: Record<AdminTone, string> = {
  attente: "bg-red-soft text-red",
  cours: "bg-gold-soft text-[#8a6a1f]",
  ok: "bg-teal-soft text-teal",
};

export function StatusBadge({ label, tone }: { label: string; tone: AdminTone }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        TONE[tone]
      )}
    >
      {label}
    </span>
  );
}