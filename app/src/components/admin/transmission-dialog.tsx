"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { Field, SelectInput, TextArea } from "./fields";
import { FormDialog } from "./form-dialog";
import { sbThrow } from "./sb";
import { useBureauxRef } from "./use-refs";

export function TransmissionDialog({
  open,
  onOpenChange,
  typeObjet,
  objetId,
  objetRef = null,
  objetTitre = null,
  bureauSourceId = null,
  fichierPath = null,
  fichierNom = null,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeObjet: "courrier" | "dossier";
  objetId: number;
  objetRef?: string | null;
  objetTitre?: string | null;
  bureauSourceId?: number | null;
  fichierPath?: string | null;
  fichierNom?: string | null;
  onSaved?: () => void;
}) {
  const { uid, profile } = useRole();
  const bureaux = useBureauxRef();
  const [destinataire, setDestinataire] = useState("");
  const [note, setNote] = useState("");

  const source = bureauSourceId ?? profile.bureauId ?? null;
  const disponibles = bureaux.rows.filter((b) => b.id !== source && b.id !== 24);

  async function save() {
    if (!supabase) throw new Error("Supabase non configuré.");
    if (!destinataire) throw new Error("Choisissez le bureau destinataire.");

    const destId = Number(destinataire);
    const destNom = bureaux.rows.find((b) => b.id === destId)?.nom ?? String(destId);

    sbThrow(
      (
        await supabase.from("transmissions").insert({
          type_objet: typeObjet,
          objet_id: objetId,
          objet_ref: objetRef,
          objet_titre: objetTitre,
          bureau_source_id: source,
          bureau_destinataire_id: destId,
          expediteur_id: uid,
          note: note.trim() || null,
          fichier_path: fichierPath ?? null,
          fichier_nom: fichierNom ?? null,
          statut: "en_attente",
        })
      ).error
    );

    // Le courrier reste à sa place, mais le nouveau destinataire est ajouté
    // à sa transmission interne pour qu'il apparaisse aussi côté réception.
    if (typeObjet === "courrier") {
      const { data: courrier, error: lecture } = await supabase
        .from("courriers")
        .select("transmission_interne")
        .eq("id", objetId)
        .maybeSingle();
      sbThrow(lecture);

      const liste: string[] = courrier?.transmission_interne ?? [];
      if (!liste.some((libelle) => libelle.toLowerCase() === destNom.toLowerCase())) {
        // La transmission reste enregistrée même si les RLS refusent la mise à
        // jour du courrier à un agent qui n'en est pas l'auteur.
        const { error: miseAJour } = await supabase
          .from("courriers")
          .update({ transmission_interne: [...liste, destNom] })
          .eq("id", objetId);
        void miseAJour;
      }
    }

    setDestinataire("");
    setNote("");
    onSaved?.();
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Transmettre à un autre bureau"
      description={
        typeObjet === "courrier"
          ? "Le courrier reste accessible au bureau d'origine et au bureau destinataire."
          : "Le dossier reste rattaché à son bureau d'origine et apparaît au bureau destinataire."
      }
      onSubmit={save}
      submitLabel="Envoyer la transmission"
    >
      <div className="rounded-md bg-muted/40 px-3 py-2 text-[12.5px] text-ink">
        <span className="text-ink-soft">Objet : </span>
        {objetRef ? <span className="font-mono">{objetRef} — </span> : null}
        <span className="font-medium">{objetTitre ?? `#${objetId}`}</span>
      </div>
      {fichierNom ? (
        <div className="mt-1 text-[12px] text-ink-soft">Pièce jointe : {fichierNom}</div>
      ) : null}
      <Field label="Bureau destinataire">
        <SelectInput value={destinataire} onChange={(e) => setDestinataire(e.target.value)} autoFocus>
          <option value="">— Choisir un bureau —</option>
          {disponibles.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nom}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Note (facultative)">
        <TextArea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Précision sur la transmission, instruction, délai…"
          rows={3}
        />
      </Field>
    </FormDialog>
  );
}
