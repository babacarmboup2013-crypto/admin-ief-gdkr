/**
 * Import complet des courriers confidentiels KoboToolbox vers l'application.
 *
 * Source : « Système Archivage Electronique des Courriers Confidentiels
 * de l'IEF Grand Dakar » — asset Kobo asDcUACkM4GWMhi4xK8Kpy (84 soumissions).
 *
 * Le script :
 *  1. récupère les 84 soumissions via l'API Kobo publique ;
 *  2. télécharge les 24 pièces jointes et les envoie dans le bucket
 *     Storage `courriers` (préfixe `kobo_conf_` pour éviter tout conflit) ;
 *  3. génère un SQL autonome à coller dans le SQL Editor Supabase :
 *     ajout de la colonne `nature_confidentielle`, insertion des 84
 *     courriers et renseignement des 24 chemins de fichiers.
 *
 * Usage :  node scripts/import-kobo-courriers-confidentiels.mjs
 * Sortie : supabase/import-courriers-confidentiels.sql
 *
 * Les clés Supabase sont lues depuis .env.local (jamais commité).
 * Le SQL généré est idempotent : `on conflict (kobo_id) do nothing`.
 */
import { readFileSync, writeFileSync } from "node:fs";

const ASSET_UID = "asDcUACkM4GWMhi4xK8Kpy";
const KOBO_BASE = `https://kf.kobotoolbox.org/api/v2/assets/${ASSET_UID}`;
const SUPER_ADMIN_UID = "00000000-0000-4000-8000-000000000016";
const BUREAU_SECRETARIAT = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function envValue(name) {
  if (process.env[name]) return process.env[name];
  try {
    const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = content.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    // .env.local absent : l'environnement fera foi
  }
  return "";
}

const SUPABASE_URL = envValue("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY = envValue("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis");
}

// Codes Kobo -> libellés exacts du formulaire confidentiel
const TRANSMISSIONS = {
  ief: "IEF",
  secretaire_general: "SECRETAIRE GENERAL",
  secretariat_particulier: "SECRETARIAT PARTICULIER",
  gestionnaire_chargee_des_finances: "GESTIONNAIRE CHARGEE DES FINANCES",
  comptable_des_matieres: "COMPTABLE DES MATIERES",
  suivi_evaluation: "SUIVI-EVALUATION",
  planificateur: "PLANIFICATEUR",
  correspondant_numerique: "CORRESPONDANT NUMERIQUE",
  conseiller_pedagogique: "CONSEILLER PEDAGOGIQUE",
  brh_chargee_personnel: "BRH CHARGEE PERSONNEL",
  brh_chargee_carriere: "BRH CHARGEE CARRIERE",
  inspecteur_kane_arabe: "INSPECTEUR KANE ARABE",
  inspecteur_yade: "INSPECTEUR YADE",
  inspecteur_faye: "INSPECTEUR FAYE",
  inspectrice_therese: "INSPECTRICE THERESE",
  charge_communication: "CHARGE COMMUNICATION",
  chargee_partenariat: "CHARGEE PARTENARIAT",
  bexco_charge_elementaire_examens_profess:
    "BEXCO CHARGE ELEMENTAIRE/EXAMENS PROFESSIONNELS",
  bexco_charge_enseignment_moyen_general:
    "BEXCO CHARGE ENSEIGNMENT MOYEN GENERAL",
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

// 1. Récupération des soumissions
const all = [];
let page = 0;
while (true) {
  const url = `${KOBO_BASE}/data.json?limit=100&start=${page * 100}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Kobo HTTP ${response.status} sur ${url}`);
  const json = await response.json();
  all.push(...json.results);
  if (!json.next) break;
  page += 1;
}
console.log(`${all.length} soumissions récupérées depuis Kobo.`);

// 2. Upload des pièces jointes
const chemins = new Map();
let uploaded = 0;
let skipped = 0;
let bytesTotal = 0;

