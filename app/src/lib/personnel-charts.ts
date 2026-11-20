import { supabase } from "./supabase/client";
import type { ChartPanel, ChartRow, ChartSegment } from "./types";

const COULEUR_HOMME = "#1b2a4a";
const COULEUR_FEMME = "#c89b3c";
const COULEUR_INCONNU = "#cbd3e1";

const LEGENDE: ChartSegment[] = [
  { label: "Hommes", color: COULEUR_HOMME, value: 0 },
  { label: "Femmes", color: COULEUR_FEMME, value: 0 },
  { label: "Non renseigné", color: COULEUR_INCONNU, value: 0 },
];

interface PersonnelLigne {
  id: number;
  bureau_id: number | null;
  ecole_id: number | null;
  sexe: string | null;
}

interface AffectationBureauLigne {
  personnel_id: number;
  bureau_id: number;
}

interface EcoleLigne {
  id: number;
  nom: string;
  cycle: string | null;
}

interface BureauLigne {
  id: number;
  nom: string;
}

export interface PersonnelStats {
  personnelsBureaux: number;
  personnelsEcoles: number;
  ecolesRecensees: number;
  hommes: number;
  femmes: number;
  femmesBureaux: number;
  femmesEcoles: number;
}

export interface PersonnelCharts {
  panels: ChartPanel[];
  stats: PersonnelStats;
}

function genreDe(sexe: unknown): "H" | "F" | "N" {
  const s = String(sexe ?? "").trim().toUpperCase();
  if (s === "M" || s === "H") return "H";
  if (s === "F") return "F";
  return "N";
}

function ligneGraphique(label: string, lignes: PersonnelLigne[], detail?: string): ChartRow {
  let hommes = 0;
  let femmes = 0;
  let inconnus = 0;
  for (const p of lignes) {
    const g = genreDe(p.sexe);
    if (g === "H") hommes++;
    else if (g === "F") femmes++;
    else inconnus++;
  }
  const segments: ChartSegment[] = [
    { label: "Hommes", color: COULEUR_HOMME, value: hommes },
    { label: "Femmes", color: COULEUR_FEMME, value: femmes },
  ];
  if (inconnus > 0) {
    segments.push({ label: "Non renseigné", color: COULEUR_INCONNU, value: inconnus });
  }
  return { label, total: hommes + femmes + inconnus, segments, detail };
}

function totalGenre(lignes: PersonnelLigne[], genre: "H" | "F"): number {
  return lignes.filter((p) => genreDe(p.sexe) === genre).length;
}

/**
 * Construit les diagrammes effectif / genre du personnel :
 * - par bureau de l'IEF ;
 * - par école de la circonscription.
 */
export async function buildPersonnelCharts(): Promise<PersonnelCharts> {
  const vide: PersonnelCharts = {
    panels: [],
    stats: {
      personnelsBureaux: 0,
      personnelsEcoles: 0,
      ecolesRecensees: 0,
      hommes: 0,
      femmes: 0,
      femmesBureaux: 0,
      femmesEcoles: 0,
    },
  };
  if (!supabase) return vide;

  const [personnelRes, ecolesRes, bureauxRes, affectationsRes] = await Promise.all([
    supabase.from("personnel").select("id, bureau_id, ecole_id, sexe"),
    supabase.from("ecoles").select("id, nom, cycle").order("nom", { ascending: true }),
    supabase.from("bureaux").select("id, nom").order("id", { ascending: true }),
    supabase.from("personnel_bureaux").select("personnel_id, bureau_id"),
  ]);
  if (personnelRes.error || ecolesRes.error || bureauxRes.error || affectationsRes.error) return vide;

  const personnel = (personnelRes.data ?? []) as PersonnelLigne[];
  const ecoles = (ecolesRes.data ?? []) as EcoleLigne[];
  const bureaux = (bureauxRes.data ?? []) as BureauLigne[];
  const affectations = (affectationsRes.data ?? []) as AffectationBureauLigne[];

  // Le bureau 24 « Depart » est une archive, pas un bureau actif.
  const bureauxActifs = bureaux.filter((b) => b.id !== 24);
  const parId = new Map(personnel.map((p) => [Number(p.id), p] as const));
  const affectes = new Set(affectations.map((a) => Number(a.personnel_id)));

  // Une même personne peut être rattachée à plusieurs bureaux : chaque
  // affectation compte dans l'effectif du bureau concerné.
  const personnelsBureaux: PersonnelLigne[] = [];
  for (const a of affectations) {
    const p = parId.get(Number(a.personnel_id));
    if (p) personnelsBureaux.push({ ...p, bureau_id: Number(a.bureau_id), ecole_id: null });
  }

  // Filet de sécurité : les agents affectés par leur seul champ bureau_id.
  for (const p of personnel) {
    if (p.bureau_id != null && !affectes.has(Number(p.id))) {
      personnelsBureaux.push({ ...p, ecole_id: null });
    }
  }

  const personnelsBureauxActifs = personnelsBureaux.filter((p) => Number(p.bureau_id) !== 24);
  const personnelsEcoles = personnel.filter((p) => p.ecole_id != null);

  const lignesBureaux: ChartRow[] = bureauxActifs.map((b) => ({
    ...ligneGraphique(
      b.nom,
      personnelsBureauxActifs.filter((p) => Number(p.bureau_id) === b.id)
    ),
  }));

  const ecolesAvecPersonnel = ecoles
    .map((e) => ({
      ecole: e,
      lignes: personnelsEcoles.filter((p) => Number(p.ecole_id) === e.id),
    }))
    .filter((x) => x.lignes.length > 0)
    .sort((a, b) => b.lignes.length - a.lignes.length);

  const lignesEcoles: ChartRow[] = ecolesAvecPersonnel.map(({ ecole, lignes }) => {
    const cycle = ecole.cycle
      ? String(ecole.cycle).charAt(0).toUpperCase() + String(ecole.cycle).slice(1)
      : "Autre";
    return ligneGraphique(ecole.nom, lignes, cycle);
  });

  const totalHommes = totalGenre(personnelsBureauxActifs, "H") + totalGenre(personnelsEcoles, "H");
  const totalFemmes = totalGenre(personnelsBureauxActifs, "F") + totalGenre(personnelsEcoles, "F");

  const panelBureaux: ChartPanel = {
    type: "chart",
    title: "Personnel des bureaux IEF — effectif et genre",
    link: "Temps réel",
    subtitle: `${personnelsBureauxActifs.length} affectations réparties sur ${bureauxActifs.length} bureaux`,
    rows: lignesBureaux,
    legend: LEGENDE,
  };
  const panelEcoles: ChartPanel = {
    type: "chart",
    title: "Personnel des écoles — effectif et genre",
    link: `${ecolesAvecPersonnel.length} / ${ecoles.length} écoles pourvues`,
    subtitle: `${personnelsEcoles.length} agents dans ${ecolesAvecPersonnel.length} écoles de la circonscription`,
    rows: lignesEcoles,
    legend: LEGENDE,
  };

  return {
    panels: [panelBureaux, panelEcoles],
    stats: {
      personnelsBureaux: personnelsBureauxActifs.length,
      personnelsEcoles: personnelsEcoles.length,
      ecolesRecensees: ecoles.length,
      hommes: totalHommes,
      femmes: totalFemmes,
      femmesBureaux: totalGenre(personnelsBureauxActifs, "F"),
      femmesEcoles: totalGenre(personnelsEcoles, "F"),
    },
  };
}
