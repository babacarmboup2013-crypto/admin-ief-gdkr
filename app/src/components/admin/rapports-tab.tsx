"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { adminPerms, voitTousLesBureaux } from "@/lib/admin-perms";
import { RAPPORT_STATUTS, type RapportRow } from "@/lib/admin-types";
import { useRole } from "@/lib/role-context";
import { AdminTable } from "./admin-table";
import { FormDialog } from "./form-dialog";
import { Field, SelectInput, TextArea, TextInput } from "./fields";
import { StatusBadge } from "./status";
import { sbThrow } from "./sb";
import { useRows } from "./use-rows";
import { useBureauxRef, useUsersRef } from "./use-refs";

const STATUTS = Object.keys(RAPPORT_STATUTS);

export function RapportsTab() {
  const { role, profile, uid } = useRole();
  const perms = adminPerms(role, profile).rapports;
  const bureaux = useBureauxRef();
  const users = useUsersRef();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RapportRow | null>(null);
  const [titre, setTitre] = useState("");
  const [bureauId, setBureauId] = useState("");
  const [filtreBureau, setFiltreBureau] = useState("");
  const [contenu, setContenu] = useState("");
  const [statut, setStatut] = useState("brouillon");
  const { rows, loading, refresh } = useRows<RapportRow>(
    async () => {
      if (!supabase) return [];
      let requete = supabase
        .from("rapports")
        .select("id, bureau_id, titre, contenu, statut, soumis_par, valide_par");

      if (!voitTousLesBureaux(role)) {
        if (profile.bureauId == null) return [];
        requete = requete.eq("bureau_id", profile.bureauId);
      } else if (filtreBureau !== "") {
        requete = requete.eq("bureau_id", Number(filtreBureau));
      }

      const { data, error } = await requete.order("created_at", {
        ascending: false,
      });
      return error || !data ? [] : (data as RapportRow[]);
    },
    [role, profile.bureauId, filtreBureau]
  );

  const bureauxPermis = voitTousLesBureaux(role)
    ? bureaux.rows
    : bureaux.rows.filter((b) => b.id === profile.bureauId);

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
    setContenu("");
    setStatut("brouillon");
    setOpen(true);
  }

  function openEdit(row: RapportRow) {
    setEditing(row);
    setTitre(row.titre);
    setBureauId(row.bureau_id == null ? "" : String(row.bureau_id));
    setContenu(row.contenu ?? "");
    setStatut(row.statut);
    setOpen(true);
  }

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!titre.trim()) throw new Error("Le titre du rapport est obligatoire.");
    const payload: Record<string, unknown> = {
      titre: titre.trim(),
      bureau_id: bureauId === "" ? null : Number(bureauId),
      contenu: contenu.trim() || null,
      statut,
    };
    if (editing) {
      sbThrow((await supabase.from("rapports").update(payload).eq("id", editing.id)).error);
    } else {
      sbThrow((await supabase.from("rapports").insert({ ...payload, soumis_par: uid })).error);
    }
    refresh();
  }

  async function remove(row: RapportRow) {
    if (!supabase) return;
    if (!window.confirm(`Supprimer le rapport « ${row.titre} » ?`)) return;
    const { error } = await supabase.from("rapports").delete().eq("id", row.id);
    if (error) window.alert(error.message);
    else refresh();
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-[12.5px] text-ink-soft">
          {voitTousLesBureaux(role)
            ? "Vue IEF / Super Admin : tous les bureaux."
            : `Rapports de votre bureau : ${bureaux.rows.find((b) => b.id === profile.bureauId)?.nom ?? "—"}`}
        </p>
        {voitTousLesBureaux(role) ? (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-ink-soft">Filtrer par bureau</span>
            <SelectInput
              value={filtreBureau}
              onChange={(e) => setFiltreBureau(e.target.value)}
              className="w-[220px]"
            >
              <option value="">Tous les bureaux</option>
              {bureaux.rows.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom}
                </option>
              ))}
            </SelectInput>
          </div>
        ) : null}
      </div>
      <AdminTable
        title="Rapports"
        subtitle="Rapports saisis par les bureaux — selon votre périmètre d'accès."
        columns={[
          { header: "Titre", cell: (r) => <span className="font-medium text-ink">{r.titre}</span> },
          { header: "Bureau", cell: (r) => <span className="text-ink-soft">{bureauName(r.bureau_id)}</span> },
          { header: "Soumis par", cell: (r) => <span className="text-ink-soft">{userName(r.soumis_par)}</span> },
          {
            header: "Statut",
            cell: (r) => {
              const s = RAPPORT_STATUTS[r.statut] ?? { label: r.statut, tone: "cours" as const };
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
        addLabel="Nouveau rapport"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Modifier le rapport" : "Nouveau rapport"}
        onSubmit={save}
        submitLabel={editing ? "Enregistrer" : "Créer le rapport"}
      >
        <Field label="Titre">
          <TextInput value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bureau">
            <SelectInput value={bureauId} onChange={(e) => setBureauId(e.target.value)}>
              {voitTousLesBureaux(role) ? (
                <option value="">— Aucun —</option>
              ) : null}
              {bureauxPermis.map((b) => (
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
                  {RAPPORT_STATUTS[s].label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Contenu">
          <TextArea value={contenu} onChange={(e) => setContenu(e.target.value)} />
        </Field>
      </FormDialog>
    </>
  );
}