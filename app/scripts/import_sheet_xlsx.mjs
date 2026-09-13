#!/usr/bin/env node
/*
 * Importeur d'une feuille XLSX (export par feuille fourni par l'utilisateur).
 * Lit sharedStrings.xml + sheet1.xml et applique la cartographie par feuille.
 * Usage : node scripts/import_sheet_xlsx.mjs <chemin|xlsx|zip> --sheet=<ief|elementaire|college|ort|ctp|daara|depart2022|depart2023>
 * Sortie : scripts/output/<sheet>.import.jsonl + rapport console.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const fileArg = args.find((a) => !a.startsWith('--'));
const sheetArg = args.find((a) => a.startsWith('--sheet='));
const sheetId = sheetArg ? sheetArg.split('=')[1] : null;
if (!fileArg || !sheetId) {
  console.error("Usage: node scripts/import_sheet_xlsx.mjs <fichier> --sheet=<id>");
  process.exit(1);
}

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(appDir, 'scripts', 'output');
fs.mkdirSync(outDir, { recursive: true });

/* ------------------------------- helpers ------------------------------- */
const fix = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : null);

function normSexe(v) {
  if (!v) return null;
  const s = fix(v).toLowerCase();
  if (/^(masculin|m|h|homme|male)$/.test(s)) return 'M';
  if (/^(f[ée]?minin|f|femme|female)$/.test(s)) return 'F';
  return null;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const serialToIso = (n) => new Date(EXCEL_EPOCH + n * 86400000).toISOString().slice(0, 10);

function parseDate(v) {
  if (!v) return null;
  const s = fix(v);
  if (!s || s.length < 4) return null;
  if (/^\d+(\.0)?$/.test(s)) {
    const n = Number(s);
    if (n >= 10000 && n <= 90000) return serialToIso(n);
    return null;
  }
  const m = s.match(/(\d{1,2})\s*[/.\-]+\s*(\d{1,2})(?:\s*[/.\-]+\s*|\s+)(\d{2,4})/);
  if (m) {
    let d = +m[1], mo = +m[2], y = +m[3];
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    if (y >= 1940 && y <= 2060 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

function cleanEmail(v) {
  if (!v) return null;
  let s = fix(v);
  s = s.replace(/\s+/g, '').replace(/,/g, '.');
  const m = s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(?:com|fr|sn|net|org|ml|edu|io|gmail)/i);
  return m ? m[0].toLowerCase() : null;
}

const parseNb = (v) => (/^\d+$/.test(fix(v) ?? '') ? parseInt(fix(v), 10) : null);
const cleanTel = (v) => (v ? fix(v) : null);
const rawStr = (v) => (typeof v === 'string' ? v : String(v));

function looksSchool(v) {
  if (!v) return false;
  const s = fix(v);
  if (!s || s.length < 3) return false;
  if (/^[\d\s/.,\-]+$/.test(s) || /^NI$/i.test(s)) return false;
  return /[A-Za-zÀ-ÿ]/.test(s);
}

function cycleFromName(n) {
  const u = (n || '').toUpperCase();
  if (/CEM|COLL[ÈE]GE|LY[CK][EÉ]E/.test(u)) return 'collège';
  if (/CTP|ORT|MATERN|PRESCOLAIRE|CASE/.test(u)) return 'préscolaire';
  if (/DAARA/.test(u)) return 'daara_moderne';
  if (/EFA/.test(u)) return 'efa';
  return 'élémentaire';
}

function normSitMat(v) {
  if (!v) return null;
  const s = fix(v).toLowerCase();
  if (/^m(\b|$)/.test(s)) return 'Marié(e)';
  if (/^c(\b|$)/.test(s)) return 'Célibataire';
  if (/^d(\b|$)/.test(s)) return 'Divorcé(e)';
  return fix(v);
}

const MOTIFS = [
  [/retrait/i, 'Retraite'],
  [/maintien|mantien/i, 'Maintien'],
  [/disponibil/i, 'Disponibilité'],
  [/détach|detach/i, 'Détachement'],
  [/déc[ée]d|déc[ée]s|deced|deces|dcd/i, 'Décès'],
  [/abandon/i, 'Abandon de poste'],
  [/démission|demission/i, 'Démission'],
  [/permut|perm\b|perm ?20\d\d|permutation/i, 'Permutation'],
  [/mutat|mut[ée]e?|mouvement national|\bmn[\s-]?\d{2,4}\b/i, 'Mouvement National'],
  [/redeploi/i, 'Redéploiement'],
  [/reconversion/i, 'Reconversion'],
  [/congés de |conge/i, 'Congé'],
  [/malade/i, '(malade)'],
];
function motifFrom(annot) {
  if (!annot) return null;
  for (const [re, label] of MOTIFS) if (re.test(annot)) return label;
  return null;
}

function extractAnnotation(prenomRaw) {
  if (!prenomRaw) return { clean: null, annot: null, tail: null };
  const annots = [];
  const re = /\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(prenomRaw))) if (m[1].trim()) annots.push(m[1].trim());
  let cleaned = prenomRaw.replace(/\([^)]*\)/g, ' ');
  let tail = null;
  const open = prenomRaw.lastIndexOf('(');
  if (open >= 0 && prenomRaw.indexOf(')', open) === -1) {
    tail = prenomRaw.slice(open + 1).trim();
    if (tail) annots.push(tail);
    cleaned = cleaned.slice(0, open);
  }
  return { clean: fix(cleaned), annot: annots.join(' ') || null, tail };
}

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");

