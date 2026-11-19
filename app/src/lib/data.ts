import type { Bureau, RoleDashboard, RoleId } from "./types";

export const BUREAUX: Bureau[] = [
  { id: 1, nom: "Gestion Financière" },
  { id: 2, nom: "Gestion Matérielle" },
  { id: 3, nom: "Secrétariat" },
  { id: 4, nom: "Suivi-Évaluation" },
  { id: 5, nom: "Planification & Statistiques" },
  { id: 6, nom: "Correspondant Numérique" },
  { id: 7, nom: "Ressources Humaines" },
  { id: 8, nom: "Examens et Concours" },
  { id: 9, nom: "Bureau Genre" },
  { id: 10, nom: "Communication & Partenariats" },
  { id: 11, nom: "Enseignement Arabe" },
];

/**
 * Libellé du module « Dossiers » propre à chaque bureau.
 * Par défaut : « Dossiers ». À compléter au fur et à mesure que les métiers
 * sont définis (ex. le Secrétariat gère les courriers).
 */
export const DOSSIERS_LABELS: Record<number, string> = {
  3: "Gestion des courriers",
};

export function dossiersLabel(bureauId: number | null): string {
  if (bureauId == null) return "Dossiers";
  return DOSSIERS_LABELS[bureauId] ?? "Dossiers";
}

export const ROLES: { id: RoleId; label: string }[] = [
  { id: "super", label: "Super Admin" },
  { id: "chef", label: "IEF (Chef Admin)" },
  { id: "secretaire", label: "Secrétaire Général" },
  { id: "inspecteur", label: "Inspecteur de district" },
  { id: "responsable", label: "Responsable de bureau" },
  { id: "agent", label: "Agent de bureau" },
  { id: "rh", label: "RH" },
];

