"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { CYCLE_LABELS, MOTIFS_DEPART, PERSONNEL_STATUTS, SEXE_LABELS, SIT_MAT_OPTIONS, type PersonnelRow } from "@/lib/admin-types";
import { StatusBadge } from "@/components/admin/status";
import { FormDialog } from "@/components/admin/form-dialog";
import { DateInput, Field, SelectInput, TextInput } from "@/components/admin/fields";
import { ArrowLeft, User, MapPin, Briefcase, GraduationCap, Phone, AlertTriangle, Pencil, ArrowRightLeft, Archive, CircleUserRound, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sbThrow } from "@/components/admin/sb";

const SELECT = "id,bureau_id,ecole_id,nom_complet,fonction,date_entree,statut,matricule,sexe,date_naissance,lieu_naissance,corps,grade,discipline,diplome_academique,diplome_professionnel,anciennete_enseignement,anciennete_poste,telephone,email,n_cni,sit_matrimoniale,nb_enfants,os_arrivee,motif_depart,depart_annee,source_feuille";

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between border-b border-border/50 py-2 last:border-0">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span className="text-[13px] font-medium text-ink text-right max-w-[60%]">{String(value)}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden mb-4">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 bg-muted/30">
        <Icon className="size-4 text-ink-soft" />
        <h3 className="font-serif text-[14.5px] text-navy">{title}</h3>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

type BureauRow = { id: number; nom: string };
type EcoleRef = { id: number; nom: string };

