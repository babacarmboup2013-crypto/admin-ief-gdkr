"use client";

import { cn } from "@/lib/utils";
import type { BannerTone, Kpi, Panel, RowCell, TagTone } from "@/lib/types";

const TAG_STYLES: Record<TagTone, string> = {
  cours: "bg-gold-soft text-[#8a6a1f]",
  attente: "bg-red-soft text-red",
  ok: "bg-teal-soft text-teal",
};

const TAG_LABEL: Record<TagTone, string> = {
  cours: "cours",
  attente: "attente",
  ok: "ok",
};

export function Tag({ tone }: { tone: TagTone }) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium", TAG_STYLES[tone])}>
      {TAG_LABEL[tone]}
    </span>
  );
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 pb-4 lg:p-[18px] lg:pb-4">
      <div className="mb-2.5 text-xs text-ink-soft">{kpi.label}</div>
      <div className="font-serif text-[28px] leading-none text-navy">{kpi.value}</div>
      <div className={cn("mt-1.5 text-[11.5px]", kpi.warn ? "text-red" : "text-teal")}>{kpi.delta}</div>
    </div>
  );
}

export function Banner({
  tone,
  text,
  strong,
}: {
  tone: BannerTone;
  text: string;
  strong?: string[];
}) {
  const styles: Record<BannerTone, string> = {
    teal: "bg-teal-soft border-[#c7ddd6] text-[#245348]",
    gold: "bg-gold-soft border-[#e5d3a3] text-[#7a5b17]",
    red: "bg-red-soft border-[#e6bfae] text-red",
  };
  return (
    <div
      className={cn(
        "mb-6 flex items-start gap-2.5 rounded-lg border px-4 py-3.5 text-[13px] leading-relaxed",
        styles[tone]
      )}
    >
      {strong
        ? strong.map((s, i) => <span key={i} className="font-semibold">{s}</span>)
        : null}
      {text}
    </div>
  );
}

function RowCellView({ cell }: { cell: RowCell }) {
  if ("tag" in cell) {
    return <Tag tone={cell.tag} />;
  }
  return <span className={cn(cell.muted && "text-ink-soft")}>{cell.text}</span>;
}

export function Panel({ panel }: { panel: Panel }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="font-serif text-[15.5px] text-navy">{panel.title}</h2>
        {panel.link && <span className="text-xs font-medium text-teal">{panel.link}</span>}
      </div>

      {panel.type === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {panel.headers.map((h) => (
                  <th
                    key={h}
                    className="border-b border-border px-5 py-2.5 text-left text-[11px] font-medium text-ink-soft"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {panel.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="border-b border-border px-5 py-3 text-[13px]">
                      <RowCellView cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul>
          {panel.items.map((item, i) => (
            <li
              key={i}
              className="flex items-center justify-between border-b border-border px-5 py-3 last:border-b-0"
            >
              {"initials" in item ? (
                <div className="flex items-center gap-2.5">
                  <div className="flex size-[26px] items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
                    {item.initials}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-ink">{item.name}</div>
                    <div className="mt-0.5 text-[11.5px] text-ink-soft">{item.meta}</div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[13px] font-medium text-ink">{item.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-soft">{item.meta}</div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}