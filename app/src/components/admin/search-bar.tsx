"use client";

import { Search } from "lucide-react";

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Rechercher..."}
        className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-4 text-[13px] text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}
