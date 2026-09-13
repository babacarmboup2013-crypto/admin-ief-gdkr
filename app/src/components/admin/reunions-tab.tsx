"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { adminPerms } from "@/lib/admin-perms";
import { REUNION_STATUTS, type ReunionRow } from "@/lib/admin-types";
import { useRole } from "@/lib/role-context";
import { AdminTable } from "./admin-table";
import { FormDialog } from "./form-dialog";
import { DateTimeInput, Field, SelectInput, TextArea, TextInput } from "./fields";
import { StatusBadge } from "./status";
import { sbThrow } from "./sb";
import { useRows } from "./use-rows";
import { useBureauxRef } from "./use-refs";

const STATUTS = Object.keys(REUNION_STATUTS);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoToLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function ReunionsTab() {
  const { role, profile, uid } = useRole();
  const perms = adminPerms(role, profile).reunions;
  const bureaux = useBureauxRef();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReunionRow | null>(null);
  const [titre, setTitre] = useState("");
  const [bureauId, setBureauId] = useState("");
  const [dateHeure, setDateHeure] = useState("");
  const [statut, setStatut] = useState("planifiee");
  const [ordre, setOrdre] = useState("");
  const [cr, setCr] = useState("");
  const [lien, setLien] = useState("");
  const { rows, loading, refresh } = useRows<ReunionRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("reunions")
        .select("id, titre, bureau_id, organise_par, date_heure, ordre_du_jour, compte_rendu, lien_visio, statut")
        .order("date_heure", { ascending: false });
      return error || !data ? [] : (data as ReunionRow[]);
    },
    []
  );

  function bureauName(id: number | null) {
    if (id == null) return "Transversale";
    const b = bureaux.rows.find((x) => x.id === id);
    return b ? b.nom : String(id);
  }

  function openAdd() {
    setEditing(null);
    setTitre("");
    setBureauId("");
    setDateHeure("");
    setStatut("planifiee");
    setOrdre("");
    setCr("");
    setLien("");
    setOpen(true);
  }

  function openEdit(row: ReunionRow) {
    setEditing(row);
    setTitre(row.titre);
    setBureauId(row.bureau_id == null ? "" : String(row.bureau_id));
    setDateHeure(isoToLocal(row.date_heure));
    setStatut(row.statut);
    setOrdre(row.ordre_du_jour ?? "");
    setCr(row.compte_rendu ?? "");
    setLien(row.lien_visio ?? "");
    setOpen(true);
  }

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!titre.trim()) throw new Error("Le titre de la réunion est obligatoire.");
    if (!dateHeure) throw new Error("La date et l'heure sont obligatoires.");
    const payload: Record<string, unknown> = {
      titre: titre.trim(),
      bureau_id: bureauId === "" ? null : Number(bureauId),
      date_heure: new Date(dateHeure).toISOString(),
      statut,
      ordre_du_jour: ordre.trim() || null,
      compte_rendu: cr.trim() || null,
      lien_visio: lien.trim() || null,
    };
    if (editing) {
      sbThrow((await supabase.from("reunions").update(payload).eq("id", editing.id)).error);
    } else {
      sbThrow((await supabase.from("reunions").insert({ ...payload, organise_par: uid })).error);
    }
    refresh();
  }

  return (
    <>
      <AdminTable
        title="Réunions"
      subtitle="Planification et suivi des réunions des bureaux."
      columns={[
        { header: "Titre", cell: (r) => <span className="font-medium text-ink">{r.titre}</span> },
        { header: "Bureau", cell: (r) => <span className="text-ink-soft">{bureauName(r.bureau_id)}</span> },
        { header: "Date et heure", cell: (r) => <span className="text-ink-soft">{fmtDateTime(r.date_heure)}</span> },
        {
          header: "Statut",
          cell: (r) => {
            const s = REUNION_STATUTS[r.statut] ?? { label: r.statut, tone: "cours" as const };
            return <StatusBadge label={s.label} tone={s.tone} />;
          },
        },
      ]}
      rows={rows}
      keyOf={(r) => r.id}
      loading={loading}
      canAdd={perms.add}
      canEdit={perms.edit}
      onAdd={openAdd}
      onEdit={openEdit}
      addLabel="Planifier une réunion"
    />

    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={editing ? "Modifier la réunion" : "Planifier une réunion"}
      onSubmit={save}
      submitLabel={editing ? "Enregistrer" : "Planifier"}
    >
      <Field label="Titre">
        <TextInput value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bureau">
          <SelectInput value={bureauId} onChange={(e) => setBureauId(e.target.value)}>
            <option value="">Transversale (tous bureaux)</option>
            {bureaux.rows.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nom}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Statut">
          <SelectInput value={statut} onChange={(e) => setStatut(e.target.value)}>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {REUNION_STATUTS[s].label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <Field label="Date et heure">
        <DateTimeInput value={dateHeure} onChange={(e) => setDateHeure(e.target.value)} />
      </Field>
      <Field label="Ordre du jour">
        <TextArea value={ordre} onChange={(e) => setOrdre(e.target.value)} />
      </Field>
      <Field label="Compte rendu">
        <TextArea value={cr} onChange={(e) => setCr(e.target.value)} />
      </Field>
      <Field label="Lien visio">
        <TextInput
          value={lien}
          onChange={(e) => setLien(e.target.value)}
          placeholder="https://…"
        />
</Field>
      </FormDialog>
    </>
  );
}