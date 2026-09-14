"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { adminPerms } from "@/lib/admin-perms";
import {
  MOTIFS_DEPART,
  PERSONNEL_STATUTS,
  SEXE_LABELS,
  SIT_MAT_OPTIONS,
  fmtDate,
  type PersonnelRow,
} from "@/lib/admin-types";
import { useRole } from "@/lib/role-context";
import { AdminTable } from "./admin-table";
import { FormDialog } from "./form-dialog";
import { DateInput, Field, SelectInput, TextInput } from "./fields";
import { StatusBadge } from "./status";
import { sbThrow } from "./sb";
import { useRows } from "./use-rows";
import { useBureauxRef, useEcolesRef } from "./use-refs";
import { SearchBar } from "./search-bar";
import { ArrowRightLeft, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

const SELECT = [
  "id","bureau_id","ecole_id","nom_complet","fonction","date_entree","statut",
  "matricule","sexe","date_naissance","lieu_naissance","corps","grade","discipline",
  "diplome_academique","diplome_professionnel","anciennete_enseignement","anciennete_poste",
  "telephone","email","n_cni","sit_matrimoniale","nb_enfants","os_arrivee",
  "motif_depart","depart_annee","source_feuille",
].join(", ");

export function PersonnelBureauTab() {
  const { role, profile } = useRole();
  const perms = adminPerms(role, profile).personnel;
  const bureaux = useBureauxRef();
  const ecoles = useEcolesRef();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PersonnelRow | null>(null);
  const [muting, setMuting] = useState<PersonnelRow | null>(null);
  const [archiving, setArchiving] = useState<PersonnelRow | null>(null);

  const [nom, setNom] = useState("");
  const [matricule, setMatricule] = useState("");
  const [sexe, setSexe] = useState("");
  const [type, setType] = useState<"bureau" | "ecole">("bureau");
  const [bureauId, setBureauId] = useState("");
  const [ecoleId, setEcoleId] = useState("");
  const [fonction, setFonction] = useState("");
  const [dateEntree, setDateEntree] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");
  const [corps, setCorps] = useState("");
  const [grade, setGrade] = useState("");
  const [search, setSearch] = useState<Record<string, string>>({});
  const [discipline, setDiscipline] = useState("");
  const [diplAc, setDiplAc] = useState("");
  const [diplProf, setDiplProf] = useState("");
  const [ancEns, setAncEns] = useState("");
  const [ancPoste, setAncPoste] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [nCni, setNCni] = useState("");
  const [sitMat, setSitMat] = useState("");
  const [nbEnfants, setNbEnfants] = useState("");
  const [osArrivee, setOsArrivee] = useState("");
  const [statut, setStatut] = useState("actif");
  const [motif, setMotif] = useState("");
  const [departAnnee, setDepartAnnee] = useState("");

  const { rows, loading, refresh } = useRows<PersonnelRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("personnel")
        .select(SELECT)
        .not("bureau_id", "is", null)
        .order("nom_complet", { ascending: true });
      return error || !data ? [] : (data as unknown as PersonnelRow[]);
    },
    []
  );

  function affectation(row: PersonnelRow): { label: string; kind: "bureau" | "ecole" } {
    if (row.bureau_id != null) {
      const b = bureaux.rows.find((x) => x.id === row.bureau_id);
      return { label: `Bureau — ${b ? b.nom : row.bureau_id}`, kind: "bureau" };
    }
    const e = ecoles.rows.find((x) => x.id === row.ecole_id);
    return { label: `École — ${e ? e.nom : row.ecole_id}`, kind: "ecole" };
  }

  function openAdd() {
    setEditing(null);
    setNom(""); setMatricule(""); setSexe(""); setType("bureau");
    setBureauId(""); setEcoleId(""); setFonction(""); setDateEntree("");
    setDateNaissance(""); setLieuNaissance(""); setCorps(""); setGrade("");
    setDiscipline(""); setDiplAc(""); setDiplProf(""); setAncEns("");
    setAncPoste(""); setTelephone(""); setEmail(""); setNCni("");
    setSitMat(""); setNbEnfants(""); setOsArrivee(""); setStatut("actif");
    setMotif(""); setDepartAnnee(""); setOpen(true);
  }

  function openEdit(row: PersonnelRow) {
    setEditing(row);
    setNom(row.nom_complet);
    setMatricule(row.matricule ?? "");
    setSexe(row.sexe ?? "");
    const isEcole = row.ecole_id != null;
    setType(isEcole ? "ecole" : "bureau");
    setBureauId(row.bureau_id == null ? "" : String(row.bureau_id));
    setEcoleId(row.ecole_id == null ? "" : String(row.ecole_id));
    setFonction(row.fonction ?? "");
    setDateEntree(row.date_entree ? row.date_entree.slice(0, 10) : "");
    setDateNaissance(row.date_naissance ? row.date_naissance.slice(0, 10) : "");
    setLieuNaissance(row.lieu_naissance ?? "");
    setCorps(row.corps ?? "");
    setGrade(row.grade ?? "");
    setDiscipline(row.discipline ?? "");
    setDiplAc(row.diplome_academique ?? "");
    setDiplProf(row.diplome_professionnel ?? "");
    setAncEns(row.anciennete_enseignement ?? "");
    setAncPoste(row.anciennete_poste ?? "");
    setTelephone(row.telephone ?? "");
    setEmail(row.email ?? "");
    setNCni(row.n_cni ?? "");
    setSitMat(row.sit_matrimoniale ?? "");
    setNbEnfants(row.nb_enfants == null ? "" : String(row.nb_enfants));
    setOsArrivee(row.os_arrivee ?? "");
    setStatut(row.statut);
    setMotif(row.motif_depart ?? "");
    setDepartAnnee(row.depart_annee ?? "");
    setOpen(true);
  }

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!nom.trim()) throw new Error("Le nom complet est obligatoire.");
    const inactif = statut === "inactif";
    const payload: Record<string, unknown> = {
      nom_complet: nom.trim(),
      matricule: matricule.trim() || null,
      sexe: sexe || null,
      fonction: fonction.trim() || null,
      date_entree: dateEntree || null,
      date_naissance: dateNaissance || null,
      lieu_naissance: lieuNaissance.trim() || null,
      corps: corps.trim() || null,
      grade: grade.trim() || null,
      discipline: discipline.trim() || null,
      diplome_academique: diplAc.trim() || null,
      diplome_professionnel: diplProf.trim() || null,
      anciennete_enseignement: ancEns.trim() || null,
      anciennete_poste: ancPoste.trim() || null,
      telephone: telephone.trim() || null,
      email: email.trim() || null,
      n_cni: nCni.trim() || null,
      sit_matrimoniale: sitMat || null,
      nb_enfants: nbEnfants === "" ? null : Number(nbEnfants),
      os_arrivee: osArrivee.trim() || null,
      statut,
      motif_depart: inactif ? motif.trim() || null : null,
      depart_annee: inactif ? departAnnee.trim() || null : null,
    };
    if (type === "bureau") {
      if (!bureauId) throw new Error("Sélectionnez le bureau d'affectation.");
      payload.bureau_id = Number(bureauId);
      payload.ecole_id = null;
    } else {
      if (!ecoleId) throw new Error("Sélectionnez l'école d'affectation.");
      payload.ecole_id = Number(ecoleId);
      payload.bureau_id = null;
    }
    if (editing) {
      sbThrow((await supabase.from("personnel").update(payload).eq("id", editing.id)).error);
    } else {
      sbThrow((await supabase.from("personnel").insert(payload)).error);
    }
    refresh();
  }

  async function remove(row: PersonnelRow) {
    if (!supabase) return;
    if (!window.confirm(`Supprimer « ${row.nom_complet} » du personnel ?`)) return;
    const { error } = await supabase.from("personnel").delete().eq("id", row.id);
    if (error) window.alert(error.message);
    else refresh();
  }

  const filteredRows = useMemo(() => {
    const q = (k: string) => (search[k] ?? "").toLowerCase().trim();
    const hasQ = Object.values(search).some((v) => v.trim());
    if (!hasQ) return rows;
    return rows.filter((r) => {
      const b = bureaux.rows.find((x) => x.id === r.bureau_id);
      const bName = b?.nom?.toLowerCase() ?? "";
      if (q("nom") && !r.nom_complet?.toLowerCase().includes(q("nom"))) return false;
      if (q("bureau") && !bName.includes(q("bureau"))) return false;
      if (q("matricule") && !r.matricule?.toLowerCase().includes(q("matricule"))) return false;
      if (q("email") && !r.email?.toLowerCase().includes(q("email"))) return false;
      return true;
    });
  }, [rows, search, bureaux.rows]);

  return (
    <>
      <SearchBar
        fields={[
          { key: "nom", label: "Nom", placeholder: "Nom complet..." },
          { key: "bureau", label: "Bureau", placeholder: "Nom du bureau..." },
          { key: "matricule", label: "Matricule", placeholder: "N° matricule..." },
          { key: "email", label: "Email", placeholder: "Email..." },
        ]}
        values={search}
        onChange={(k, v) => setSearch((prev) => ({ ...prev, [k]: v }))}
      />
      <AdminTable
        title="Personnel IEF (Bureaux)"
        subtitle={`${filteredRows.length} agent(s) sur ${rows.length}.`}
        columns={[
          {
            header: "",
            className: "w-[36px]",
            cell: (r) => (
              <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${r.sexe === "F" ? "bg-pink-500" : "bg-blue-600"}`}>
                {r.nom_complet?.charAt(0) ?? "?"}
              </div>
            ),
          },
          { header: "Nom complet", cell: (r) => <Link href={`/agent/${r.id}`} className="font-medium text-primary hover:underline">{r.nom_complet}</Link> },
          { header: "Affectation", cell: (r) => <span className="text-ink-soft">{affectation(r).label}</span> },
          { header: "Fonction", cell: (r) => <span className="text-ink-soft">{r.fonction ?? "—"}</span> },
          { header: "Matricule", cell: (r) => <span className="font-mono text-[12px] text-ink-soft">{r.matricule ?? "—"}</span> },
          { header: "Sexe", cell: (r) => <span className="text-ink-soft">{r.sexe ? SEXE_LABELS[r.sexe] ?? r.sexe : "—"}</span> },
          { header: "Email", cell: (r) => <span className="text-ink-soft">{r.email ?? "—"}</span> },
          { header: "Statut", cell: (r) => { const s = PERSONNEL_STATUTS[r.statut] ?? { label: r.statut, tone: "attente" as const }; return <StatusBadge label={s.label} tone={s.tone} />; } },
        ]}
        rows={filteredRows}
        keyOf={(r) => r.id}
        loading={loading}
        canAdd={perms.add}
        canEdit={perms.edit}
        canDelete={perms.del}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={remove}
        empty="Aucun agent IEF."
        addLabel="Ajouter un agent"
        customActions={(r) => (
          <>
            <Button variant="outline" size="icon-sm" aria-label="Muter" onClick={() => setMuting(r)}><ArrowRightLeft /></Button>
            <Button variant="outline" size="icon-sm" className="text-orange-600 border-orange-300 hover:bg-orange-50" aria-label="Archiver" onClick={() => setArchiving(r)}><Archive /></Button>
          </>
        )}
      />
      {open && (
        <FormDialog open={open} onOpenChange={setOpen} title={editing ? "Modifier l'agent" : "Nouvel agent"} onSubmit={save} submitLabel={editing ? "Enregistrer" : "Ajouter"}>
          <Field label="Nom complet"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Matricule"><TextInput value={matricule} onChange={(e) => setMatricule(e.target.value)} /></Field>
            <Field label="Sexe"><SelectInput value={sexe} onChange={(e) => setSexe(e.target.value)}><option value="">—</option><option value="M">Masculin</option><option value="F">Féminin</option></SelectInput></Field>
          </div>
          <Field label="Affectation"><SelectInput value={type} onChange={(e) => setType(e.target.value as "bureau" | "ecole")}><option value="bureau">Bureau IEF</option><option value="ecole">École</option></SelectInput></Field>
          {type === "bureau" ? (
            <Field label="Bureau"><SelectInput value={bureauId} onChange={(e) => setBureauId(e.target.value)}><option value="">— Sélectionner —</option>{bureaux.rows.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}</SelectInput></Field>
          ) : (
            <Field label="École"><SelectInput value={ecoleId} onChange={(e) => setEcoleId(e.target.value)}><option value="">— Sélectionner —</option>{ecoles.rows.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}</SelectInput></Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fonction"><TextInput value={fonction} onChange={(e) => setFonction(e.target.value)} /></Field>
            <Field label="Date d'entrée"><DateInput value={dateEntree} onChange={(e) => setDateEntree(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de naissance"><DateInput value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} /></Field>
            <Field label="Lieu de naissance"><TextInput value={lieuNaissance} onChange={(e) => setLieuNaissance(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Corps"><TextInput value={corps} onChange={(e) => setCorps(e.target.value)} /></Field>
            <Field label="Grade"><TextInput value={grade} onChange={(e) => setGrade(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Diplôme académique"><TextInput value={diplAc} onChange={(e) => setDiplAc(e.target.value)} /></Field>
            <Field label="Diplôme professionnel"><TextInput value={diplProf} onChange={(e) => setDiplProf(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone"><TextInput value={telephone} onChange={(e) => setTelephone(e.target.value)} /></Field>
            <Field label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          </div>
          <Field label="Statut"><SelectInput value={statut} onChange={(e) => setStatut(e.target.value)}><option value="actif">Actif</option><option value="inactif">Inactif</option></SelectInput></Field>
          {statut === "inactif" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Motif départ"><TextInput list="motifs-depart-bureau" value={motif} onChange={(e) => setMotif(e.target.value)} /><datalist id="motifs-depart-bureau">{MOTIFS_DEPART.map((m) => <option key={m} value={m} />)}</datalist></Field>
              <Field label="Année départ"><TextInput value={departAnnee} onChange={(e) => setDepartAnnee(e.target.value)} /></Field>
            </div>
          )}
        </FormDialog>
      )}
      {muting && <MuterDialog agent={muting} bureaux={bureaux.rows} ecoles={ecoles.rows} onClose={() => setMuting(null)} onSaved={() => { setMuting(null); refresh(); }} />}
      {archiving && <ArchiverDialog agent={archiving} onClose={() => setArchiving(null)} onSaved={() => { setArchiving(null); refresh(); }} />}
    </>
  );
}

function MuterDialog({ agent, bureaux, ecoles, onClose, onSaved }: { agent: PersonnelRow; bureaux: { id: number; nom: string }[]; ecoles: { id: number; nom: string }[]; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"bureau" | "ecole">(agent.ecole_id != null ? "ecole" : "bureau");
  const [bureauId, setBureauId] = useState(agent.bureau_id == null ? "" : String(agent.bureau_id));
  const [ecoleId, setEcoleId] = useState(agent.ecole_id == null ? "" : String(agent.ecole_id));
  const [fonction, setFonction] = useState(agent.fonction ?? "");

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    const payload: Record<string, unknown> = { fonction: fonction.trim() || null };
    if (type === "bureau") {
      if (!bureauId) throw new Error("Sélectionnez le bureau.");
      payload.bureau_id = Number(bureauId); payload.ecole_id = null;
    } else {
      if (!ecoleId) throw new Error("Sélectionnez l'école.");
      payload.ecole_id = Number(ecoleId); payload.bureau_id = null;
    }
    sbThrow((await supabase.from("personnel").update(payload).eq("id", agent.id)).error);
    onSaved();
  }

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Muter ${agent.nom_complet}`} description="Changer l'affectation de cet agent." onSubmit={save} submitLabel="Confirmer la mutation">
      <Field label="Nouvelle affectation"><SelectInput value={type} onChange={(e) => setType(e.target.value as "bureau" | "ecole")}><option value="bureau">Bureau IEF</option><option value="ecole">École</option></SelectInput></Field>
      {type === "bureau" ? (
        <Field label="Bureau"><SelectInput value={bureauId} onChange={(e) => setBureauId(e.target.value)}><option value="">— Sélectionner —</option>{bureaux.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}</SelectInput></Field>
      ) : (
        <Field label="École"><SelectInput value={ecoleId} onChange={(e) => setEcoleId(e.target.value)}><option value="">— Sélectionner —</option>{ecoles.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}</SelectInput></Field>
      )}
      <Field label="Fonction (optionnel)"><TextInput value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Laisser vide pour conserver" /></Field>
    </FormDialog>
  );
}

function ArchiverDialog({ agent, onClose, onSaved }: { agent: PersonnelRow; onClose: () => void; onSaved: () => void }) {
  const [motif, setMotif] = useState(agent.motif_depart ?? "");
  const [annee, setAnnee] = useState(agent.depart_annee ?? "");

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!motif.trim()) throw new Error("Le motif de départ est obligatoire.");
    const { data: row, error: fetchErr } = await supabase.from("personnel").select("*").eq("id", agent.id).maybeSingle();
    if (fetchErr || !row) throw new Error("Impossible de récupérer l'agent.");
    const { error: insErr } = await supabase.from("personnel_archive").insert({ ...row, motif_depart: motif.trim(), depart_annee: annee.trim() || null, archived_at: new Date().toISOString() });
    if (insErr) throw new Error(insErr.message);
    sbThrow((await supabase.from("personnel").delete().eq("id", agent.id)).error);
    onSaved();
  }

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Archiver ${agent.nom_complet}`} description="Cet agent sera transféré vers les archives." onSubmit={save} submitLabel="Archiver">
      <Field label="Motif de départ *"><TextInput list="motifs-arch-bureau" value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus /><datalist id="motifs-arch-bureau">{MOTIFS_DEPART.map((m) => <option key={m} value={m} />)}</datalist></Field>
      <Field label="Année(s) de départ"><TextInput value={annee} onChange={(e) => setAnnee(e.target.value)} placeholder="Ex : 2023-2024-2025" /></Field>
    </FormDialog>
  );
}
