"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { adminPerms } from "@/lib/admin-perms";
import { DOSSIER_STATUTS, fmtDate, type DossierRow } from "@/lib/admin-types";
import { useRole } from "@/lib/role-context";
import { AdminTable } from "./admin-table";
import { FormDialog } from "./form-dialog";
import { DateInput, Field, SelectInput, TextInput } from "./fields";
import { StatusBadge } from "./status";
import { sbThrow } from "./sb";
import { useRows } from "./use-rows";
import { useBureauxRef, useUsersRef } from "./use-refs";

const STATUTS = Object.keys(DOSSIER_STATUTS);

export function DossiersTab() {
  const { role, profile, uid } = useRole();
  const perms = adminPerms(role, profile).dossiers;
  const bureaux = useBureauxRef();
  const users = useUsersRef();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DossierRow | null>(null);
  const [titre, setTitre] = useState("");
  const [bureauId, setBureauId] = useState("");
  const [statut, setStatut] = useState("en_cours");
  const [echeance, setEcheance] = useState("");
  const [assigne, setAssigne] = useState("");
  const { rows, loading, refresh } = useRows<DossierRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("dossiers")
        .select("id, bureau_id, titre, statut, echeance, assigne_a, cree_par")
        .order("created_at", { ascending: false });
      return error || !data ? [] : (data as DossierRow[]);
    },
    []
  );

  function bureauName(id: number | null) {
    if (id == null) return "—";
    const b = bureaux.rows.find((x) => x.id === id);
    return b ? b.nom : String(id);
  }

  function userName(id: string | null) {
    if (!id) return "—";
    const u = users.rows.find((x) => x.id === id);
    return u ? u.nom_complet : "—";
  }

  function openAdd() {
    setEditing(null);
    setTitre("");
    setBureauId(profile.bureauId == null ? "" : String(profile.bureauId));
    setStatut("en_cours");
    setEcheance("");
    setAssigne("");
    setOpen(true);
  }

  function openEdit(row: DossierRow) {
    setEditing(row);
    setTitre(row.titre);
    setBureauId(row.bureau_id == null ? "" : String(row.bureau_id));
    setStatut(row.statut);
    setEcheance(row.echeance ? row.echeance.slice(0, 10) : "");
    setAssigne(row.assigne_a ?? "");
    setOpen(true);
  }

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!titre.trim()) throw new Error("Le titre du dossier est obligatoire.");
    const payload: Record<string, unknown> = {
      titre: titre.trim(),
      bureau_id: bureauId === "" ? null : Number(bureauId),
      statut,
      echeance: echeance || null,
      assigne_a: assigne || null,
    };
    if (editing) {
      sbThrow((await supabase.from("dossiers").update(payload).eq("id", editing.id)).error);
    } else {
      sbThrow((await supabase.from("dossiers").insert({ ...payload, cree_par: uid })).error);
    }
    refresh();
  }

  async function remove(row: DossierRow) {
    if (!supabase) return;
    if (!window.confirm(`Supprimer le dossier « ${row.titre} » ?`)) return;
    const { error } = await supabase.from("dossiers").delete().eq("id", row.id);
    if (error) window.alert(error.message);
    else refresh();
  }

  return (
    <>
      <AdminTable
        title="Dossiers"
        subtitle="Suivi des dossiers par bureau — selon votre périmètre d'accès."
        columns={[
          { header: "Titre", cell: (r) => <span className="font-medium text-ink">{r.titre}</span> },
          { header: "Bureau", cell: (r) => <span className="text-ink-soft">{bureauName(r.bureau_id)}</span> },
          { header: "Assigné à", cell: (r) => <span className="text-ink-soft">{userName(r.assigne_a)}</span> },
          { header: "Échéance", cell: (r) => <span className="text-ink-soft">{fmtDate(r.echeance)}</span> },
          {
            header: "Statut",
            cell: (r) => {
              const s = DOSSIER_STATUTS[r.statut] ?? { label: r.statut, tone: "cours" as const };
              return <StatusBadge label={s.label} tone={s.tone} />;
            },
          },
        ]}
        rows={rows}
        keyOf={(r) => r.id}
        loading={loading}
        canAdd={perms.add}
        canEdit={perms.edit}
        canDelete={perms.del}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={remove}
        addLabel="Nouveau dossier"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Modifier le dossier" : "Nouveau dossier"}
        onSubmit={save}
        submitLabel={editing ? "Enregistrer" : "Créer le dossier"}
      >
        <Field label="Titre">
          <TextInput value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bureau">
            <SelectInput value={bureauId} onChange={(e) => setBureauId(e.target.value)}>
              <option value="">— Aucun —</option>
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
                  {DOSSIER_STATUTS[s].label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assigné à">
            <SelectInput value={assigne} onChange={(e) => setAssigne(e.target.value)}>
              <option value="">— Non assigné —</option>
              {users.rows.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nom_complet}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Échéance">
            <DateInput value={echeance} onChange={(e) => setEcheance(e.target.value)} />
          </Field>
        </div>
      </FormDialog>
    </>
  );
}