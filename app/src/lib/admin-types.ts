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
  matricule: string | null;
  sexe: "M" | "F" | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  corps: string | null;
  grade: string | null;
  discipline: string | null;
  diplome_academique: string | null;
  diplome_professionnel: string | null;
  anciennete_enseignement: string | null;
  anciennete_poste: string | null;
  telephone: string | null;
  email: string | null;
  n_cni: string | null;
  sit_matrimoniale: string | null;
  nb_enfants: number | null;
  os_arrivee: string | null;
  motif_depart: string | null;
  depart_annee: string | null;
  source_feuille: string | null;
}

export const SEXE_LABELS: Record<string, string> = {
  M: "Masculin",
  F: "Féminin",
};

export const MOTIFS_DEPART = [
  "Retraite",
  "Mouvement National",
  "Permutation",
  "Disponibilité",
  "Détachement",
  "Décès",
  "Abandon de poste",
  "Démission",
  "Maintien",
  "Redéploiement",
  "Reconversion",
  "Congé",
  "Cadi",
  "Examens Prof",
  "Absent",
];

export const SIT_MAT_OPTIONS = ["Marié(e)", "Célibataire", "Divorcé(e)"];

export interface DossierRow {
  id: number;
  bureau_id: number | null;
  titre: string;
  statut: string;
  echeance: string | null;
  assigne_a: string | null;
  cree_par: string | null;
}

export interface TransmissionRow {
  id: number;
  type_objet: "courrier" | "dossier";
  objet_id: number;
  objet_ref: string | null;
  objet_titre: string | null;
  bureau_source_id: number | null;
  bureau_destinataire_id: number;
  expediteur_id: string | null;
  note: string | null;
  statut: string;
  date_transmission: string;
  date_reponse: string | null;
  fichier_path: string | null;
  fichier_nom: string | null;
  traite_par: string | null;
  created_at: string | null;
}

export const TRANSMISSION_STATUTS: Record<string, StatutAide> = {
  en_attente: { label: "En attente", tone: "attente" },
  accepte: { label: "Acceptée", tone: "cours" },
  traite: { label: "Traitée", tone: "ok" },
  refuse: { label: "Refusée", tone: "attente" },
};

/** Destinataires de la « Transmission Interne » — libellés exacts du formulaire KoboToolbox IEF. */
export const TRANSMISSIONS_INTERNES: string[] = [
  "IEF",
  "SECRETAIRE GENERAL",
  "SECRETARIAT PARTICULIER",
  "GESTIONNAIRE CHARGEE DES FINANCES",
  "COMPTABLE DES MATIERES",
  "SUIVIE-VALUATION",
  "PLANIFICATEUR",
  "CORRESPONDANT NUMERIQUE",
  "CONSEILLER PEDAGOGIQUE",
  "BRH CHARGEE PERSONNEL",
  "BRH CHARGEE CARRIERE",
  "INSPECTEUR ARABE",
  "INSPECTEUR YADE",
  "INSPECTEUR FAYE",
  "INSPECTRICE THERESE",
  "CHARGE COMMUNICATION",
  "CHARGEE PARTENARIAT",
  "BEXCO CHARGE ELEMETAIRE/EXAMENS PROFESSIONNEL",
  "BEXCO CHARGE ENSEIGNEMENT MOYEN GENERAL",
];

/** Destinataires de la « Transmission Interne » du formulaire confidentiel. */
export const TRANSMISSIONS_CONFIDENTIELLES: string[] = [
  "IEF",
  "SECRETAIRE GENERAL",
  "SECRETARIAT PARTICULIER",
  "GESTIONNAIRE CHARGEE DES FINANCES",
  "COMPTABLE DES MATIERES",
  "SUIVI-EVALUATION",
  "PLANIFICATEUR",
  "CORRESPONDANT NUMERIQUE",
  "CONSEILLER PEDAGOGIQUE",
  "BRH CHARGEE PERSONNEL",
  "BRH CHARGEE CARRIERE",
  "INSPECTEUR KANE ARABE",
  "INSPECTEUR YADE",
  "INSPECTEUR FAYE",
  "INSPECTRICE THERESE",
  "CHARGE COMMUNICATION",
  "CHARGEE PARTENARIAT",
  "BEXCO CHARGE ELEMENTAIRE/EXAMENS PROFESSIONNELS",
  "BEXCO CHARGE ENSEIGNMENT MOYEN GENERAL",
];

/** Valeurs brutes du champ « Nature Ordinaire » du formulaire KoboToolbox. */
export const NATURES_ORDINAIRES: Record<string, string> = {
  arriv__ordinaire: "Arrivé Ordinaire",
  d_part_ordinaire: "Départ Ordinaire",
};

/** Valeurs brutes du champ « Nature du Courrier » du formulaire confidentiel. */
export const NATURES_CONFIDENTIELLES: Record<string, string> = {
  arriv_e_confidentiel: "Arrivée Confidentiel",
  d_part_confidentiel: "Départ Confidentiel",
};

export const COURRIER_STATUTS: Record<string, StatutAide> = {
  brouillon: { label: "Brouillon", tone: "cours" },
  soumis: { label: "Soumis", tone: "attente" },
  archive: { label: "Archivé", tone: "ok" },
};

export interface CourrierRow {
  id: number;
  date_courrier: string | null;
  numero_reference: string | null;
  objet: string | null;
  type_courrier: string;
  nature_ordinaire: string | null;
  nature_confidentielle: string | null;
  expediteur: string | null;
  destinataire: string | null;
  transmission_interne: string[] | null;
  fichier_path: string | null;
  fichier_nom: string | null;
  kobo_id: number | null;
  kobo_uuid: string | null;
  bureau_id: number | null;
  saisi_par: string | null;
  statut: string;
  created_at: string | null;
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