for (const submission of all) {
  const attachment = submission._attachments?.[0];
  if (!attachment?.download_url) continue;

  const koboId = submission._id;
  const nom = attachment.media_file_basename || "courrier.pdf";
  const safe = nom.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const path = `${SUPER_ADMIN_UID}/kobo_conf_${koboId}_${safe}`;

  const fileResponse = await fetch(attachment.download_url);
  if (!fileResponse.ok) {
    console.warn(`! téléchargement impossible pour ${koboId} (${fileResponse.status})`);
    skipped += 1;
    continue;
  }
  const fileBytes = Buffer.from(await fileResponse.arrayBuffer());
  if (fileBytes.length > MAX_FILE_SIZE) {
    console.warn(`! fichier > 10 Mo ignoré pour ${koboId}`);
    skipped += 1;
    continue;
  }

  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/courriers/${encodeURI(path)}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": attachment.mimetype || "application/pdf",
        "x-upsert": "true",
      },
      body: fileBytes,
    }
  );
  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    console.warn(`! upload impossible pour ${koboId} : ${detail.slice(0, 160)}`);
    skipped += 1;
    continue;
  }

  chemins.set(koboId, { path, nom });
  uploaded += 1;
  bytesTotal += fileBytes.length;
}
console.log(
  `${uploaded} PDF importés (${(bytesTotal / 1024 / 1024).toFixed(1)} Mo), ${skipped} ignorés.`
);

// 3. Génération du SQL autonome
const lines = [
  "-- ============================================================",
  "-- Import des courriers confidentiels depuis KoboToolbox",
  "-- Généré par scripts/import-kobo-courriers-confidentiels.mjs",
  "-- Formulaire : Système Archivage Electronique des Courriers",
  "--              Confidentiels de l'IEF Grand Dakar",
  "-- Asset Kobo : asDcUACkM4GWMhi4xK8Kpy (84 soumissions)",
  "-- ============================================================",
  "",
  "begin;",
  "",
  "alter table public.courriers add column if not exists nature_confidentielle text;",
  "",
];

for (const r of all) {
  const koboId = Number(r._id);
  const date = r.Entrez_une_date || null;
  const reference = r.Entrez_le_num_ro_le_r_f_rence ?? "";
  const objet = r.Objet_Courrier ?? "";
  const nature = r.Nature_du_Courrier || null;
  const expediteur =
    nature === "arriv_e_confidentiel" ? r.Exp_diteur || null : null;
  const destinataire =
    nature === "d_part_confidentiel" ? r.Destinataire || null : null;
  const transmission = decodeTransmission(r.TRANSMISSION_INTERNE);
  const fichierNom = r.Chargez_le_fichier || null;
  const uuid = r._uuid || null;
  const pj = chemins.get(koboId);

  lines.push(
    `insert into public.courriers (` +
      `kobo_id, kobo_uuid, date_courrier, numero_reference, objet, ` +
      `type_courrier, nature_confidentielle, expediteur, destinataire, ` +
      `transmission_interne, fichier_nom, fichier_path, statut, ` +
      `bureau_id, saisi_par` +
      `) values (` +
      [
        String(koboId),
        q(uuid),
        q(date),
        q(reference),
        q(objet),
        q("confidentiel"),
        q(nature),
        q(expediteur),
        q(destinataire),
        pgArray(transmission),
        q(fichierNom),
        pj ? q(pj.path) : "NULL",
        q("soumis"),
        String(BUREAU_SECRETARIAT),
        q(SUPER_ADMIN_UID),
      ].join(", ") +
      `) on conflict (kobo_id) do nothing;`
  );
}

lines.push("", "commit;", "");
lines.push("", "-- FIN DU SCRIPT — ne rien copier apres cette ligne");
lines.push("notify pgrst, 'reload schema';", "");

const outFile = new URL(
  "../supabase/import-courriers-confidentiels.sql",
  import.meta.url
);
writeFileSync(outFile, lines.join("\n"), "utf8");
console.log(`SQL généré : ${outFile.pathname}`);
