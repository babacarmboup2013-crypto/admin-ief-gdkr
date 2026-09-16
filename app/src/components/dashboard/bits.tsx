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
    <div className="rounded-lg border border-border bg-card p-3 pb-3 sm:p-4 sm:pb-4 lg:p-[18px] lg:pb-4">
      <div className="mb-2 text-[11px] text-ink-soft sm:text-xs">{kpi.label}</div>
      <div className="font-serif text-[22px] leading-none text-navy sm:text-[28px]">{kpi.value}</div>
      <div className={cn("mt-1.5 text-[10px] sm:text-[11.5px]", kpi.warn ? "text-red" : "text-teal")}>{kpi.delta}</div>
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
        "mb-5 flex items-start gap-2 rounded-lg border px-3 py-3 text-[12px] leading-relaxed sm:mb-6 sm:gap-2.5 sm:px-4 sm:py-3.5 sm:text-[13px]",
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
      <div className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-5 sm:py-4">
        <h2 className="font-serif text-[13px] text-navy sm:text-[15.5px]">{panel.title}</h2>
        {panel.link && <span className="text-[10px] font-medium text-teal sm:text-xs">{panel.link}</span>}
      </div>

      {panel.type === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {panel.headers.map((h) => (
                  <th
                    key={h}
                    className="border-b border-border px-3 py-2 text-left text-[10px] font-medium text-ink-soft sm:px-5 sm:text-[11px]"
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
                    <td key={j} className="border-b border-border px-3 py-2.5 text-[12px] sm:px-5 sm:text-[13px]">
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
              className="flex items-center justify-between border-b border-border px-3 py-2.5 last:border-b-0 sm:px-5 sm:py-3"
            >
              {"initials" in item ? (
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="flex size-[22px] items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-white sm:size-[26px] sm:text-[11px]">
                    {item.initials}
                  </div>
                  <div>
                    <div className="text-[12px] font-medium text-ink sm:text-[13px]">{item.name}</div>
                    <div className="mt-0.5 text-[10px] text-ink-soft sm:text-[11.5px]">{item.meta}</div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[12px] font-medium text-ink sm:text-[13px]">{item.name}</div>
                  <div className="mt-0.5 text-[10px] text-ink-soft sm:text-[11.5px]">{item.meta}</div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}