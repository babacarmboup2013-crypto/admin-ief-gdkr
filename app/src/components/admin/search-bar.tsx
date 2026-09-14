"use client";

import { Search } from "lucide-react";

export interface SearchField {
  key: string;
  label: string;
  placeholder: string;
}

export function SearchBar({ fields, values, onChange }: {
  fields: SearchField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      {fields.map((f) => (
        <div key={f.key} className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={values[f.key] ?? ""}
            onChange={(e) => onChange(f.key, e.target.value)}
            placeholder={f.placeholder}
            className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-[12.5px] text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      ))}
    </div>
  );
}