/* --------------------------- lecture XLSX ------------------------------ */
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sheet_xlsx_'));
const zipPath = path.join(tmpDir, 'in.zip');
fs.copyFileSync(fileArg, zipPath);
if (process.platform === 'win32') {
  execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath.replace(/'/g, "''")}', '${tmpDir.replace(/'/g, "''")}\\ex')"`);
} else {
  execSync(`unzip -o "${zipPath}" -d "${tmpDir}/ex"`);
}
const exDir = path.join(tmpDir, 'ex');

function readSharedStrings() {
  const p = path.join(exDir, 'xl', 'sharedStrings.xml');
  if (!fs.existsSync(p)) return [];
  const xml = fs.readFileSync(p, 'utf8');
  const out = [];
  for (const m of xml.matchAll(/<si>(.*?)<\/si>/gs)) {
    let text = '';
    for (const t of m[1].matchAll(/<t(?: [^>]*)?>(.*?)<\/t>/gs)) text += t[1];
    out.push(decode(text));
  }
  return out;
}

function readSheet(xml, strings) {
  const grid = new Map();
  for (const m of xml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
    const [, col, rowStr, attrs, inner = ''] = m;
    const row = +rowStr;
    const t = (attrs.match(/t="([^"]+)"/) || [])[1];
    let value = null;
    if (t === 'inlineStr') {
      const st = (inner.match(/<t(?: [^>]*)?>(.*?)<\/t>/s) || [])[1];
      value = decode(st || '');
    } else {
      const v = (inner.match(/<v>(.*?)<\/v>/s) || [])[1];
      if (v === undefined) continue;
      value = t === 's' ? (strings[+v] ?? '') : v;
    }
    if (!grid.has(row)) grid.set(row, {});
    grid.get(row)[col] = rawStr(value);
  }
  return grid;
}

function findSheetXml() {
  const sheets = fs.readdirSync(path.join(exDir, 'xl', 'worksheets')).filter((f) => /^sheet\d+\.xml$/.test(f));
  if (sheets.length !== 1) throw new Error(`Attendu 1 feuille, trouvé ${sheets.length}`);
  return path.join(exDir, 'xl', 'worksheets', sheets[0]);
}

/* --------------------------- cartographie ------------------------------ */
const isHeader = (cells, col, re) => re.test((fix(cells[col]) || '').replace(/\s+/g, ''));

