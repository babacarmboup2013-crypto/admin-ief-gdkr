export type AdminTone = "attente" | "cours" | "ok";

export interface StatutAide {
  label: string;
  tone: AdminTone;
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  chef_admin: "Chef Admin (IEF)",
  secretaire_general: "Secrétaire Général",
  inspecteur: "Inspecteur",
  responsable_bureau: "Responsable de bureau",
  agent_bureau: "Agent de bureau",
};

export const CYCLE_LABELS: Record<string, string> = {
  préscolaire: "Préscolaire",
  élémentaire: "Élémentaire",
  collège: "Collège",
  daara_moderne: "Daara Moderne",
  efa: "EFA",
};

export const CYCLE_VALUES = ["préscolaire", "élémentaire", "collège", "daara_moderne", "efa"];

export const DOSSIER_STATUTS: Record<string, StatutAide> = {
  en_cours: { label: "En cours", tone: "cours" },
  a_traiter: { label: "À traiter", tone: "attente" },
  a_faire: { label: "À faire", tone: "attente" },
  cloture: { label: "Clôturé", tone: "ok" },
  termine: { label: "Terminé", tone: "ok" },
  annulee: { label: "Annulé", tone: "attente" },
};

export const RAPPORT_STATUTS: Record<string, StatutAide> = {
  brouillon: { label: "Brouillon", tone: "cours" },
  en_revision: { label: "En révision", tone: "cours" },
  soumis: { label: "Soumis", tone: "attente" },
  valide: { label: "Validé", tone: "ok" },
};

export const REUNION_STATUTS: Record<string, StatutAide> = {
  planifiee: { label: "Planifiée", tone: "cours" },
  en_cours: { label: "En cours", tone: "cours" },
  terminee: { label: "Terminée", tone: "ok" },
  annulee: { label: "Annulée", tone: "attente" },
};

export const PERSONNEL_STATUTS: Record<string, StatutAide> = {
  actif: { label: "Actif", tone: "ok" },
  inactif: { label: "Inactif", tone: "attente" },
};

export interface BureauRow {
  id: number;
  nom: string;
}

export interface UtilisateurRow {
  id: string;
  nom_complet: string;
  email: string;
  role: string;
  bureau_id: number | null;
  fonction: string | null;
  actif: boolean;
}

export interface EcoleRow {
  id: number;
  nom: string;
  cycle: string;
  localisation: string | null;
  effectif_eleves: number | null;
}

export interface PersonnelRow {
  id: number;
  bureau_id: number | null;
  ecole_id: number | null;
  nom_complet: string;
  fonction: string | null;
  date_entree: string | null;
  statut: string;
}

export interface DossierRow {
  id: number;
  bureau_id: number | null;
  titre: string;
  statut: string;
  echeance: string | null;
  assigne_a: string | null;
  cree_par: string | null;
}

export interface RapportRow {
  id: number;
  bureau_id: number | null;
  titre: string;
  contenu: string | null;
  statut: string;
  soumis_par: string | null;
  valide_par: string | null;
}

export interface ReunionRow {
  id: number;
  titre: string;
  bureau_id: number | null;
  organise_par: string | null;
  date_heure: string;
  ordre_du_jour: string | null;
  compte_rendu: string | null;
  lien_visio: string | null;
  statut: string;
}

export interface UtilisateurReference {
  id: string;
  nom_complet: string;
  email: string;
}

export function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

export function fmtDate(v: unknown): string {
  if (v == null) return "—";
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}