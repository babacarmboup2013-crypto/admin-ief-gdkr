#!/usr/bin/env node
/*
 * Reconstruit les imports SQL (0006 écoles + 0007 personnel) à partir des
 * fichiers consolidés par feuille (scripts/output/*.import.jsonl).
 * Usage : node scripts/rebuild_import_sql.mjs
 * Sorties : migrations 0006/0007 + personnel.consolidee.jsonl + ecoles.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(appDir, 'scripts', 'output');
const migDir = path.join(appDir, 'supabase', 'migrations');

const SHEETS = ['ief', 'elementaire', 'college', 'ctp', 'daara', 'ort', 'depart2022', 'depart2023'];

const fix = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : null);
const isIEFRef = (n) => /^I\.?E\.?F\s*\/?\s*GD$/i.test(fix(n) || '');

function cycleFromName(n) {
  const u = (n || '').toUpperCase();
  if (/CEM|COLL[ÈE]GE|LY[CK][EÉ]E/.test(u)) return 'collège';
  if (/CTP|ORT|MATERN|PRESCOLAIRE|CASE/.test(u)) return 'préscolaire';
  if (/DAARA/.test(u)) return 'daara_moderne';
  if (/EFA/.test(u)) return 'efa';
  return 'élémentaire';
}

function inferCycleFromCorps(corps) {
  const c = (corps || '').toUpperCase();
  if (/PEM|PES|PEPS|PCEM|PCM\b|PCEMG|PCE\b|PCMGD|PC\M/.test(c)) return 'collège';
  if (/ORT|MATERN|PRESCOLAIRE|CTP/.test(c)) return 'préscolaire';
  if (/DAARA/.test(c)) return 'daara_moderne';
  return 'élémentaire';
}

const sqlVal = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

function genEcolesSql(schoolsArr) {
  const values = schoolsArr
    .map((s) => `  (${sqlVal(s.nom)}, ${sqlVal(s.cycle)}, ${sqlVal(s.localisation)})`)
    .join(',\n');
  return `-- ============================================================\n-- IEF ADMIN - Import des ecoles (genere automatiquement)\n-- ${new Date().toISOString()}\n-- ============================================================\n\ninsert into public.ecoles (nom, cycle, localisation)\nvalues\n${values}\non conflict (nom) do nothing;\n`;
}

function genPersonnelSql(finalRecs) {
  const bureauRH = `(select id from public.bureaux where nom = 'Ressources Humaines' order by id limit 1)`;
  const fallback = (cycle) => `(select id from public.ecoles where nom = ${sqlVal(`(Non precisee - ${cycle})`)} order by id limit 1)`;
  const ecoleExpr = (r) => {
    if (!r.ecole) return 'NULL';
    const direct = `(select id from public.ecoles where nom = ${sqlVal(r.ecole)} order by id limit 1)`;
    return `coalesce(${direct}, ${fallback(r.cycle || cycleFromName(r.ecole))})`;
  };
  const values = finalRecs
    .map((r) => {
      const cols = [
        r.bureau ? bureauRH : 'NULL',
        ecoleExpr(r),
        sqlVal([r.prenom, r.nom].filter(Boolean).join(' ')),
        sqlVal(r.fonction),
        sqlVal(r.statut),
        sqlVal(r.depart_annee),
        sqlVal(r.source),
        sqlVal(r.motif_depart),
        sqlVal(r.sexe),
        sqlVal(r.date_naissance),
        sqlVal(r.lieu_naissance),
        sqlVal(r.corps),
        sqlVal(r.grade),
        sqlVal(r.discipline),
        sqlVal(r.diplome_academique),
        sqlVal(r.diplome_professionnel),
        sqlVal(r.anc_ens),
        sqlVal(r.anc_poste),
        sqlVal(r.telephone),
        sqlVal(r.email),
        sqlVal(r.cni),
        sqlVal(r.sit_matrimoniale),
        sqlVal(r.nb_enfants),
        sqlVal(r.os_arrivee),
        sqlVal(r.matricule),
      ];
      return `  (${cols.join(', ')})`;
    })
    .join(',\n');
  return `-- ============================================================\n-- IEF ADMIN - Import du personnel (genere automatiquement)\n-- ${new Date().toISOString()}\n-- ============================================================\n\ninsert into public.personnel\n  (bureau_id, ecole_id, nom_complet, fonction, statut,\n   depart_annee, source_feuille, motif_depart, sexe, date_naissance,\n   lieu_naissance, corps, grade, discipline, diplome_academique,\n   diplome_professionnel, anciennete_enseignement, anciennete_poste,\n   telephone, email, n_cni, sit_matrimoniale, nb_enfants, os_arrivee,\n   matricule)\nvalues\n${values}\non conflict (matricule) where matricule is not null do nothing;\n`;
}

let records = [];
const counts = {};
for (const id of SHEETS) {
  const rows = fs
    .readFileSync(path.join(outDir, `${id}.import.jsonl`), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
  for (const r of rows) {
    counts[r.source] = (counts[r.source] || 0) + 1;
    if (r.bureau) r.cycle = null;
    if (!r.ecole && !r.bureau) {
      const c = r.cycle || inferCycleFromCorps(r.corps) || 'élémentaire';
      r.cycle = c;
      r.ecole = `(Non precisee - ${c})`;
    } else if (r.ecole && isIEFRef(r.ecole)) {
      r.bureau = 'Ressources Humaines';
      r.ecole = null;
      r.cycle = null;
    } else if (r.ecole) {
      r.cycle = r.cycle || cycleFromName(r.ecole);
    }
    records.push(r);
  }
}

records = records.filter((r) => r.prenom);

/* dédup par matricule :
   - 'NI' (placeholder) => matricule nullé : chaque personne est conservée
   - même nom au sein du groupe => même agent : préférer 'actif', les départ
     verse leurs champs départ sur la ligne conservée
   - noms différents => individus distincts : tous conservés, seul le premier
     (ordre des feuilles) garde le matricule, les autres le voient nullé */
