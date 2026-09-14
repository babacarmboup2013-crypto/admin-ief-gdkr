"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
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
import { Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLES = Object.keys(ROLE_LABELS);

export function UtilisateursTab() {
  const { role, profile } = useRole();
  const perms = adminPerms(role, profile).utilisateurs;
  const bureaux = useBureauxRef();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UtilisateurRow | null>(null);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  function openAdd() {
    setEditing(null);
    setNom("");
    setEmail("");
    setPassword("");
    setFonction("");
    setRoleName("agent_bureau");
    setBureauId("");
    setActif(true);
    setOpen(true);
  }

  function openEdit(row: UtilisateurRow) {
    if (!perms.edit) return;
    setEditing(row);
    setNom(row.nom_complet);
    setEmail(row.email);
    setPassword("");
    setFonction(row.fonction ?? "");
    setRoleName(row.role);
    setBureauId(row.bureau_id == null ? "" : String(row.bureau_id));
    setActif(row.actif);
    setOpen(true);
  }

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!nom.trim()) throw new Error("Le nom complet est obligatoire.");

    if (editing) {
      const payload: Record<string, unknown> = {
        nom_complet: nom.trim(),
        fonction: fonction.trim() || null,
        role: roleName,
        bureau_id: bureauId === "" ? null : Number(bureauId),
        actif,
      };
      sbThrow((await supabase.from("utilisateurs").update(payload).eq("id", editing.id)).error);
    } else {
      if (!email.trim()) throw new Error("L'email est obligatoire.");
      if (!password.trim()) throw new Error("Le mot de passe est obligatoire.");
      if (password.length < 6) throw new Error("Le mot de passe doit faire au moins 6 caractères.");
      if (!supabaseAdmin) throw new Error("Clé service_role manquante — configservez SUPABASE_SERVICE_ROLE_KEY.");

      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: { nom_complet: nom.trim(), fonction: fonction.trim() || null },
      });
      if (authErr) throw new Error(authErr.message);

      const uid = authData.user.id;
      const { error: profileErr } = await supabase.from("utilisateurs").insert({
        id: uid,
        nom_complet: nom.trim(),
        email: email.trim(),
        role: roleName,
        bureau_id: bureauId === "" ? null : Number(bureauId),
        fonction: fonction.trim() || null,
        actif: true,
      });
      if (profileErr) throw new Error(profileErr.message);
    }
    refresh();
  }

  async function remove(row: UtilisateurRow) {
    if (!supabase || !supabaseAdmin) return;
    if (!window.confirm(`Supprimer définitivement « ${row.nom_complet} » ? Cette action est irréversible.`)) return;
    sbThrow((await supabase.from("utilisateurs").delete().eq("id", row.id)).error);
    await supabaseAdmin.auth.admin.deleteUser(row.id);
    refresh();
  }

  async function toggleArchive(row: UtilisateurRow) {
    if (!supabase) return;
    const newActif = !row.actif;
    const action = newActif ? "réactiver" : "désactiver";
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} le compte de « ${row.nom_complet} » ?`)) return;
    sbThrow((await supabase.from("utilisateurs").update({ actif: newActif }).eq("id", row.id)).error);
    refresh();
  }

  return (
    <>
      <AdminTable
        title="Utilisateurs"
        subtitle={`${rows.length} compte(s) — direction et bureaux.`}
        columns={[
          { header: "Nom complet", cell: (r) => <span className="font-medium text-ink">{r.nom_complet}</span> },
          { header: "Email", cell: (r) => <span className="text-ink-soft text-[12px]">{r.email}</span> },
          { header: "Rôle", cell: (r) => <StatusBadge label={ROLE_LABELS[r.role] ?? r.role} tone="cours" /> },
          { header: "Bureau", cell: (r) => <span className="text-ink-soft">{bureauName(r.bureau_id)}</span> },
          { header: "Fonction", cell: (r) => <span className="text-ink-soft">{r.fonction ?? "—"}</span> },
          { header: "Statut", cell: (r) => r.actif ? <StatusBadge label="Actif" tone="ok" /> : <StatusBadge label="Désactivé" tone="attente" /> },
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
        addLabel="Ajouter un utilisateur"
        empty="Aucun utilisateur."
        customActions={(r) => (
          <Button
            variant="outline"
            size="icon-sm"
            className={r.actif ? "text-orange-600 border-orange-300 hover:bg-orange-50" : "text-green-600 border-green-300 hover:bg-green-50"}
            aria-label={r.actif ? "Désactiver" : "Réactiver"}
            onClick={() => toggleArchive(r)}
          >
            <Archive />
          </Button>
        )}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Modifier le profil" : "Nouvel utilisateur"}
        onSubmit={save}
        submitLabel={editing ? "Enregistrer" : "Créer le compte"}
      >
        <Field label="Nom complet">
          <TextInput value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
        </Field>
        <Field label="Email">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!editing}
            placeholder={editing ? email : "prenom@ief.local"}
          />
        </Field>
        {!editing && (
          <Field label="Mot de passe">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rôle">
            <SelectInput value={roleName} onChange={(e) => setRoleName(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Bureau">
            <SelectInput value={bureauId} onChange={(e) => setBureauId(e.target.value)}>
              <option value="">— Aucun —</option>
              {bureaux.rows.map((b) => (
                <option key={b.id} value={b.id}>{b.nom}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Fonction">
          <TextInput value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Ex : RH, Comptable, Agent Examens…" />
        </Field>
        {editing && (
          <Field label="Statut">
            <SelectInput value={actif ? "actif" : "inactif"} onChange={(e) => setActif(e.target.value === "actif")}>
              <option value="actif">Actif</option>
              <option value="inactif">Désactivé</option>
            </SelectInput>
          </Field>
        )}
      </FormDialog>
    </>
  );
}
