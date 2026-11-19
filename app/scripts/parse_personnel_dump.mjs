#!/usr/bin/env node
/*
 * Parseur du dump LibreOffice du personnel IEF-GDKR.
 * Lecture : lignes "L<row>: A=.. | B=.. | ..." (format xlsx-dump.cjs).
 * Sortie  : scripts/output/personnel.jsonl, ecoles.json, summary.json + rapport console.
 * Options : --sql  => génère aussi 0006_import_ecoles.sql et 0007_import_personnel.sql.
 * Usage : node scripts/parse_personnel_dump.mjs [chemin_dump] [--sql]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const genSql = args.includes('--sql');
const dumpPath =
  args.find((a) => !a.startsWith('--')) ||
  'C:\\Users\\babac\\AppData\\Local\\Temp\\opencode\\personnel_ief_dump.txt';
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(appDir, 'scripts', 'output');
const migDir = path.join(appDir, 'supabase', 'migrations');
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
  const m = s.match(/(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(\d{2,4})/);
  if (m) {
    let d = +m[1], mo = +m[2], y = +m[3];
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    if (y >= 1940 && y <= 2060 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
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
  [/cadi/i, 'Cadi'],
  [/examen/i, 'Examens Prof'],
  [/absent/i, 'Absent'],
  [/malade/i, '(malade)'],
];
function motifFrom(annot) {
  if (!annot) return null;
  for (const [re, label] of MOTIFS) if (re.test(annot)) return label;
  return null;
}

function extractAnnotation(prenomRaw) {
  if (!prenomRaw) return { clean: null, annot: null };
  const p = prenomRaw;
  const annots = [];
  const re = /\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(p))) if (m[1].trim()) annots.push(m[1].trim());
  let cleaned = p.replace(/\([^)]*\)/g, ' ');
  const open = p.lastIndexOf('(');
  if (open >= 0 && p.indexOf(')', open) === -1) {
    const tail = p.slice(open + 1).trim();
    if (tail) annots.push(tail);
    cleaned = cleaned.slice(0, open);
  }
  return { clean: fix(cleaned), annot: annots.join(' ') || null };
}

function looksSchool(v) {
  if (!v) return false;
  const s = fix(v);
  if (!s || s.length < 3) return false;
  if (/^[\d\s/.,\-]+$/.test(s) || /^NI$/i.test(s)) return false;
  return /[A-Za-zÀ-ÿ]/.test(s);
}

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

function cleanEmail(v) {
  if (!v) return null;
  let s = fix(v);
  s = s.replace(/\s+/g, '').replace(/,/g, '.');
  const m = s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(?:com|fr|sn|net|org|ml|edu|io|gmail)/i);
  return m ? m[0].toLowerCase() : null;
}

const parseNb = (v) => (/^\d+$/.test(fix(v) ?? '') ? parseInt(fix(v), 10) : null);
const cleanTel = (v) => (v ? fix(v) : null);

/* --------------------------- générateurs SQL --------------------------- */
const sqlVal = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

function genEcolesSql(schoolsArr) {
  const values = schoolsArr
    .map((s) => `  (${sqlVal(s.nom)}, ${sqlVal(s.cycle)}, ${sqlVal(s.localisation)})`)
    .join(',\n');
  return `-- ============================================================\n-- IEF ADMIN — Import des écoles (généré automatiquement)\n-- ${new Date().toISOString()}\n-- ============================================================\n\ninsert into public.ecoles (nom, cycle, localisation)\nvalues\n${values}\non conflict (nom) do nothing;\n`;
}

