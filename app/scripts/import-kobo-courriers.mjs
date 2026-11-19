/**
 * Génère le SQL d'import des soumissions KoboToolbox dans la table `courriers`.
 *
 * Source : formulaire « Système Archivage Electronique des Courriers Ordinaires
 * de l'IEF Grand Dakar » — asset Kobo aeBe2srZph2Yn4vbUVKZ8g (188 soumissions).
 *
 * Usage :  node scripts/import-kobo-courriers.mjs
 * Sortie : supabase/migrations/0014_import_courriers_kobo.sql
 *
 * Le SQL généré est idempotent : `on conflict (kobo_id) do nothing`.
 */
import { writeFileSync } from "node:fs";

const ASSET_UID = "aeBe2srZph2Yn4vbUVKZ8g";
const BASE = `https://kf.kobotoolbox.org/api/v2/assets/${ASSET_UID}`;

const SUPER_ADMIN_UID = "00000000-0000-4000-8000-000000000016";
const BUREAU_SECRETARIAT = 3;

// codes Kobo -> libellés affichés dans l'application
const TRANSMISSIONS = {
  ief: "IEF",
  secretaire_general: "SECRETAIRE GENERAL",
  secretariat_particulier: "SECRETARIAT PARTICULIER",
  gestionnaire_chargee_des_finances: "GESTIONNAIRE CHARGEE DES FINANCES",
  comptable_des_matieres: "COMPTABLE DES MATIERES",
  suivie_valuation: "SUIVIE-VALUATION",
  planificateur: "PLANIFICATEUR",
  correspondant_numerique: "CORRESPONDANT NUMERIQUE",
  conseiller_pedagogique: "CONSEILLER PEDAGOGIQUE",
  brh_chargee_personnel: "BRH CHARGEE PERSONNEL",
  brh_chargee_carriere: "BRH CHARGEE CARRIERE",
  inspecteur_arabe: "INSPECTEUR ARABE",
  inspecteur_yade: "INSPECTEUR YADE",
  inspecteur_faye: "INSPECTEUR FAYE",
  inspectrice_therese: "INSPECTRICE THERESE",
  charge_communication: "CHARGE COMMUNICATION",
  chargee_partenariat: "CHARGEE PARTENARIAT",
  bexco_charge_elemetaire_examens_professi:
    "BEXCO CHARGE ELEMETAIRE/EXAMENS PROFESSIONNEL",
  bexco_charge_enseignement_moyen_general:
    "BEXCO CHARGE ENSEIGNEMENT MOYEN GENERAL",
};

const q = (value) => {
  if (value == null || value === "") return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
};

const decodeTransmission = (raw) => {
  if (!raw) return [];
  return String(raw)
    .split(/\s+/)
    .filter(Boolean)
    .map((code) => TRANSMISSIONS[code] ?? code);
};

const pgArray = (values) =>
  values.length === 0
    ? "ARRAY[]::text[]"
    : `ARRAY[${values.map(q).join(", ")}]::text[]`;

const all = [];
let page = 0;
while (true) {
  const url = `${BASE}/data.json?limit=100&start=${page * 100}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`);
  const json = await response.json();
  all.push(...json.results);
  if (!json.next) break;
  page += 1;
}

const lines = [
  "-- ============================================================",
  "-- Import des 188 courriers ordinaires depuis KoboToolbox",
  "-- Généré par scripts/import-kobo-courriers.mjs",
  "-- Formulaire : Système Archivage Electronique des Courriers",
  "--              Ordinaires de l'IEF Grand Dakar",
  "-- ============================================================",
  "",
  "begin;",
  "",
];

for (const r of all) {
  const koboId = Number(r._id);
  const date = r.Enter_a_date || null;
  const reference = r.Entrer_le_num_ro_de_r_f_rence ?? "";
  const objet = r.Objet_Courrier ?? "";
  const type = r.Type_de_Courrier === "ordinaire" ? "ordinaire" : "ordinaire";
  const nature = r.Nature_Ordinaire || null;
  const expediteur = r.Exp_diteur_simple || null;
  const destinataire = r.Destinataire_simple || null;
  const transmission = decodeTransmission(r.Transmission_Interne);
  const fichierNom = r.Chargez_le_fichier || null;
  const uuid = r._uuid || null;

  lines.push(
    `insert into public.courriers (` +
      `kobo_id, kobo_uuid, date_courrier, numero_reference, objet, ` +
      `type_courrier, nature_ordinaire, expediteur, destinataire, ` +
      `transmission_interne, fichier_nom, statut, bureau_id, saisi_par` +
      `) values (` +
      [
        String(koboId),
        q(uuid),
        q(date),
        q(reference),
        q(objet),
        q(type),
        q(nature),
        q(expediteur),
        q(destinataire),
        pgArray(transmission),
        q(fichierNom),
        q("soumis"),
        String(BUREAU_SECRETARIAT),
        q(SUPER_ADMIN_UID),
      ].join(", ") +
      `) on conflict (kobo_id) do nothing;`
  );
}

lines.push("", "commit;", "");

const outFile = new URL(
  "../supabase/migrations/0014_import_courriers_kobo.sql",
  import.meta.url
);
writeFileSync(outFile, lines.join("\n"), "utf8");

console.log(`${all.length} courriers générés dans ${outFile.pathname}`);
