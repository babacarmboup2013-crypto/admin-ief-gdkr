export type RoleId =
  | "super"
  | "chef"
  | "secretaire"
  | "inspecteur"
  | "responsable"
  | "agent"
  | "rh";

export interface Bureau {
  id: number;
  nom: string;
}

export type TagTone = "attente" | "cours" | "ok";

export interface Kpi {
  label: string;
  value: string;
  delta: string;
  warn?: boolean;
}

export type RowCell = { text: string; muted?: boolean } | { tag: TagTone; label: string };

export interface TablePanel {
  type: "table";
  title: string;
  link?: string;
  headers: string[];
  rows: RowCell[][];
}

export interface PeoplePanel {
  type: "people";
  title: string;
  link?: string;
  items: { initials: string; name: string; meta: string }[];
}

export interface NamedListPanel {
  type: "named";
  title: string;
  link?: string;
  items: { name: string; meta: string }[];
}

export type Panel = TablePanel | PeoplePanel | NamedListPanel;

export type BannerTone = "teal" | "gold" | "red";

export interface RoleDashboard {
  title: string;
  sub: string;
  foot: string;
  activeBureaux: string[] | null;
  banner?: { tone: BannerTone; text: string; strong?: string[] };
  kpis: Kpi[];
  panels: Panel[];
  fullWidth?: number[];
  delegation?: { delegant: string; fin: string };
}