function mapIef(grid) {
  const out = [];
  let started = false;
  for (const [row, cells] of [...grid.entries()].sort((a, b) => a[0] - b[0])) {
    if (!started) {
      if (isHeader(cells, 'F', /^MATRICULE$/i) && isHeader(cells, 'G', /^PRENOMS$/i)) started = true;
      continue;
    }
    if (!cells.F && !cells.G && !cells.H) continue;
    out.push({
      source: 'IEF', statut: 'actif', bureau: 'Ressources Humaines', cycle: null,
      matricule: fix(cells.F), prenom: fix(cells.G), nom: fix(cells.H),
      sexe: normSexe(cells.I), date_naissance: parseDate(cells.J), lieu_naissance: fix(cells.K),
      corps: fix(cells.L), grade: null, discipline: fix(cells.M),
      diplome_academique: fix(cells.N), diplome_professionnel: fix(cells.O),
      fonction: fix(cells.P), anc_ens: fix(cells.Q), anc_poste: fix(cells.R), os_arrivee: fix(cells.S),
      email: cleanEmail(cells.T), cni: fix(cells.U), telephone: cleanTel(cells.V),
      sit_matrimoniale: normSitMat(cells.W), nb_enfants: parseNb(cells.X), localisation: null,
    });
  }
  return out;
}

function mapElementaire(grid, cells) {
  const out = [];
  let started = false;
  let school = null;
  let commune = null;
  for (const [row] of [...grid.entries()].sort((a, b) => a[0] - b[0])) {
    const c = grid.get(row);
    if (!started) {
      if (isHeader(c, 'C', /^STRUCTURE$/i) && isHeader(c, 'D', /^MATRICULE$/i) && isHeader(c, 'F', /^NOM$/i)) {
        started = true;
        continue;
      }
      continue;
    }
    if (!c.E && !c.F) continue;
    if (c.C && looksSchool(c.C)) school = fix(c.C);
    if (c.Y) commune = fix(c.Y);
    out.push({
      source: 'ELEMENTAIRE', statut: 'actif', bureau: null,
      cycle: 'élémentaire', ecole: school, localisation: commune,
      matricule: fix(c.D), prenom: fix(c.E), nom: fix(c.F),
      sexe: normSexe(c.H), date_naissance: parseDate(c.I), lieu_naissance: fix(c.J),
      corps: fix(c.K), grade: fix(c.L), discipline: fix(c.M),
      diplome_academique: fix(c.N), diplome_professionnel: fix(c.O),
      fonction: fix(c.P), anc_ens: fix(c.Q), anc_poste: fix(c.R), os_arrivee: fix(c.S),
      cni: fix(c.T), telephone: cleanTel(c.U),
      sit_matrimoniale: normSitMat(c.V), nb_enfants: parseNb(c.W), email: cleanEmail(c.X),
    });
  }
  return out;
}

function mapCollege(grid) {
  const out = [];
  let started = false;
  let school = null;
  for (const [row] of [...grid.entries()].sort((a, b) => a[0] - b[0])) {
    const c = grid.get(row);
    if (!started) {
      if (isHeader(c, 'B', /^ETABLISSEMENTS$/i) && isHeader(c, 'C', /^MATRICULE$/i)) { started = true; continue; }
      continue;
    }
    if (!c.D && !c.E) continue;
    if (c.B && looksSchool(c.B)) school = fix(c.B);
    out.push({
      source: 'COLLEGE', statut: 'actif', bureau: null,
      cycle: 'collège', ecole: school, localisation: null,
      matricule: fix(c.C), prenom: fix(c.D), nom: fix(c.E),
      sexe: normSexe(c.G), date_naissance: parseDate(c.H), lieu_naissance: fix(c.I),
      corps: fix(c.J), grade: fix(c.K), discipline: fix(c.L),
      diplome_academique: fix(c.M), diplome_professionnel: fix(c.N),
      fonction: fix(c.O), anc_ens: fix(c.P), anc_poste: fix(c.Q), os_arrivee: fix(c.X),
      cni: fix(c.S), telephone: cleanTel(c.T),
      sit_matrimoniale: normSitMat(c.U), nb_enfants: parseNb(c.V), email: cleanEmail(c.W),
    });
  }
  return out;
}

