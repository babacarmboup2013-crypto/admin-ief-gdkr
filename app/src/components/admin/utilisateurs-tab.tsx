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
import { Archive, KeyRound, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ROLES = Object.keys(ROLE_LABELS);

async function appellerApiAdmin(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin/utilisateurs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}

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

  const [motDePasseAffiche, setMotDePasseAffiche] = useState<string | null>(null);
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwTarget, setPwTarget] = useState<UtilisateurRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

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

      const resultat = await appellerApiAdmin({
        action: "creer",
        nom_complet: nom.trim(),
        email: email.trim(),
        role: roleName,
        bureau_id: bureauId === "" ? null : Number(bureauId),
        fonction: fonction.trim() || null,
      });
      setMotDePasseAffiche(resultat.mot_de_passe_temporaire);
    }
    refresh();
  }

  async function remove(row: UtilisateurRow) {
    if (!window.confirm(`Supprimer définitivement « ${row.nom_complet} » ? Cette action est irréversible.`)) return;
    await appellerApiAdmin({ action: "supprimer", id: row.id });
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

  async function resetPassword(row: UtilisateurRow) {
    if (!window.confirm(`Générer un nouveau mot de passe temporaire pour « ${row.nom_complet} » ?`)) return;
    try {
      const resultat = await appellerApiAdmin({ action: "reinitialiser_mot_de_passe", id: row.id });
      setMotDePasseAffiche(resultat.mot_de_passe_temporaire);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  function openPwDialog(row: UtilisateurRow) {
    setPwTarget(row);
    setNewPassword("");
    setConfirmPassword("");
    setPwError(null);
    setPwSuccess(false);
    setPwDialogOpen(true);
  }

  async function saveCustomPassword() {
    setPwError(null);
    setPwSuccess(false);
    if (newPassword.length < 6) {
      setPwError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Les mots de passe ne correspondent pas.");
      return;
    }
    setPwBusy(true);
    try {
      await appellerApiAdmin({ action: "modifier_mot_de_passe", id: pwTarget!.id, nouveau_mot_de_passe: newPassword });
      setPwSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwDialogOpen(false), 1500);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
    setPwBusy(false);
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
          <>
            {perms.edit ? (
              <>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Réinitialiser le mot de passe"
                  title="Réinitialiser le mot de passe"
                  onClick={() => resetPassword(r)}
                >
                  <KeyRound />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Définir un mot de passe"
                  title="Définir un mot de passe"
                  onClick={() => openPwDialog(r)}
                >
                  <Lock />
                </Button>
              </>
            ) : null}
            <Button
              variant="outline"
              size="icon-sm"
              className={r.actif ? "text-orange-600 border-orange-300 hover:bg-orange-50" : "text-green-600 border-green-300 hover:bg-green-50"}
              aria-label={r.actif ? "Désactiver" : "Réactiver"}
              title={r.actif ? "Désactiver" : "Réactiver"}
              onClick={() => toggleArchive(r)}
            >
              <Archive />
            </Button>
          </>
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
          <p className="text-[12px] text-ink-soft -mt-2">
            Un mot de passe temporaire sera généré automatiquement à la création.
            L&apos;utilisateur devra le changer à sa première connexion.
          </p>
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

      <Dialog open={!!motDePasseAffiche} onOpenChange={(o) => !o && setMotDePasseAffiche(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mot de passe temporaire généré</DialogTitle>
            <DialogDescription>
              Communiquez-le à l&apos;agent par un canal sûr. Il devra le changer dès sa première
              connexion. Il ne sera plus jamais affiché.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2.5">
            <span className="font-mono text-[15px] tracking-wide">{motDePasseAffiche}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (motDePasseAffiche) navigator.clipboard.writeText(motDePasseAffiche);
              }}
            >
              Copier
            </Button>
          </div>
          <Button onClick={() => setMotDePasseAffiche(null)}>J&apos;ai noté le mot de passe</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Définir le mot de passe</DialogTitle>
            <DialogDescription>
              Définissez un nouveau mot de passe pour <strong>{pwTarget?.nom_complet}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Field label="Nouveau mot de passe">
              <TextInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Confirmer">
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {pwError && (
              <div className="rounded-lg border border-red-300/40 bg-red-50 px-3 py-2 text-[12px] text-red-600">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="rounded-lg border border-teal-300/40 bg-teal-50 px-3 py-2 text-[12px] text-teal-600">
                Mot de passe modifié avec succès !
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveCustomPassword} disabled={pwBusy}>
              {pwBusy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