function genPersonnelSql(finalRecs) {
  const bureauRH = `(select id from public.bureaux where nom = 'Ressources Humaines')`;
  const fallback = (cycle) => `(select id from public.ecoles where nom = ${sqlVal(`(Non précisée — ${cycle})`)})`;
  const ecoleExpr = (r) => {
    if (!r.ecole) return 'NULL';
    const direct = `(select id from public.ecoles where nom = ${sqlVal(r.ecole)})`;
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
  return `-- ============================================================\n-- IEF ADMIN — Import du personnel (généré automatiquement)\n-- ${new Date().toISOString()}\n-- ============================================================\n\ninsert into public.personnel\n  (bureau_id, ecole_id, nom_complet, fonction, statut,\n   depart_annee, source_feuille, motif_depart, sexe, date_naissance,\n   lieu_naissance, corps, grade, discipline, diplome_academique,\n   diplome_professionnel, anciennete_enseignement, anciennete_poste,\n   telephone, email, n_cni, sit_matrimoniale, nb_enfants, os_arrivee,\n   matricule)\nvalues\n${values}\non conflict (matricule) where matricule is not null do nothing;\n`;
}

function normSitMat(v) {
  if (!v) return null;
  const s = fix(v).toLowerCase();
  if (/^m(\b|$)/.test(s)) return 'Marié(e)';
  if (/^c(\b|$)/.test(s)) return 'Célibataire';
  if (/^d(\b|$)/.test(s)) return 'Divorcé(e)';
  return fix(v);
}

/* ------------------------------ dump reader ------------------------------ */
function readDump(file) {
  const sheets = [];
  let current = null;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const sm = line.match(/^==== FEUILLE:\s*(.+?)\s*====$/);
    if (sm) { current = { name: sm[1].trim(), rows: [] }; sheets.push(current); continue; }
    if (!current) continue;
    const m = line.match(/^L(\d+):\s*(.*)$/);
    if (!m) continue;
    const row = parseInt(m[1], 10);
    const cells = {};
    for (const p of m[2].split('|')) {
      const eq = p.indexOf('=');
      if (eq <= 0) continue;
      const ref = p.slice(0, eq).trim();
      const lm = ref.match(/^([A-Za-z])\d+$/);
      if (lm && p.slice(eq + 1).trim() !== '') cells[lm[1]] = p.slice(eq + 1);
    }
    current.rows.push({ row, cells });
  }
  return sheets;
}

const isHeader = (c, col, re) => !!c[col] && re.test(fix(c[col]));