function mapOrcCtp(grid, sheetId) {
  const out = [];
  let started = false;
  let school = null;
  for (const [row] of [...grid.entries()].sort((a, b) => a[0] - b[0])) {
    const c = grid.get(row);
    if (!started) {
      if (isHeader(c, 'C', /^ETABLISSEMENTS$/i) && isHeader(c, 'D', /^(Mle|MATRICULE)$/i)) { started = true; continue; }
      continue;
    }
    if (!c.D && !c.E) continue;
    if (c.C && looksSchool(c.C)) school = fix(c.C);
    out.push({
      source: sheetId, statut: 'actif', bureau: null,
      cycle: 'préscolaire', ecole: school, localisation: null,
      matricule: fix(c.D), prenom: fix(c.E), nom: fix(c.F),
      sexe: normSexe(c.G), date_naissance: parseDate(c.H), lieu_naissance: fix(c.I),
      corps: null, grade: fix(c.J), discipline: fix(c.K),
      diplome_academique: fix(c.L), diplome_professionnel: fix(c.M),
      fonction: fix(c.N), anc_ens: fix(c.O), anc_poste: fix(c.P), os_arrivee: fix(c.Q),
      cni: fix(c.R), telephone: cleanTel(c.S),
      sit_matrimoniale: normSitMat(c.T), nb_enfants: parseNb(c.U), email: cleanEmail(c.V),
    });
  }
  return out;
}

function mapDaara(grid) {
  const out = [];
  let started = false;
  let school = null;
  for (const [row] of [...grid.entries()].sort((a, b) => a[0] - b[0])) {
    const c = grid.get(row);
    if (!started) {
      if (isHeader(c, 'C', /^ETABLISSEMENTS$/i) && isHeader(c, 'D', /^MATRICULE$/i)) { started = true; continue; }
      continue;
    }
    if (!c.D && !c.E && !c.F) continue;
    if (c.C && looksSchool(c.C)) school = fix(c.C);
    out.push({
      source: 'DAARA MODERNE', statut: 'actif', bureau: null,
      cycle: 'daara_moderne', ecole: school, localisation: null,
      matricule: fix(c.D), prenom: fix(c.E), nom: fix(c.F),
      sexe: normSexe(c.G), date_naissance: parseDate(c.H), lieu_naissance: fix(c.I),
      corps: fix(c.J), grade: fix(c.K), discipline: fix(c.L),
      diplome_academique: fix(c.M), diplome_professionnel: fix(c.N),
      fonction: fix(c.O), anc_ens: fix(c.P), anc_poste: fix(c.Q), os_arrivee: fix(c.W),
      cni: fix(c.R), telephone: cleanTel(c.S),
      sit_matrimoniale: normSitMat(c.T), nb_enfants: parseNb(c.U), email: cleanEmail(c.V),
    });
  }
  return out;
}

