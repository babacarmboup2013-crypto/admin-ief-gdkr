/**
 * Importe les pièces jointes PDF des soumissions KoboToolbox vers le bucket
 * Supabase Storage `courriers`, puis génère le SQL qui renseigne `fichier_path`.
 *
 * Usage :  node scripts/import-kobo-pieces-jointes.mjs
 * Sortie : supabase/migrations/0015_import_courriers_pj.sql
 *
 * Les clés Supabase sont lues depuis .env.local (jamais commité) ou depuis
 * l'environnement. Le script est idempotent : les fichiers existants sont
 * écrasés (x-upsert) et le SQL utilise `where kobo_id = ...`.
 */
import { readFileSync, writeFileSync } from "node:fs";

const ASSET_UID = "aeBe2srZph2Yn4vbUVKZ8g";
const KOBO_BASE = `https://kf.kobotoolbox.org/api/v2/assets/${ASSET_UID}`;
const SUPER_ADMIN_UID = "00000000-0000-4000-8000-000000000016";

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

const all = [];
let page = 0;
while (true) {
  const response = await fetch(`${KOBO_BASE}/data.json?limit=100&start=${page * 100}`);
  if (!response.ok) throw new Error(`Kobo HTTP ${response.status}`);
  const json = await response.json();
  all.push(...json.results);
  if (!json.next) break;
  page += 1;
}

const sql = [
  "-- ============================================================",
  "-- Pièces jointes des courriers KoboToolbox -> Storage Supabase",
  "-- Généré par scripts/import-kobo-pieces-jointes.mjs",
  "-- ============================================================",
  "",
  "begin;",
  "",
];
let uploaded = 0;
let skipped = 0;
let bytesTotal = 0;

for (const submission of all) {
  const attachment = submission._attachments?.[0];
  if (!attachment?.download_url) continue;

  const koboId = submission._id;
  const nom = attachment.media_file_basename || "courrier.pdf";
  const safe = nom.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const path = `${SUPER_ADMIN_UID}/kobo_${koboId}_${safe}`;

  const fileResponse = await fetch(attachment.download_url);
  if (!fileResponse.ok) {
    console.warn(`! téléchargement impossible pour ${koboId} (${fileResponse.status})`);
    skipped += 1;
    continue;
  }
  const fileBytes = Buffer.from(await fileResponse.arrayBuffer());
  if (fileBytes.length > 10 * 1024 * 1024) {
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

  const escaped = path.replaceAll("'", "''");
  const escapedName = nom.replaceAll("'", "''");
  sql.push(
    `update public.courriers set fichier_path = '${escaped}', ` +
      `fichier_nom = '${escapedName}' where kobo_id = ${koboId};`
  );
  uploaded += 1;
  bytesTotal += fileBytes.length;
  if (uploaded % 10 === 0) console.log(`${uploaded} pièces jointes importées…`);
}

sql.push("", "commit;", "");
writeFileSync(
  new URL("../supabase/migrations/0015_import_courriers_pj.sql", import.meta.url),
  sql.join("\n"),
  "utf8"
);
console.log(
  `Terminé : ${uploaded} PDF importés (${(bytesTotal / 1024 / 1024).toFixed(1)} Mo), ${skipped} ignorés.`
);