export const DASHBOARDS: Record<RoleId, RoleDashboard> = {
  super: {
    title: "Vue d'ensemble",
    sub: "Tous les bureaux — samedi 12 septembre 2026",
    foot: "Super Admin",
    activeBureaux: null,
    kpis: [
      { label: "Bureaux actifs", value: "11 / 11", delta: "Tous opérationnels" },
      { label: "Dossiers en cours", value: "128", delta: "+6 cette semaine" },
      { label: "Rapports en attente", value: "14", delta: "4 en retard", warn: true },
      { label: "Agents actifs", value: "96", delta: "Sur 11 bureaux" },
    ],
    panels: [
      {
        type: "table",
        title: "Rapports en attente de validation",
        link: "Tout voir",
        headers: ["Rapport", "Bureau", "Soumis par", "Statut"],
        rows: [
          [
            { text: "Bilan trimestriel Q3" },
            { text: "Gestion Financière", muted: true },
            { text: "A. Diallo", muted: true },
            { tag: "attente", label: "En attente" },
          ],
          [
            { text: "Session concours — clôture" },
            { text: "Examens et Concours", muted: true },
            { text: "M. Cissé", muted: true },
            { tag: "attente", label: "En attente" },
          ],
          [
            { text: "Rapport de mission — zone Nord" },
            { text: "Suivi-Évaluation", muted: true },
            { text: "F. Bah", muted: true },
            { tag: "cours", label: "En révision" },
          ],
          [
            { text: "Inventaire matériel annuel" },
            { text: "Gestion Matérielle", muted: true },
            { text: "S. Kane", muted: true },
            { tag: "ok", label: "Validé" },
          ],
        ],
      },
      {
        type: "people",
        title: "Inspecteurs de district",
        items: [
          { initials: "MB", name: "Moussa Barry", meta: "3 bureaux assignés" },
          { initials: "AC", name: "Aïcha Camara", meta: "4 bureaux assignés" },
          { initials: "OS", name: "Oumar Sylla", meta: "2 bureaux assignés" },
        ],
      },
    ],
  },
  chef: {
    title: "Validation transversale",
    sub: "Tous les bureaux — samedi 12 septembre 2026",
    foot: "IEF — Chef Admin",
    activeBureaux: null,
    banner: {
      tone: "teal",
      text: "Vue élargie sur les 11 bureaux — droits de validation transversale, en tant qu'IEF (Inspecteur/trice de l'Éducation et de la Formation). Pas de gestion des comptes/rôles (réservée au Super Admin).",
    },
    kpis: [
      { label: "Rapports à valider", value: "14", delta: "4 en retard", warn: true },
      { label: "Validations ce mois", value: "37", delta: "Sur 11 bureaux" },
      { label: "Bureaux en alerte", value: "2", delta: "Retards répétés", warn: true },
      { label: "Inspecteurs actifs", value: "3", delta: "2 à 5 prévus" },
    ],
    panels: [
      {
        type: "table",
        title: "File de validation transversale",
        link: "Tout voir",
        headers: ["Rapport", "Bureau", "Statut"],
        rows: [
          [
            { text: "Bilan trimestriel Q3" },
            { text: "Gestion Financière", muted: true },
            { tag: "attente", label: "À valider" },
          ],
          [
            { text: "Session concours — clôture" },
            { text: "Examens et Concours", muted: true },
            { tag: "attente", label: "À valider" },
          ],
          [
            { text: "Rapport de mission — zone Nord" },
            { text: "Suivi-Évaluation", muted: true },
            { tag: "cours", label: "En révision" },
          ],
          [
            { text: "Bilan communication trimestriel" },
            { text: "Communication & Partenariats", muted: true },
            { tag: "ok", label: "Validé" },
          ],
        ],
      },
      {
        type: "named",
        title: "Performance par bureau",
        items: [
          { name: "Gestion Financière", meta: "3 rapports en retard" },
          { name: "Examens et Concours", meta: "1 rapport en retard" },
          { name: "Ressources Humaines", meta: "À jour" },
          { name: "Bureau Genre", meta: "À jour" },
        ],
      },
    ],
  },
  secretaire: {
    title: "Espace Secrétaire Général",
    sub: "Adjoint du Chef Admin — samedi 12 septembre 2026",
    foot: "Secrétaire Général",
    activeBureaux: null,
    kpis: [
      { label: "Rapports à valider", value: "14", delta: "4 en retard", warn: true },
      { label: "Validations ce mois", value: "37", delta: "Sur 11 bureaux" },
      { label: "Bureaux en alerte", value: "2", delta: "Retards répétés", warn: true },
    ],
    panels: [],
  },
  inspecteur: {
    title: "Supervision des bureaux assignés",
    sub: "3 bureaux — samedi 12 septembre 2026",
    foot: "Inspecteur de district",
    activeBureaux: ["1", "8", "9"],
    banner: {
      tone: "teal",
      text: "Vous supervisez 3 bureaux assignés : Gestion Financière, Examens et Concours, Bureau Genre.",
    },
    kpis: [
      { label: "Bureaux supervisés", value: "3", delta: "Sur 11 au total" },
      { label: "Dossiers à contrôler", value: "9", delta: "Répartis sur 3 bureaux" },
      { label: "Rapports en attente", value: "4", delta: "2 en retard", warn: true },
      { label: "Contrôles effectués ce mois", value: "11", delta: "Bon rythme" },
    ],
    panels: [
      {
        type: "table",
        title: "Activité des bureaux assignés",
        headers: ["Bureau", "Dossiers en cours", "Rapports en attente", "Dernier contrôle"],
        rows: [
          [
            { text: "Gestion Financière" },
            { text: "12", muted: true },
            { text: "3", muted: true },
            { text: "5 sept.", muted: true },
          ],
          [
            { text: "Examens et Concours" },
            { text: "8", muted: true },
            { text: "1", muted: true },
            { text: "2 sept.", muted: true },
          ],
          [
            { text: "Bureau Genre" },
            { text: "4", muted: true },
            { text: "0", muted: true },
            { text: "10 sept.", muted: true },
          ],
        ],
      },
    ],
  },
  responsable: {
    title: "Tableau de bord — Ressources Humaines",
    sub: "Bureau n°7 — samedi 12 septembre 2026",
    foot: "Responsable de bureau",
    activeBureaux: ["7"],
    banner: {
      tone: "teal",
      text: "Vous consultez le bureau Ressources Humaines — les données sont limitées à ce périmètre.",
    },
    kpis: [
      { label: "Agents du bureau", value: "7", delta: "Tous actifs" },
      { label: "Dossiers en cours", value: "19", delta: "+2 cette semaine" },
      { label: "Rapports à valider", value: "3", delta: "1 en retard", warn: true },
      { label: "Échéance la plus proche", value: "4 j", delta: "Bilan mensuel" },
    ],
    panels: [
      {
        type: "table",
        title: "Dossiers du bureau",
        link: "+ Nouveau dossier",
        headers: ["Dossier", "Responsable", "Statut"],
        rows: [
          [
            { text: "Recrutement — poste comptable" },
            { text: "N. Touré", muted: true },
            { tag: "cours", label: "En cours" },
          ],
          [
            { text: "Renouvellement contrats saisonniers" },
            { text: "H. Diakité", muted: true },
            { tag: "attente", label: "À traiter" },
          ],
          [
            { text: "Dossier disciplinaire #12" },
            { text: "Vous", muted: true },
            { tag: "cours", label: "En cours" },
          ],
          [
            { text: "Formation continue — module Q3" },
            { text: "N. Touré", muted: true },
            { tag: "ok", label: "Clôturé" },
          ],
        ],
      },
      {
        type: "people",
        title: "Agents du bureau",
        items: [
          { initials: "NT", name: "Nafi Touré", meta: "Saisie & validation partielle" },
          { initials: "HD", name: "Hawa Diakité", meta: "Saisie" },
          { initials: "IK", name: "Ibrahima Konaté", meta: "Lecture seule" },
        ],
      },
    ],
  },
  agent: {
    title: "Mes tâches",
    sub: "Examens et Concours — samedi 12 septembre 2026",
    foot: "Agent de bureau",
    activeBureaux: ["8"],
    banner: {
      tone: "teal",
      text: "Vous consultez vos tâches dans Examens et Concours — droits : saisie.",
    },
    kpis: [
      { label: "Dossiers qui vous sont assignés", value: "5", delta: "Aucun retard" },
      { label: "Rapports à rédiger", value: "1", delta: "Échéance : 15 sept.", warn: true },
      { label: "Tâches terminées ce mois", value: "12", delta: "Bon rythme" },
    ],
    panels: [
      {
        type: "table",
        title: "Mes dossiers",
        headers: ["Dossier", "Échéance", "Statut"],
        rows: [
          [
            { text: "Candidats session Octobre — vérification pièces" },
            { text: "18 sept.", muted: true },
            { tag: "cours", label: "En cours" },
          ],
          [
            { text: "Mise à jour liste des jurys" },
            { text: "22 sept.", muted: true },
            { tag: "attente", label: "À faire" },
          ],
          [
            { text: "Archivage session Juin" },
            { text: "—", muted: true },
            { tag: "ok", label: "Terminé" },
          ],
        ],
      },
    ],
  },
  rh: {
    title: "Personnel — vue transversale",
    sub: "",
    foot: "Ressources Humaines",
    activeBureaux: ["7"],
    kpis: [
      { label: "Personnel bureaux IEF", value: "22", delta: "12 bureaux" },
      { label: "Personnel écoles", value: "772", delta: "51 écoles" },
      { label: "Départs / mutés", value: "206", delta: "Hors personnel actif" },
      { label: "Dossiers RH en cours", value: "19", delta: "Bureau RH uniquement" },
    ],
    panels: [
      {
        type: "table",
        title: "Répartition des écoles par cycle",
        headers: ["Cycle", "Nombre d'écoles"],
        rows: [
          [{ text: "Élémentaire" }, { text: "46" }],
          [{ text: "Collège" }, { text: "12" }],
          [{ text: "Préscolaire" }, { text: "9" }],
          [{ text: "Daara Moderne" }, { text: "1" }],
          [{ text: "Total", muted: false }, { text: "68" }],
        ],
      },
      {
        type: "table",
        title: "Personnel — bureaux IEF",
        link: "Exporter",
        headers: ["Bureau", "Effectif"],
        rows: [
          [{ text: "Gestion Financière" }, { text: "1", muted: true }],
          [{ text: "Gestion Matérielle" }, { text: "1", muted: true }],
          [{ text: "Secrétariat" }, { text: "1", muted: true }],
          [{ text: "Suivi-Évaluation" }, { text: "1", muted: true }],
          [{ text: "Planification & Statistiques" }, { text: "1", muted: true }],
          [{ text: "Correspondant Numérique" }, { text: "1", muted: true }],
          [{ text: "Ressources Humaines" }, { text: "6", muted: true }],
          [{ text: "Examens et Concours" }, { text: "2", muted: true }],
          [{ text: "Bureau Genre" }, { text: "1", muted: true }],
          [{ text: "Communication & Partenariats" }, { text: "1", muted: true }],
          [{ text: "Enseignement Arabe" }, { text: "2", muted: true }],
          [{ text: "Personnel Subalterne" }, { text: "4", muted: true }],
        ],
      },
      {
        type: "table",
        title: "Personnel — écoles de la circonscription",
        link: "Voir les 38 écoles",
        headers: ["École", "Cycle", "Effectif enseignant", "Postes vacants"],
        rows: [
          [
            { text: "École primaire de Sabalibougou" },
            { text: "Élémentaire", muted: true },
            { text: "14", muted: true },
            { text: "2", muted: true },
          ],
          [
            { text: "Collège de Kalaban-Coro" },
            { text: "Collège", muted: true },
            { text: "22", muted: true },
            { text: "0", muted: true },
          ],
          [
            { text: "Préscolaire Niamakoro" },
            { text: "Préscolaire", muted: true },
            { text: "6", muted: true },
            { text: "1", muted: true },
          ],
          [
            { text: "Daara Moderne Centre" },
            { text: "Daara Moderne", muted: true },
            { text: "9", muted: true },
            { text: "0", muted: true },
          ],
          [
            { text: "EFA Régional" },
            { text: "EFA", muted: true },
            { text: "17", muted: true },
            { text: "1", muted: true },
          ],
        ],
      },
    ],
    fullWidth: [1, 2],
  },
};