function mapDepart(grid, cohort) {
  const a = cohort === '2022'; // true => layout DEPART 2022-2023 (D..Z), false => 2023-2024-2025 (B..X, 2 variantes std/décalée)
  const std = a
    ? { mat: 'E', pre: 'F', nom: 'G', mot: 'H', sexe: 'I', date: 'J', lieu: 'K', cp: 'L', grd: 'M', dis: 'N', da: 'O', dp: 'P', fct: 'Q', ancEns: 'R', ancPoste: 'S', os: 'T', cni: 'U', tel: 'V', sit: 'W', enf: 'X', mail: 'Y', com: 'Z', ecol: 'D' }
    : { mat: 'C', pre: 'D', nom: 'E', mot: 'F', sexe: 'G', date: 'H', lieu: 'I', cp: 'J', grd: 'K', dis: 'L', da: 'M', dp: 'N', fct: 'O', ancEns: 'P', ancPoste: 'Q', os: 'R', cni: 'S', tel: 'T', sit: 'U', enf: 'V', mail: 'W', com: 'X', ecol: 'B' };
  const shifted = a ? null
    : { mat: 'C', pre: 'D', nom: 'E', sexe: 'F', date: 'G', lieu: 'H', cp: 'I', grd: 'J', dis: 'K', da: 'L', dp: 'M', fct: 'N', ancEns: 'O', ancPoste: 'P', os: null, cni: 'R', tel: 'S', sit: 'T', enf: 'U', mail: 'V', com: 'X', ecol: 'B' };
  const out = [];
  let started = false;
  let school = null;
  let commune = null;
  for (const [row] of [...grid.entries()].sort((x, y) => x[0] - y[0])) {
    const c = grid.get(row);
    if (!started) {
      if (a ? isHeader(c, 'D', /^ECOLE$/i) && isHeader(c, 'E', /^MATRICULE$/i)
            : isHeader(c, 'B', /^ECOLE$/i) && isHeader(c, 'C', /^MATRICULE$/i)) { started = true; continue; }
      continue;
    }
    const gKey = a ? ['E', 'F'] : ['C', 'D'];
    if (!c[gKey[0]] && !c[gKey[1]]) continue;
    if (/^DEPART\b/i.test(fix(c[a ? 'F' : 'D']) || '')) continue;
    const pick = (el) => {
      const { clean: prenom, annot } = extractAnnotation(c[el.pre]);
      const motifRaw = el.mot ? c[el.mot] : null;
      const motif = motifRaw ? (motifFrom(motifRaw) || fix(motifRaw)) : motifFrom(annot);
      return {
        matricule: fix(c[el.mat]), prenom, nom: fix(c[el.nom]),
        sexe: normSexe(c[el.sexe]), date_naissance: parseDate(c[el.date]), lieu_naissance: fix(c[el.lieu]),
        corps: fix(c[el.cp]), grade: fix(c[el.grd]), discipline: fix(c[el.dis]),
        diplome_academique: fix(c[el.da]), diplome_professionnel: fix(c[el.dp]),
        fonction: fix(c[el.fct]), anc_ens: fix(c[el.ancEns]), anc_poste: fix(c[el.ancPoste]),
        os_arrivee: el.os ? fix(c[el.os]) : null,
        cni: fix(c[el.cni]), telephone: cleanTel(c[el.tel]),
        sit_matrimoniale: normSitMat(c[el.sit]), nb_enfants: parseNb(c[el.enf]), email: cleanEmail(c[el.mail]),
        motif_depart: motif,
      };
    };
    let rec = pick(std);
    if (shifted) {
      const stScore = /^(masculin|f[ée]?minin|m|f|h)$/i.test(fix(c.G) || '') * 2 + (parseDate(c.H) ? 3 : 0);
      const shScore = /^(masculin|f[ée]?minin|m|f|h)$/i.test(fix(c.F) || '') * 2 + (parseDate(c.G) ? 3 : 0);
      if (shScore > stScore) rec = pick(shifted);
    }
    if (c[std.ecol] && looksSchool(c[std.ecol])) school = fix(c[std.ecol]);
    if (c[std.com]) commune = fix(c[std.com]);
    rec = {
      source: `DEPART ${cohort === '2022' ? '2022-2023' : '2023-2024-2025'}`,
      statut: 'inactif', depart_annee: cohort === '2022' ? '2022-2023' : '2023-2024-2025',
      bureau: null, cycle: cycleFromName(school), ecole: school, localisation: commune,
      ...rec,
    };
    out.push(rec);
  }
  return out;
}

