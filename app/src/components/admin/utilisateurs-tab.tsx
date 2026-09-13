"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { adminPerms } from "@/lib/admin-perms";
import { ROLE_LABELS, type UtilisateurRow } from "@/lib/admin-types";
import { useRole } from "@/lib/role-context";
import { AdminTable } from "./admin-table";
import { FormDialog } from "./form-dialog";
import { Field, SelectInput, TextInput } from "./fields";
import { StatusBadge } from "./status";
import { sbThrow } from "./sb";
import { useRows } from "./use-rows";
import { useBureauxRef } from "./use-refs";

const ROLES = Object.keys(ROLE_LABELS);

export function UtilisateursTab() {
  const { role, profile } = useRole();
  const perms = adminPerms(role, profile).utilisateurs;
  const bureaux = useBureauxRef();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UtilisateurRow | null>(null);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [fonction, setFonction] = useState("");
  const [roleName, setRoleName] = useState("agent_bureau");
  const [bureauId, setBureauId] = useState("");
  const [actif, setActif] = useState(true);
  const { rows, loading, refresh } = useRows<UtilisateurRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("id, nom_complet, email, role, bureau_id, fonction, actif")
        .order("nom_complet", { ascending: true });
      return error || !data ? [] : (data as UtilisateurRow[]);
    },
    []
  );

  function bureauName(id: number | null) {
    if (id == null) return "—";
    const b = bureaux.rows.find((x) => x.id === id);
    return b ? b.nom : String(id);
  }

  function openEdit(row: UtilisateurRow) {
    if (!perms.edit) return;
    setEditing(row);
    setNom(row.nom_complet);
    setEmail(row.email);
    setFonction(row.fonction ?? "");
    setRoleName(row.role);
    setBureauId(row.bureau_id == null ? "" : String(row.bureau_id));
    setActif(row.actif);
    setOpen(true);
  }

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!nom.trim()) throw new Error("Le nom complet est obligatoire.");
    sbThrow(
      (
        await supabase
          .from("utilisateurs")
          .update({
            nom_complet: nom.trim(),
            fonction: fonction.trim() || null,
            role: roleName,
            bureau_id: bureauId === "" ? null : Number(bureauId),
            actif,
          })
          .eq("id", editing!.id)
      ).error
    );
    refresh();
  }

  return (
    <>
      <AdminTable
        title="Utilisateurs"
        subtitle="Profils des agents et de la direction."
        columns={[
          { header: "Nom complet", cell: (r) => <span className="font-medium text-ink">{r.nom_complet}</span> },
          { header: "Email", cell: (r) => <span className="text-ink-soft">{r.email}</span> },
          {
            header: "Rôle",
            cell: (r) => <StatusBadge label={ROLE_LABELS[r.role] ?? r.role} tone="cours" />,
          },
          { header: "Bureau", cell: (r) => <span className="text-ink-soft">{bureauName(r.bureau_id)}</span> },
          { header: "Fonction", cell: (r) => <span className="text-ink-soft">{r.fonction ?? "—"}</span> },
          {
            header: "Statut",
            cell: (r) =>
              r.actif ? (
                <StatusBadge label="Actif" tone="ok" />
              ) : (
                <StatusBadge label="Désactivé" tone="attente" />
              ),
          },
        ]}
        rows={rows}
        keyOf={(r) => r.id}
        loading={loading}
        canEdit={perms.edit}
        onEdit={openEdit}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Modifier le profil"
        onSubmit={save}
        submitLabel="Enregistrer"
      >
        <Field label="Nom complet">
          <TextInput value={nom} onChange={(e) => setNom(e.target.value)} />
        </Field>
        <Field label="Email">
          <TextInput value={email} onChange={(e) => setEmail(e.target.value)} disabled />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rôle">
            <SelectInput value={roleName} onChange={(e) => setRoleName(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </SelectInput>
          </Field>
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
        </div>
        <Field label="Fonction">
          <TextInput
            value={fonction}
            onChange={(e) => setFonction(e.target.value)}
            placeholder="Ex : RH, Comptable, Agent Examens…"
          />
        </Field>
        <Field label="Statut">
          <SelectInput value={actif ? "actif" : "inactif"} onChange={(e) => setActif(e.target.value === "actif")}>
            <option value="actif">Actif</option>
            <option value="inactif">Désactivé</option>
          </SelectInput>
        </Field>
      </FormDialog>
    </>
  );
}