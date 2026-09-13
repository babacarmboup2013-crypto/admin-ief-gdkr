"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { adminPerms } from "@/lib/admin-perms";
import { PERSONNEL_STATUTS, fmtDate, type PersonnelRow } from "@/lib/admin-types";
import { useRole } from "@/lib/role-context";
import { AdminTable } from "./admin-table";
import { FormDialog } from "./form-dialog";
import { DateInput, Field, SelectInput, TextInput } from "./fields";
import { StatusBadge } from "./status";
import { sbThrow } from "./sb";
import { useRows } from "./use-rows";
import { useBureauxRef, useEcolesRef } from "./use-refs";

export function PersonnelTab() {
  const { role, profile } = useRole();
  const perms = adminPerms(role, profile).personnel;
  const bureaux = useBureauxRef();
  const ecoles = useEcolesRef();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PersonnelRow | null>(null);
  const [nom, setNom] = useState("");
  const [type, setType] = useState<"bureau" | "ecole">("bureau");
  const [bureauId, setBureauId] = useState("");
  const [ecoleId, setEcoleId] = useState("");
  const [fonction, setFonction] = useState("");
  const [dateEntree, setDateEntree] = useState("");
  const [statut, setStatut] = useState("actif");
  const { rows, loading, refresh } = useRows<PersonnelRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("personnel")
        .select("id, bureau_id, ecole_id, nom_complet, fonction, date_entree, statut")
        .order("nom_complet", { ascending: true });
      return error || !data ? [] : (data as PersonnelRow[]);
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
    setNom("");
    setType("bureau");
    setBureauId("");
    setEcoleId("");
    setFonction("");
    setDateEntree("");
    setStatut("actif");
    setOpen(true);
  }

  function openEdit(row: PersonnelRow) {
    setEditing(row);
    setNom(row.nom_complet);
    const isEcole = row.ecole_id != null;
    setType(isEcole ? "ecole" : "bureau");
    setBureauId(row.bureau_id == null ? "" : String(row.bureau_id));
    setEcoleId(row.ecole_id == null ? "" : String(row.ecole_id));
    setFonction(row.fonction ?? "");
    setDateEntree(row.date_entree ? row.date_entree.slice(0, 10) : "");
    setStatut(row.statut);
    setOpen(true);
  }

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!nom.trim()) throw new Error("Le nom complet est obligatoire.");
    const payload: Record<string, unknown> = {
      nom_complet: nom.trim(),
      fonction: fonction.trim() || null,
      date_entree: dateEntree || null,
      statut,
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

  return (
    <>
      <AdminTable
        title="Personnel"
        subtitle="Agents des bureaux IEF et personnels des écoles."
        columns={[
          { header: "Nom complet", cell: (r) => <span className="font-medium text-ink">{r.nom_complet}</span> },
          { header: "Affectation", cell: (r) => <span className="text-ink-soft">{affectation(r).label}</span> },
          { header: "Fonction", cell: (r) => <span className="text-ink-soft">{r.fonction ?? "—"}</span> },
          { header: "Date d'entrée", cell: (r) => <span className="text-ink-soft">{fmtDate(r.date_entree)}</span> },
          {
            header: "Statut",
            cell: (r) => {
              const s = PERSONNEL_STATUTS[r.statut] ?? { label: r.statut, tone: "attente" as const };
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
        addLabel="Ajouter une personne"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Modifier le personnel" : "Nouvelle personne"}
        onSubmit={save}
        submitLabel={editing ? "Enregistrer" : "Ajouter"}
      >
        <Field label="Nom complet">
          <TextInput value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
        </Field>
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
              {bureaux.rows.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : (
          <Field label="École">
            <SelectInput value={ecoleId} onChange={(e) => setEcoleId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {ecoles.rows.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
            </SelectInput>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fonction">
            <TextInput
              value={fonction}
              onChange={(e) => setFonction(e.target.value)}
              placeholder="Ex : Enseignant, Directeur…"
            />
          </Field>
          <Field label="Date d'entrée">
            <DateInput value={dateEntree} onChange={(e) => setDateEntree(e.target.value)} />
          </Field>
        </div>
        <Field label="Statut">
          <SelectInput value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
          </SelectInput>
        </Field>
      </FormDialog>
    </>
  );
}