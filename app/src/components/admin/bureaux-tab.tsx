"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { adminPerms } from "@/lib/admin-perms";
import type { BureauRow } from "@/lib/admin-types";
import { useRole } from "@/lib/role-context";
import { AdminTable } from "./admin-table";
import { FormDialog } from "./form-dialog";
import { Field, TextInput } from "./fields";
import { sbThrow } from "./sb";
import { useRows } from "./use-rows";

export function BureauxTab() {
  const { role, profile } = useRole();
  const perms = adminPerms(role, profile).bureaux;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BureauRow | null>(null);
  const [nom, setNom] = useState("");
  const [busy, setBusy] = useState(false);
  const { rows, loading, refresh } = useRows<BureauRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("bureaux")
        .select("id, nom")
        .order("id", { ascending: true });
      return error || !data ? [] : (data as BureauRow[]);
    },
    []
  );

  function openAdd() {
    setEditing(null);
    setNom("");
    setOpen(true);
  }

  function openEdit(row: BureauRow) {
    setEditing(row);
    setNom(row.nom);
    setOpen(true);
  }

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    const value = nom.trim();
    if (!value) throw new Error("Le nom du bureau est obligatoire.");
    setBusy(true);
    try {
      if (editing) {
        sbThrow((await supabase.from("bureaux").update({ nom: value }).eq("id", editing.id)).error);
      } else {
        sbThrow((await supabase.from("bureaux").insert({ nom: value })).error);
      }
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: BureauRow) {
    if (!supabase) return;
    if (!window.confirm(`Supprimer le bureau « ${row.nom} » ?`)) return;
    const { error } = await supabase.from("bureaux").delete().eq("id", row.id);
    if (error) window.alert(error.message);
    else refresh();
  }

  return (
    <>
      <AdminTable
        title="Bureaux"
        subtitle="Les 11 bureaux de l'IEF — libellés officiels."
        columns={[
          { header: "#", cell: (r) => <span className="text-ink-soft">{r.id}</span>, className: "w-14" },
          { header: "Nom du bureau", cell: (r) => <span className="font-medium text-ink">{r.nom}</span> },
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
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Modifier le bureau" : "Nouveau bureau"}
        onSubmit={save}
        submitLabel={editing ? "Enregistrer" : "Créer le bureau"}
      >
        <Field label="Nom du bureau">
          <TextInput
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Examens et Concours"
            autoFocus
            disabled={busy}
          />
        </Field>
      </FormDialog>
    </>
  );
}