/* --------------------------- post-traitement --------------------------- */
function applyFixups(sheetId, records) {
  const log = [];
  const normEcole = {
    elementaire: { 'HLM 4/E': 'HLM4/E' },
    college: { 'CEM ALIOUNEDIOP': 'CEM ALIOUNE DIOP', 'CEM O . SOCE DIOP': 'CEM O.SOCE DIOP' },
    ort: {
      'ORT/SEN US 2': 'ORT/SEN US2',
      'ORT/SEN/US7': 'ORT/SEN US7',
      'ORT/SEN US 8': 'ORT/SEN US8',
    },
    depart2022: { 'HLM 4/E': 'HLM4/E' },
    depart2023: { 'HLM 4/E': 'HLM4/E' },
  };
  const emap = normEcole[sheetId] || {};
  let norm = 0;
  for (const r of records) if (r.ecole && emap[r.ecole]) { r.ecole = emap[r.ecole]; norm++; }
  if (norm) log.push(`écoles normalisées: ${norm}`);

  const out = [];
  const idx = new Map();
  const dropped = [];
  for (const r of records) {
    if (!r.matricule) { out.push(r); continue; }
    const i = idx.get(r.matricule);
    if (i === undefined) { idx.set(r.matricule, out.length); out.push(r); continue; }
    const ex = out[i];
    const exAnnot = /\([^)]*\)/.test(ex.prenom ?? '');
    const curAnnot = /\([^)]*\)/.test(r.prenom ?? '');
    if (exAnnot && !curAnnot) { dropped.push(ex); out[i] = r; }
    else dropped.push(r);
  }
  if (dropped.length) log.push(`doublons matricule ignorés: ${dropped.length} -> ${dropped.map((d) => d.matricule).join(', ')}`);
  return { records: out, log };
}

/* ------------------------------ main ---------------------------------- */
const strings = readSharedStrings();
const grid = readSheet(fs.readFileSync(findSheetXml(), 'utf8'), strings);

let records = [];
if (sheetId === 'ief') records = mapIef(grid);
else if (sheetId === 'elementaire') records = mapElementaire(grid);
else if (sheetId === 'college') records = mapCollege(grid);
else if (sheetId === 'ort' || sheetId === 'ctp') records = mapOrcCtp(grid, sheetId.toUpperCase());
else if (sheetId === 'daara') records = mapDaara(grid);
else if (sheetId === 'depart2022') records = mapDepart(grid, '2022');
else if (sheetId === 'depart2023') records = mapDepart(grid, '2023');
else throw new Error(`cartographie inconnue: ${sheetId}`);
const fixed = applyFixups(sheetId, records);
records = fixed.records;

const outFile = path.join(outDir, `${sheetId}.import.jsonl`);
fs.writeFileSync(outFile, records.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');

console.log(`Feuille '${sheetId}' : ${records.length} enregistrements -> ${outFile}`);
for (const l of fixed.log) console.log('  ' + l);
const nMat = records.filter((r) => !r.matricule).length;
const nDate = records.filter((r) => r.date_naissance == null && (r.corps || r.fonction)).length;
console.log(`  sans matricule: ${nMat} | dates non parsées sur lignes actives: ${nDate}`);
const dbl = records.filter((r, i) => records.findIndex((x) => x.matricule && x.matricule === r.matricule) !== i);
console.log(`  matricules en double: ${dbl.length}${dbl.length ? ' -> ' + [...new Set(dbl.map((r) => r.matricule))].join(', ') : ''}`);
if (records[0] && records[0].ecole) {
  const bySchool = new Map();
  for (const r of records) bySchool.set(r.ecole, (bySchool.get(r.ecole) || 0) + 1);
  console.log(`  écoles: ${bySchool.size}`);
  for (const [s, n] of bySchool) console.log(`    - ${s}: ${n}`);
}
const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
console.log('matricule         | prenom                    | nom          | sexe | naissance  | corps   | fonction  ');
for (const r of records)
  console.log(`${pad(r.matricule, 18)}| ${pad(r.prenom, 26)}| ${pad(r.nom, 13)}| ${pad(r.sexe, 5)}| ${pad(r.date_naissance, 11)}| ${pad(r.corps, 9)}| ${pad(r.fonction, 11)}`);

fs.rmSync(tmpDir, { recursive: true, force: true });