/* -------------------------------- main --------------------------------- */
function main() {
  const sheets = readDump(dumpPath);
  let records = [];
  const schools = new Map();
  const counts = {};

  const addRecord = (rec) => {
    counts[rec.source] = (counts[rec.source] || 0) + 1;
    records.push(rec);
  };
  const addSchool = (name, cycle, localisation, source) => {
    const norm = fix(name)?.toUpperCase().replace(/\s+/g, ' ');
    if (!norm || !looksSchool(name)) return;
    if (!schools.has(norm))
      schools.set(norm, { nom: fix(name), cycle, localisation: null, sources: [] });
    const s = schools.get(norm);
    if (localisation && !s.localisation) s.localisation = fix(localisation);
    if (!s.sources.includes(source)) s.sources.push(source);
  };

  for (const sheet of sheets) {
    const name = sheet.name;
    if (name === 'ACCUEIL' || name === 'STATISTIQUES 2025-2026' || name === 'LISTES') continue;
    const R = sheet.rows;

    if (name === 'IEF') {
      let started = false;
      for (const { cells } of R) {
        if (!started) { if (isHeader(cells, 'D', /^MATRICULE$/i)) started = true; continue; }
        if (!cells.D && !cells.E && !cells.F) continue;
        addRecord({
          source: name, statut: 'actif', bureau: 'Ressources Humaines', cycle: null,
          matricule: fix(cells.D), prenom: fix(cells.E), nom: fix(cells.F),
          sexe: normSexe(cells.G), date_naissance: parseDate(cells.H), lieu_naissance: fix(cells.I),
          corps: fix(cells.J), grade: null, discipline: fix(cells.K),
          diplome_academique: fix(cells.L), diplome_professionnel: fix(cells.M),
          fonction: fix(cells.N), anc_ens: fix(cells.O), anc_poste: fix(cells.P), os_arrivee: fix(cells.Q),
          email: cleanEmail(cells.R), cni: fix(cells.S), telephone: cleanTel(cells.T),
          sit_matrimoniale: normSitMat(cells.U), nb_enfants: parseNb(cells.V), localisation: null,
        });
      }
      continue;
    }

    if (name === 'ELEMENTAIRE' || name === 'COLLEGE') {
      const isElem = name === 'ELEMENTAIRE';
      const cycle = isElem ? 'élémentaire' : 'collège';
      let started = false, lastSchool = null, lastCommune = null;
      for (const { cells } of R) {
        if (!started) { if (isHeader(cells, 'D', /^MATRICULE$/i)) started = true; continue; }
        if (!cells.D && !cells.E && !cells.F) continue;
        if (cells.C && looksSchool(cells.C)) lastSchool = fix(cells.C);
        const commune = isElem ? fix(cells.Y) : null;
        if (commune) lastCommune = commune;
        addRecord({
          source: name, statut: 'actif', cycle,
          ecole: lastSchool, localisation: isElem ? lastCommune : null,
          matricule: fix(cells.D), prenom: fix(cells.E), nom: fix(cells.F),
          sexe: normSexe(cells.H), date_naissance: parseDate(cells.I), lieu_naissance: fix(cells.J),
          corps: fix(cells.K), grade: fix(cells.L), discipline: fix(cells.M),
          diplome_academique: fix(cells.N), diplome_professionnel: fix(cells.O),
          fonction: fix(cells.P), anc_ens: fix(cells.Q), anc_poste: fix(cells.R),
          os_arrivee: isElem ? fix(cells.S) : fix(cells.Y),
          email: cleanEmail(cells.X), cni: fix(cells.T), telephone: cleanTel(cells.U),
          sit_matrimoniale: normSitMat(cells.V), nb_enfants: parseNb(cells.W),
        });
        if (lastSchool) addSchool(lastSchool, cycle, lastCommune, name);
      }
      continue;
    }

    if (name === 'ORT' || name === 'CTP') {
      let started = false, lastSchool = null;
      for (const { cells } of R) {
        if (!started) { if (isHeader(cells, 'D', /^(MATRICULE|Mle)$/i)) started = true; continue; }
        if (!cells.D && !cells.E && !cells.F) continue;
        if (cells.C && looksSchool(cells.C)) lastSchool = fix(cells.C);
        addRecord({
          source: name, statut: 'actif', cycle: 'préscolaire',
          ecole: lastSchool,
          matricule: fix(cells.D), prenom: fix(cells.E), nom: fix(cells.F),
          sexe: normSexe(cells.G), date_naissance: parseDate(cells.H), lieu_naissance: fix(cells.I),
          corps: null, grade: fix(cells.J), discipline: fix(cells.K),
          diplome_academique: fix(cells.L), diplome_professionnel: fix(cells.M),
          fonction: fix(cells.N), anc_ens: fix(cells.O), anc_poste: fix(cells.P),
          os_arrivee: fix(cells.Q),
          email: cleanEmail(cells.V), cni: fix(cells.R), telephone: cleanTel(cells.S),
          sit_matrimoniale: normSitMat(cells.T), nb_enfants: parseNb(cells.U), localisation: null,
        });
        if (lastSchool) addSchool(lastSchool, 'préscolaire', null, name);
      }
      continue;
    }

    if (name === 'DAARA MODERNE') {
      let started = false, lastSchool = null;
      for (const { cells } of R) {
        if (!started) { if (isHeader(cells, 'D', /^MATRICULE$/i)) started = true; continue; }
        if (!cells.D && !cells.E && !cells.F) continue;
        if (cells.C && looksSchool(cells.C)) lastSchool = fix(cells.C);
        addRecord({
          source: name, statut: 'actif', cycle: 'daara_moderne',
          ecole: lastSchool,
          matricule: fix(cells.D), prenom: fix(cells.E), nom: fix(cells.F),
          sexe: normSexe(cells.G), date_naissance: parseDate(cells.H), lieu_naissance: fix(cells.I),
          corps: fix(cells.J), grade: fix(cells.K), discipline: fix(cells.L),
          diplome_academique: fix(cells.M), diplome_professionnel: fix(cells.N),
          fonction: fix(cells.O), anc_ens: fix(cells.P), anc_poste: fix(cells.Q),
          os_arrivee: fix(cells.W),
          email: cleanEmail(cells.V), cni: fix(cells.R), telephone: cleanTel(cells.S),
          sit_matrimoniale: normSitMat(cells.T), nb_enfants: parseNb(cells.U), localisation: null,
        });
        if (lastSchool) addSchool(lastSchool, 'daara_moderne', null, name);
      }
      continue;
    }

    if (name === 'DEPART 2022-2023') {
      let started = false, lastSchool = null;
      for (const { cells } of R) {
        if (!started) { if (isHeader(cells, 'E', /^MATRICULE$/i)) started = true; continue; }
        if (!cells.E && !cells.F && !cells.G) continue;
        if (cells.D && looksSchool(cells.D)) lastSchool = fix(cells.D);
        else if (cells.B && looksSchool(cells.B)) lastSchool = fix(cells.B);
        const { clean, annot } = extractAnnotation(cells.F);
        const hText = fix(cells.H);
        const hAlpha = hText && /[a-zA-ZÀ-ÿ]/.test(hText) && !/^\d+$/.test(hText);
        let motif = null;
        if (hAlpha) motif = motifFrom(hText) || hText;
        if (!motif && annot) {
          const mf = motifFrom(annot);
          motif = mf || (annot.replace(/\s+/g, '').length >= 4 ? annot : null);
        }
        let ecole = lastSchool, bureau = null;
        if (ecole && isIEFRef(ecole)) { bureau = 'Ressources Humaines'; ecole = null; }
        const noGrade = /^\d+$/.test(fix(cells.Q)) || /^(FR|AR)$/i.test(fix(cells.M));
        addRecord({
          source: name, statut: 'inactif', depart_annee: '2022-2023',
          ecole, bureau, cycle: null, localisation: fix(cells.Z),
          matricule: fix(cells.E), prenom: clean, nom: fix(cells.G),
          sexe: normSexe(cells.I), date_naissance: parseDate(cells.J), lieu_naissance: fix(cells.K),
          corps: fix(cells.L), grade: noGrade ? null : fix(cells.M),
          discipline: fix(noGrade ? cells.M : cells.N),
          diplome_academique: fix(noGrade ? cells.N : cells.O),
          diplome_professionnel: fix(noGrade ? cells.O : cells.P),
          fonction: fix(noGrade ? cells.P : cells.Q), motif_depart: motif,
          email: cleanEmail(cells.Y), sit_matrimoniale: normSitMat(cells.W),
          nb_enfants: parseNb(cells.X), localisation_school: fix(cells.Z),
        });
        if (lastSchool) addSchool(lastSchool, cycleFromName(lastSchool), fix(cells.Z), name);
      }
      continue;
    }

    if (name === 'DEPART 2023-2024-2025') {
      let started = false, lastSchool = null;
      for (const { cells } of R) {
        if (!started) { if (isHeader(cells, 'C', /^MATRICULE$/i)) started = true; continue; }
        if (!cells.C && !cells.D && !cells.E) continue;
        if (cells.B && looksSchool(cells.B)) lastSchool = fix(cells.B);
        const { clean, annot } = extractAnnotation(cells.D);
        const F = fix(cells.F);
        const isSexeWord = /^(masculin|f[ée]?minin)$/i.test(F || '');
        const isSexeCode = /^[MFH]$/i.test(F || '');
        const gv = fix(cells.G) || '';
        const gDateLike = /^\d+$/.test(gv) || /^\d{1,2}[\/\-.]\d{1,2}/.test(gv);
        const gSexeWord = /^(masculin|f[ée]?minin)$/i.test(gv);
        const hNumeric = /^\d+$/.test(fix(cells.H) || '');
        const jDisc = /^[A-ZÀ-ÿ]{1,5}$/.test(fix(cells.J) || '');
        let sexe = null;
        if (isSexeWord) sexe = normSexe(F);
        else if (isSexeCode) sexe = normSexe(F);
        else if (/^(masculin|f[ée]?minin|[MFH])$/i.test(gv)) sexe = normSexe(gv);
        let variant = 'std';
        if (gDateLike) variant = 'shifted';
        else if (isSexeCode && gSexeWord && hNumeric) variant = 'nocorps';
        const M = variant === 'shifted'
          ? jDisc
            ? { date: 'G', lieu: 'H', corps: 'I', disc: 'J', a: 'K', p: 'L', f: 'M' }
            : { date: 'G', lieu: 'H', corps: 'I', grade: 'J', disc: 'K', a: 'L', p: 'M', f: 'N' }
          : variant === 'nocorps'
            ? { date: 'H', lieu: 'I', grade: 'J', disc: 'K', a: 'L', p: 'M', f: 'N' }
            : { date: 'H', lieu: 'I', corps: 'J', grade: 'K', disc: 'L', a: 'M', p: 'N', f: 'O' };
        const hText = F;
        const hAlpha = hText && /[a-zA-ZÀ-ÿ]/.test(hText) && !/^\d+$/.test(hText) && !isSexeWord && !isSexeCode;
        let motif = null;
        if (annot) {
          const mf = motifFrom(annot);
          motif = mf || (annot.replace(/\s+/g, '').length >= 4 ? annot : null);
        }
        if (!motif && hAlpha) motif = motifFrom(hText) || hText;
        addRecord({
          source: name, statut: 'inactif', depart_annee: '2023-2024-2025',
          ecole: lastSchool, localisation: fix(cells.X), cycle: null,
          matricule: fix(cells.C), prenom: clean, nom: fix(cells.E),
          sexe, date_naissance: parseDate(cells[M.date]), lieu_naissance: fix(cells[M.lieu]),
          corps: fix(cells[M.corps]), grade: fix(cells[M.grade]), discipline: fix(cells[M.disc]),
          diplome_academique: fix(cells[M.a]), diplome_professionnel: fix(cells[M.p]),
          fonction: fix(cells[M.f]), motif_depart: motif,
          email: cleanEmail(cells.W), sit_matrimoniale: null, nb_enfants: null,
        });
        if (lastSchool) addSchool(lastSchool, cycleFromName(lastSchool), fix(cells.X), name);
      }
      continue;
    }
  }

  /* ------ résolution école / bureau + cycle manquants (+ repli) ------ */
  for (const r of records) {
    if (r.bureau) r.cycle = null;
    if (!r.ecole && !r.bureau) {
      const c = r.cycle || inferCycleFromCorps(r.corps) || 'élémentaire';
      r.cycle = c;
      r.ecole = `(Non précisée — ${c})`;
    } else if (r.ecole && !isIEFRef(r.ecole)) {
      r.cycle = r.cycle || cycleFromName(r.ecole);
      addSchool(r.ecole, r.cycle, r.localisation || r.localisation_school || null, r.source);
    } else if (r.ecole && isIEFRef(r.ecole)) {
      r.bureau = 'Ressources Humaines';
      r.ecole = null;
      r.cycle = null;
    }
    delete r.localisation_school;
    if (r.ecole && r.localisation === null) r.localisation = null;
  }

  records = records.filter((r) => r.prenom);

  /* ------ dédup par matricule (préférer actif) ------ */
  const groups = new Map();
  const order = [];
  for (const r of records) {
    if (r.matricule) {
      const k = r.matricule.toUpperCase().replace(/\s+/g, '');
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
      if (![...order].includes(r)) order.push(r);
    } else order.push(r);
  }
  const finalRecs = [];
  const seen = new Set();
  let dupCount = 0;
  for (const r of order) {
    const k = r.matricule ? r.matricule.toUpperCase().replace(/\s+/g, '') : null;
    if (!k) { finalRecs.push(r); continue; }
    const arr = groups.get(k);
    if (seen.has(k)) { dupCount++; continue; }
    arr.sort((a, b) => (a.statut === 'actif' ? -1 : 1) - (b.statut === 'actif' ? -1 : 1));
    finalRecs.push(arr[0]);
    seen.add(k);
  }

  /* ------ écoles de repli à ajouter au recensement ------ */
  for (const r of finalRecs)
    if (r.ecole) addSchool(r.ecole, r.cycle, null, 'repli');

  const out = {
    generatedAt: new Date().toISOString(), dumpFile: dumpPath,
    totalRecords: finalRecs.length, preDedup: records.length, counts, duplicataMatricule: dupCount,
  };
  fs.writeFileSync(path.join(outDir, 'personnel.jsonl'), finalRecs.map((r) => JSON.stringify(r)).join('\n'), 'utf8');
  const schoolsArr = [...schools.values()].sort((a, b) => a.nom.localeCompare(b.nom));
  fs.writeFileSync(path.join(outDir, 'ecoles.json'), JSON.stringify(schoolsArr, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(out, null, 2), 'utf8');

  console.log(JSON.stringify(out, null, 2));
  console.log('\nÉcoles détectées :', schoolsArr.length);
  for (const s of schoolsArr.slice(0, 30))
    console.log('  -', s.nom, '[' + s.cycle + (s.localisation ? ', ' + s.localisation : '') + ']');
  if (schoolsArr.length > 30)
    console.log(`  ... et ${schoolsArr.length - 30} autres`);
  if (genSql) {
    fs.writeFileSync(path.join(migDir, '0006_import_ecoles.sql'), genEcolesSql(schoolsArr), 'utf8');
    fs.writeFileSync(path.join(migDir, '0007_import_personnel.sql'), genPersonnelSql(finalRecs), 'utf8');
    console.log('SQL -> supabase/migrations/0006_import_ecoles.sql');
    console.log('SQL -> supabase/migrations/0007_import_personnel.sql');
  }
  console.log('Rapport -> scripts/output/summary.json');
}

main();