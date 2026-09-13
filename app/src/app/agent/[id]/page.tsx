"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { CYCLE_LABELS, PERSONNEL_STATUTS, type PersonnelRow } from "@/lib/admin-types";
import { StatusBadge } from "@/components/admin/status";
import { ArrowLeft, User, MapPin, Briefcase, GraduationCap, Phone, FileText, AlertTriangle } from "lucide-react";

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

export default function AgentPage() {
  const params = useParams();
  const agentId = Number(params.id);
  const [agent, setAgent] = useState<PersonnelRow | null>(null);
  const [bureauNom, setBureauNom] = useState<string | null>(null);
  const [ecoleInfo, setEcoleInfo] = useState<{ nom: string; cycle: string; localisation: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    })();
    return () => { active = false; };
  }, [agentId]);

  if (loading) return <div className="p-8 text-center text-ink-soft">Chargement…</div>;
  if (!agent) return <div className="p-8 text-center text-ink-soft">Agent inconnu. <Link href="/" className="text-primary underline">Retour</Link></div>;

  const statutInfo = PERSONNEL_STATUTS[agent.statut] ?? { label: agent.statut, tone: "attente" as const };
  const lieu = agent.ecole_id ? ecoleInfo?.nom : agent.bureau_id ? `Bureau ${agent.bureau_id} — ${bureauNom ?? ""}` : "—";

  return (
    <div className="max-w-4xl">
      <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink transition-colors">
        <ArrowLeft className="size-3.5" /> Retour
      </Link>

      <div className="mb-6 flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="size-7" />
        </div>
        <div>
          <h1 className="text-[24px] leading-tight text-navy">{agent.nom_complet}</h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">{agent.fonction ?? "—"}</p>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge label={statutInfo.label} tone={statutInfo.tone} />
            {agent.matricule && <span className="font-mono text-[12px] text-ink-soft">{agent.matricule}</span>}
          </div>
        </div>
      </div>

      <Section title="Identité" icon={User}>
        <Row label="Nom complet" value={agent.nom_complet} />
        <Row label="Sexe" value={agent.sexe === "M" ? "Masculin" : agent.sexe === "F" ? "Féminin" : null} />
        <Row label="Date de naissance" value={agent.date_naissance} />
        <Row label="Lieu de naissance" value={agent.lieu_naissance} />
        <Row label="N° CNI" value={agent.n_cni} />
        <Row label="Situation matrimoniale" value={agent.sit_matrimoniale} />
        <Row label="Nombre d'enfants" value={agent.nb_enfants} />
      </Section>

      <Section title="Affectation" icon={Briefcase}>
        <Row label="Affectation" value={lieu} />
        <Row label="Fonction" value={agent.fonction} />
        <Row label="Matricule" value={agent.matricule} />
        <Row label="Date d'entrée" value={agent.date_entree} />
        <Row label="Statut" value={statutInfo.label} />
        <Row label="Source feuille" value={agent.source_feuille} />
        {agent.ecole_id && ecoleInfo && (
          <>
            <Row label="Cycle" value={CYCLE_LABELS[ecoleInfo.cycle] ?? ecoleInfo.cycle} />
            <Row label="Localisation école" value={ecoleInfo.localisation} />
          </>
        )}
      </Section>

      <Section title="Carrière" icon={GraduationCap}>
        <Row label="Corps" value={agent.corps} />
        <Row label="Grade" value={agent.grade} />
        <Row label="Discipline" value={agent.discipline} />
        <Row label="Ancienneté enseignement" value={agent.anciennete_enseignement} />
        <Row label="Ancienneté poste" value={agent.anciennete_poste} />
      </Section>

      <Section title="Formation" icon={GraduationCap}>
        <Row label="Diplôme académique" value={agent.diplome_academique} />
        <Row label="Diplôme professionnel" value={agent.diplome_professionnel} />
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
    </div>
  );
}