const normName = (r) => ((r.prenom || '') + ' ' + (r.nom || '')).toUpperCase().replace(/[^A-ZÀ-Ý0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const isNI = (m) => !!m && /^N\s*I\s*$/i.test(m);
const keyOf = (r) => (!r.matricule ? null : isNI(r.matricule) ? '__NI__' : r.matricule.toUpperCase().replace(/\s+/g, ''));

const groups = new Map();
for (const r of records) {
  const k = keyOf(r);
  if (!k) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
const finalRecs = [];
const seen = new Set();
let dupCount = 0;
for (const r of records) {
  const k = keyOf(r);
  if (!k) { finalRecs.push(r); continue; }
  if (seen.has(k)) { dupCount++; continue; }
  seen.add(k);
  const arr = groups.get(k);
  const sameName = normName(arr[0]) === normName(arr[arr.length - 1]);
  if (arr.length === 1 || sameName) {
    const best = arr.slice().sort((a, b) => (a.statut === 'actif' ? -1 : 1) - (b.statut === 'actif' ? -1 : 1))[0];
    if (best.statut === 'actif') {
      const dep = arr.find((x) => x.statut === 'inactif');
      if (dep) { best.motif_depart = best.motif_depart ?? dep.motif_depart; best.depart_annee = best.depart_annee ?? dep.depart_annee; }
    }
    finalRecs.push(best);
  } else {
    /* individus distincts partageant un matricule : tous conservés,
       seul le premier (ordre des feuilles) garde le matricule */
    arr.forEach((member, i) => {
      finalRecs.push(i === 0 ? member : { ...member, matricule: null });
      if (i > 0) dupCount++;
    });
  }
}

/* recensement des écoles */
const schools = new Map();
const addSchool = (name, cycle, localisation, source) => {
  const norm = fix(name)?.toUpperCase().replace(/\s+/g, ' ');
  if (!norm) return;
  if (!schools.has(norm)) schools.set(norm, { nom: fix(name), cycle, localisation: null, sources: [] });
  const s = schools.get(norm);
  if (localisation && !s.localisation) s.localisation = fix(localisation);
  if (!s.sources.includes(source)) s.sources.push(source);
};
for (const r of finalRecs) if (r.ecole) addSchool(r.ecole, r.cycle || cycleFromName(r.ecole), r.localisation || null, r.source);
const schoolsArr = [...schools.values()].sort((a, b) => a.nom.localeCompare(b.nom));

/* écritures */
fs.writeFileSync(path.join(outDir, 'personnel.consolidee.jsonl'), finalRecs.map((r) => JSON.stringify(r)).join('\n'), 'utf8');
fs.writeFileSync(path.join(outDir, 'ecoles.json'), JSON.stringify(schoolsArr, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ generatedAt: new Date().toISOString(), totalRecords: finalRecs.length, preDedup: records.length, counts, duplicataMatricule: dupCount }, null, 2), 'utf8');
fs.writeFileSync(path.join(migDir, '0006_import_ecoles.sql'), genEcolesSql(schoolsArr), 'utf8');
fs.writeFileSync(path.join(migDir, '0007_import_personnel.sql'), genPersonnelSql(finalRecs), 'utf8');

console.log(JSON.stringify({ total: finalRecs.length, preDedup: records.length, dup: dupCount, ecoles: schoolsArr.length, counts }, null, 2));