export default function AgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = Number(params.id);
  const [agent, setAgent] = useState<PersonnelRow | null>(null);
  const [bureauNom, setBureauNom] = useState<string | null>(null);
  const [ecoleInfo, setEcoleInfo] = useState<{ nom: string; cycle: string; localisation: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [bureaux, setBureaux] = useState<BureauRow[]>([]);
  const [ecoles, setEcoles] = useState<EcoleRef[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [muterOpen, setMuterOpen] = useState(false);
  const [archiverOpen, setArchiverOpen] = useState(false);
  const [addBureauOpen, setAddBureauOpen] = useState(false);
  const [extraBureaux, setExtraBureaux] = useState<{ id: number; nom: string }[]>([]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    (async () => {
      const [bRes, eRes] = await Promise.all([
        supabase.from("bureaux").select("id,nom").order("id"),
        supabase.from("ecoles").select("id,nom").order("nom"),
      ]);
      if (!active) return;
      if (bRes.data) setBureaux(bRes.data as BureauRow[]);
      if (eRes.data) setEcoles(eRes.data as EcoleRef[]);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase.from("personnel").select(SELECT).eq("id", agentId).maybeSingle();
      if (!active) return;
      if (error || !data) { setAgent(null); setLoading(false); return; }
      const a = data as PersonnelRow;
      setAgent(a);
      if (a.bureau_id) {
        const { data: b } = await supabase.from("bureaux").select("nom").eq("id", a.bureau_id).maybeSingle();
        if (active && b) setBureauNom(b.nom);
      }
      if (a.ecole_id) {
        const { data: e } = await supabase.from("ecoles").select("nom,cycle,localisation").eq("id", a.ecole_id).maybeSingle();
        if (active && e) setEcoleInfo(e as any);
      }
      const { data: pb } = await supabase
        .from("personnel_bureaux")
        .select("bureau_id")
        .eq("personnel_id", agentId);
      if (active && pb && pb.length > 0) {
        const ids = pb.map((r: any) => r.bureau_id);
        const { data: bs } = await supabase.from("bureaux").select("id,nom").in("id", ids);
        if (active && bs) setExtraBureaux(bs as { id: number; nom: string }[]);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [agentId]);

  async function reloadAgent() {
    if (!supabase) return;
    const { data } = await supabase.from("personnel").select(SELECT).eq("id", agentId).maybeSingle();
    if (!data) return;
    const a = data as PersonnelRow;
    setAgent(a);
    setBureauNom(null);
    setEcoleInfo(null);
    if (a.bureau_id) {
      const { data: b } = await supabase.from("bureaux").select("nom").eq("id", a.bureau_id).maybeSingle();
      if (b) setBureauNom(b.nom);
    }
    if (a.ecole_id) {
      const { data: e } = await supabase.from("ecoles").select("nom,cycle,localisation").eq("id", a.ecole_id).maybeSingle();
      if (e) setEcoleInfo(e as any);
    }
    const { data: pb } = await supabase
      .from("personnel_bureaux")
      .select("bureau_id")
      .eq("personnel_id", agentId);
    if (pb && pb.length > 0) {
      const ids = pb.map((r: any) => r.bureau_id);
      const { data: bs } = await supabase.from("bureaux").select("id,nom").in("id", ids);
      if (bs) setExtraBureaux(bs as { id: number; nom: string }[]);
    } else {
      setExtraBureaux([]);
    }
  }

  if (loading) return <div className="p-8 text-center text-ink-soft">Chargement…</div>;
  if (!agent) return <div className="p-8 text-center text-ink-soft">Agent inconnu. <Link href="/personnel" className="text-primary underline">Retour</Link></div>;

  const statutInfo = PERSONNEL_STATUTS[agent.statut] ?? { label: agent.statut, tone: "attente" as const };
  const lieu = agent.ecole_id ? ecoleInfo?.nom : agent.bureau_id ? `Bureau ${agent.bureau_id} — ${bureauNom ?? ""}` : "—";

  return (
    <div className="max-w-4xl">
      <Link href="/personnel" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink transition-colors">
        <ArrowLeft className="size-3.5" /> Retour
      </Link>

      <div className="mb-6 flex items-start gap-4">
        <div className={`flex size-14 shrink-0 items-center justify-center rounded-full text-white ${agent.sexe === "F" ? "bg-pink-500" : "bg-blue-600"}`}>
          <span className="text-[22px] font-bold">{agent.nom_complet?.charAt(0) ?? "?"}</span>
        </div>
        <div className="flex-1">
          <h1 className="text-[24px] leading-tight text-navy">{agent.nom_complet}</h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">{agent.fonction ?? "—"}</p>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge label={statutInfo.label} tone={statutInfo.tone} />
            {agent.matricule && <span className="font-mono text-[12px] text-ink-soft">{agent.matricule}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" /> Modifier
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMuterOpen(true)}>
            <ArrowRightLeft className="size-3.5" /> Muter
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAddBureauOpen(true)}>
            <Plus className="size-3.5" /> Bureau
          </Button>
          <Button variant="outline" size="sm" className="text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => setArchiverOpen(true)}>
            <Archive className="size-3.5" /> Archiver
          </Button>
        </div>
      </div>

      <Section title="Identité" icon={User}>
        <Row label="Nom complet" value={agent.nom_complet} />
        <Row label="Matricule" value={agent.matricule} />
        <Row label="Sexe" value={agent.sexe === "M" ? "Masculin" : agent.sexe === "F" ? "Féminin" : null} />
      </Section>

      <Section title="Affectation" icon={Briefcase}>
        <Row label="Affectation" value={lieu} />
        <Row label="Fonction" value={agent.fonction} />
        <Row label="Date d'entrée" value={agent.date_entree} />
        <Row label="Statut" value={statutInfo.label} />
        <Row label="Source feuille" value={agent.source_feuille} />
        <Row label="OS arrivée" value={agent.os_arrivee} />
        {agent.ecole_id && ecoleInfo && (
          <>
            <Row label="Cycle" value={CYCLE_LABELS[ecoleInfo.cycle] ?? ecoleInfo.cycle} />
            <Row label="Localisation école" value={ecoleInfo.localisation} />
          </>
        )}
      </Section>

      <Section title="État civil" icon={User}>
        <Row label="Date de naissance" value={agent.date_naissance} />
        <Row label="Lieu de naissance" value={agent.lieu_naissance} />
        <Row label="N° CNI" value={agent.n_cni} />
        <Row label="Situation matrimoniale" value={agent.sit_matrimoniale} />
        <Row label="Enfants" value={agent.nb_enfants} />
      </Section>

      <Section title="Carrière" icon={GraduationCap}>
        <Row label="Corps" value={agent.corps} />
        <Row label="Grade" value={agent.grade} />
        <Row label="Discipline" value={agent.discipline} />
        <Row label="Diplôme académique" value={agent.diplome_academique} />
        <Row label="Diplôme professionnel" value={agent.diplome_professionnel} />
        <Row label="Ancienneté enseignement" value={agent.anciennete_enseignement} />
        <Row label="Ancienneté poste" value={agent.anciennete_poste} />
      </Section>

      <Section title="Contact" icon={Phone}>
        <Row label="Téléphone" value={agent.telephone} />
        <Row label="Email" value={agent.email} />
      </Section>

      {agent.statut === "inactif" && (
        <Section title="Départ" icon={AlertTriangle}>
          <Row label="Motif de départ" value={agent.motif_depart} />
          <Row label="Année(s) de départ" value={agent.depart_annee} />
        </Section>
      )}

      {agent.ecole_id && ecoleInfo && (
        <Section title="École d'affectation" icon={MapPin}>
          <Row label="Nom" value={ecoleInfo.nom} />
          <Row label="Cycle" value={CYCLE_LABELS[ecoleInfo.cycle] ?? ecoleInfo.cycle} />
          <Row label="Localisation" value={ecoleInfo.localisation} />
          <div className="mt-2">
            <Link href={`/ecole/${agent.ecole_id}`} className="text-[13px] text-primary hover:underline">Voir la fiche école →</Link>
          </div>
        </Section>
      )}

      {extraBureaux.length > 0 && (
        <Section title="Bureaux supplémentaires" icon={Briefcase}>
          {extraBureaux.map((b) => (
            <div key={b.id} className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
              <span className="text-[13px] font-medium text-ink">{b.nom}</span>
              <Button
                variant="outline"
                size="icon-sm"
                className="text-red-500 border-red-300 hover:bg-red-50"
                onClick={async () => {
                  if (!supabase) return;
                  if (!window.confirm(`Retirer « ${b.nom} » des bureaux supplémentaires ?`)) return;
                  sbThrow(
                    (await supabase
                      .from("personnel_bureaux")
                      .delete()
                      .eq("personnel_id", agentId)
                      .eq("bureau_id", b.id)).error
                  );
                  reloadAgent();
                }}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </Section>
      )}

      {agent.bureau_id == null && extraBureaux.length === 0 && null}

      {editOpen && <EditDialog agent={agent} bureaux={bureaux} ecoles={ecoles} onClose={() => setEditOpen(false)} onSaved={reloadAgent} />}
      {muterOpen && <MuterDialog agent={agent} bureaux={bureaux} ecoles={ecoles} onClose={() => setMuterOpen(false)} onSaved={reloadAgent} />}
      {archiverOpen && <ArchiverDialog agent={agent} onClose={() => setArchiverOpen(false)} />}
      {addBureauOpen && <AddExtraBureauDialog agentId={agentId} bureaux={bureaux} existingIds={[...(agent.bureau_id ? [agent.bureau_id] : []), ...extraBureaux.map((b) => b.id)]} onClose={() => setAddBureauOpen(false)} onSaved={reloadAgent} />}
    </div>
  );
}

function EditDialog({ agent, bureaux, ecoles, onClose, onSaved }: { agent: PersonnelRow; bureaux: BureauRow[]; ecoles: EcoleRef[]; onClose: () => void; onSaved: () => void }) {
  const [nom, setNom] = useState(agent.nom_complet);
  const [matricule, setMatricule] = useState(agent.matricule ?? "");
  const [sexe, setSexe] = useState(agent.sexe ?? "");
  const [type, setType] = useState<"bureau" | "ecole">(agent.ecole_id != null ? "ecole" : "bureau");
  const [bureauId, setBureauId] = useState(agent.bureau_id == null ? "" : String(agent.bureau_id));
  const [ecoleId, setEcoleId] = useState(agent.ecole_id == null ? "" : String(agent.ecole_id));
  const [fonction, setFonction] = useState(agent.fonction ?? "");
  const [dateEntree, setDateEntree] = useState(agent.date_entree?.slice(0, 10) ?? "");
  const [dateNaissance, setDateNaissance] = useState(agent.date_naissance?.slice(0, 10) ?? "");
  const [lieuNaissance, setLieuNaissance] = useState(agent.lieu_naissance ?? "");
  const [corps, setCorps] = useState(agent.corps ?? "");
  const [grade, setGrade] = useState(agent.grade ?? "");
  const [discipline, setDiscipline] = useState(agent.discipline ?? "");
  const [diplAc, setDiplAc] = useState(agent.diplome_academique ?? "");
  const [diplProf, setDiplProf] = useState(agent.diplome_professionnel ?? "");
  const [ancEns, setAncEns] = useState(agent.anciennete_enseignement ?? "");
  const [ancPoste, setAncPoste] = useState(agent.anciennete_poste ?? "");
  const [telephone, setTelephone] = useState(agent.telephone ?? "");
  const [email, setEmail] = useState(agent.email ?? "");
  const [nCni, setNCni] = useState(agent.n_cni ?? "");
  const [sitMat, setSitMat] = useState(agent.sit_matrimoniale ?? "");
  const [nbEnfants, setNbEnfants] = useState(agent.nb_enfants == null ? "" : String(agent.nb_enfants));
  const [osArrivee, setOsArrivee] = useState(agent.os_arrivee ?? "");
  const [statut, setStatut] = useState(agent.statut);
  const [motif, setMotif] = useState(agent.motif_depart ?? "");
  const [departAnnee, setDepartAnnee] = useState(agent.depart_annee ?? "");

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
    sbThrow((await supabase.from("personnel").update(payload).eq("id", agent.id)).error);
    onSaved();
    onClose();
  }

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Modifier la fiche" onSubmit={save}>
      <Field label="Nom complet">
        <TextInput value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Matricule">
          <TextInput value={matricule} onChange={(e) => setMatricule(e.target.value)} />
        </Field>
        <Field label="Sexe">
          <SelectInput value={sexe} onChange={(e) => setSexe(e.target.value)}>
            <option value="">—</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </SelectInput>
        </Field>
      </div>
      <Field label="Affectation">
        <SelectInput value={type} onChange={(e) => setType(e.target.value as "bureau" | "ecole")}>
          <option value="bureau">Bureau IEF</option>
          <option value="ecole">École</option>
        </SelectInput>
      </Field>
      {type === "bureau" ? (
        <Field label="Bureau">
          <SelectInput value={bureauId} onChange={(e) => setBureauId(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {bureaux.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </SelectInput>
        </Field>
      ) : (
        <Field label="École">
          <SelectInput value={ecoleId} onChange={(e) => setEcoleId(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {ecoles.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </SelectInput>
        </Field>
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
        <Field label="Discipline"><TextInput value={discipline} onChange={(e) => setDiscipline(e.target.value)} /></Field>
        <Field label="Diplôme académique"><TextInput value={diplAc} onChange={(e) => setDiplAc(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Diplôme professionnel"><TextInput value={diplProf} onChange={(e) => setDiplProf(e.target.value)} /></Field>
        <Field label="Ancienneté enseignement"><TextInput value={ancEns} onChange={(e) => setAncEns(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ancienneté poste"><TextInput value={ancPoste} onChange={(e) => setAncPoste(e.target.value)} /></Field>
        <Field label="Téléphone"><TextInput value={telephone} onChange={(e) => setTelephone(e.target.value)} /></Field>
      </div>
      <Field label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="N° CNI"><TextInput value={nCni} onChange={(e) => setNCni(e.target.value)} /></Field>
        <Field label="Situation matrimoniale">
          <SelectInput value={sitMat} onChange={(e) => setSitMat(e.target.value)}>
            <option value="">—</option>
            {SIT_MAT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </SelectInput>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Enfants"><TextInput type="number" min={0} value={nbEnfants} onChange={(e) => setNbEnfants(e.target.value)} /></Field>
        <Field label="OS arrivée"><TextInput value={osArrivee} onChange={(e) => setOsArrivee(e.target.value)} /></Field>
      </div>
      <Field label="Statut">
        <SelectInput value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
        </SelectInput>
      </Field>
      {statut === "inactif" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Motif départ">
            <TextInput list="motifs-depart-edit" value={motif} onChange={(e) => setMotif(e.target.value)} />
            <datalist id="motifs-depart-edit">{MOTIFS_DEPART.map((m) => <option key={m} value={m} />)}</datalist>
          </Field>
          <Field label="Année départ"><TextInput value={departAnnee} onChange={(e) => setDepartAnnee(e.target.value)} /></Field>
        </div>
      )}
    </FormDialog>
  );
}

function MuterDialog({ agent, bureaux, ecoles, onClose, onSaved }: { agent: PersonnelRow; bureaux: BureauRow[]; ecoles: EcoleRef[]; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"bureau" | "ecole">(agent.ecole_id != null ? "ecole" : "bureau");
  const [bureauId, setBureauId] = useState(agent.bureau_id == null ? "" : String(agent.bureau_id));
  const [ecoleId, setEcoleId] = useState(agent.ecole_id == null ? "" : String(agent.ecole_id));
  const [fonction, setFonction] = useState(agent.fonction ?? "");

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    const payload: Record<string, unknown> = { fonction: fonction.trim() || null };
    if (type === "bureau") {
      if (!bureauId) throw new Error("Sélectionnez le bureau.");
      payload.bureau_id = Number(bureauId);
      payload.ecole_id = null;
    } else {
      if (!ecoleId) throw new Error("Sélectionnez l'école.");
      payload.ecole_id = Number(ecoleId);
      payload.bureau_id = null;
    }
    sbThrow((await supabase.from("personnel").update(payload).eq("id", agent.id)).error);
    onSaved();
    onClose();
  }

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Muter ${agent.nom_complet}`} description="Changer l'affectation de cet agent." onSubmit={save} submitLabel="Confirmer la mutation">
      <Field label="Nouvelle affectation">
        <SelectInput value={type} onChange={(e) => setType(e.target.value as "bureau" | "ecole")}>
          <option value="bureau">Bureau IEF</option>
          <option value="ecole">École</option>
        </SelectInput>
      </Field>
      {type === "bureau" ? (
        <Field label="Bureau">
          <SelectInput value={bureauId} onChange={(e) => setBureauId(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {bureaux.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </SelectInput>
        </Field>
      ) : (
        <Field label="École">
          <SelectInput value={ecoleId} onChange={(e) => setEcoleId(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {ecoles.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </SelectInput>
        </Field>
      )}
      <Field label="Fonction (optionnel)">
        <TextInput value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Laisser vide pour conserver" />
      </Field>
    </FormDialog>
  );
}

function ArchiverDialog({ agent, onClose }: { agent: PersonnelRow; onClose: () => void }) {
  const router = useRouter();
  const [motif, setMotif] = useState(agent.motif_depart ?? "");
  const [annee, setAnnee] = useState(agent.depart_annee ?? "");

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!motif.trim()) throw new Error("Le motif de départ est obligatoire.");

    const { data: row, error: fetchErr } = await supabase.from("personnel").select("*").eq("id", agent.id).maybeSingle();
    if (fetchErr || !row) throw new Error("Impossible de récupérer l'agent.");

    const { error: insErr } = await supabase.from("personnel_archive").insert({
      ...row,
      motif_depart: motif.trim(),
      depart_annee: annee.trim() || null,
      archived_at: new Date().toISOString(),
    });
    if (insErr) throw new Error(insErr.message);

    sbThrow((await supabase.from("personnel").delete().eq("id", agent.id)).error);
    router.push("/personnel");
  }

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Archiver ${agent.nom_complet}`} description="Cet agent sera transféré vers les archives et supprimé du personnel actif." onSubmit={save} submitLabel="Archiver">
      <Field label="Motif de départ *">
        <TextInput list="motifs-arch" value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus />
        <datalist id="motifs-arch">{MOTIFS_DEPART.map((m) => <option key={m} value={m} />)}</datalist>
      </Field>
      <Field label="Année(s) de départ">
        <TextInput value={annee} onChange={(e) => setAnnee(e.target.value)} placeholder="Ex : 2023-2024-2025" />
      </Field>
    </FormDialog>
  );
}

function AddExtraBureauDialog({ agentId, bureaux, existingIds, onClose, onSaved }: { agentId: number; bureaux: BureauRow[]; existingIds: number[]; onClose: () => void; onSaved: () => void }) {
  const [selectedId, setSelectedId] = useState("");
  const available = bureaux.filter((b) => !existingIds.includes(b.id));

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!selectedId) throw new Error("Sélectionnez un bureau.");
    sbThrow(
      (await supabase.from("personnel_bureaux").insert({
        personnel_id: agentId,
        bureau_id: Number(selectedId),
      })).error
    );
    onSaved();
    onClose();
  }

  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Ajouter un bureau supplémentaire" description="L'agent sera associé à ce bureau en plus de son affectation principale." onSubmit={save} submitLabel="Ajouter">
      <Field label="Bureau">
        <SelectInput value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">— Sélectionner —</option>
          {available.map((b) => (
            <option key={b.id} value={b.id}>{b.nom}</option>
          ))}
        </SelectInput>
      </Field>
      {available.length === 0 && (
        <p className="text-[12.5px] text-ink-soft">Tous les bureaux sont déjà associés à cet agent.</p>
      )}
    </FormDialog>
  );
}
