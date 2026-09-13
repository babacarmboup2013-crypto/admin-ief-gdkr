"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { adminPerms } from "@/lib/admin-perms";
import { CYCLE_LABELS, CYCLE_VALUES, type EcoleRow } from "@/lib/admin-types";
import { useRole } from "@/lib/role-context";
import { AdminTable } from "./admin-table";
import { FormDialog } from "./form-dialog";
import { Field, SelectInput, TextInput } from "./fields";
import { StatusBadge } from "./status";
import { sbThrow } from "./sb";
import { useRows } from "./use-rows";
import Link from "next/link";

export function EcolesTab() {
  const { role, profile } = useRole();
  const perms = adminPerms(role, profile).ecoles;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EcoleRow | null>(null);
  const [nom, setNom] = useState("");
  const [cycle, setCycle] = useState("élémentaire");
  const [localisation, setLocalisation] = useState("");
  const [effectif, setEffectif] = useState("");
  const { rows, loading, refresh } = useRows<EcoleRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("ecoles")
        .select("id, nom, cycle, localisation, effectif_eleves")
        .order("nom", { ascending: true });
      return error || !data ? [] : (data as EcoleRow[]);
    },
    []
  );

  function openAdd() {
    setEditing(null);
    setNom("");
    setCycle("élémentaire");
    setLocalisation("");
    setEffectif("");
    setOpen(true);
  }

  function openEdit(row: EcoleRow) {
    setEditing(row);
    setNom(row.nom);
    setCycle(row.cycle);
    setLocalisation(row.localisation ?? "");
    setEffectif(row.effectif_eleves == null ? "" : String(row.effectif_eleves));
    setOpen(true);
  }

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!nom.trim()) throw new Error("Le nom de l'école est obligatoire.");
    const payload = {
      nom: nom.trim(),
      cycle,
      localisation: localisation.trim() || null,
      effectif_eleves: effectif === "" ? null : Number(effectif),
    };
    if (editing) {
      sbThrow((await supabase.from("ecoles").update(payload).eq("id", editing.id)).error);
    } else {
      sbThrow((await supabase.from("ecoles").insert(payload)).error);
    }
    refresh();
  }

  async function remove(row: EcoleRow) {
    if (!supabase) return;
    const { count } = await supabase
      .from("personnel")
      .select("id", { count: "exact", head: true })
      .eq("ecole_id", row.id);
    const n = count ?? 0;
    const warn = n > 0
      ? `\n\n⚠ ${n} agent(s) rattaché(s) seront également supprimés !`
      : "";
    if (!window.confirm(`Supprimer l'école « ${row.nom} » ?${warn}`)) return;
    const { error } = await supabase.from("ecoles").delete().eq("id", row.id);
    if (error) window.alert(error.message);
    else refresh();
  }

  return (
    <>
      <AdminTable
        title="Écoles de la circonscription"
        subtitle="Établissements rattachés à l'IEF — cycle, localisation, effectifs."
        columns={[
          { header: "École/Etablissement", cell: (r) => <Link href={`/ecole/${r.id}`} className="font-medium text-primary hover:underline">{r.nom}</Link> },
          {
            header: "Cycle",
            cell: (r) => <StatusBadge label={CYCLE_LABELS[r.cycle] ?? r.cycle} tone="ok" />,
          },
          { header: "District", cell: (r) => <span className="text-ink-soft">{r.localisation ?? "—"}</span> },
          { header: "Effectif élèves", cell: (r) => <span className="text-ink-soft">{r.effectif_eleves ?? "—"}</span> },
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
        empty="Aucune école saisie. Commencez par ajouter les établissements réels."
        addLabel="Ajouter une école"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Modifier l'école" : "Nouvelle école"}
        onSubmit={save}
        submitLabel={editing ? "Enregistrer" : "Créer l'école"}
      >
        <Field label="Nom de l'école">
          <TextInput value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cycle">
            <SelectInput value={cycle} onChange={(e) => setCycle(e.target.value)}>
              {CYCLE_VALUES.map((c) => (
                <option key={c} value={c}>
                  {CYCLE_LABELS[c]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Effectif élèves">
            <TextInput
              type="number"
              min={0}
              value={effectif}
              onChange={(e) => setEffectif(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
        <Field label="Localisation">
          <TextInput value={localisation} onChange={(e) => setLocalisation(e.target.value)} />
        </Field>
      </FormDialog>
    </>
  );
}