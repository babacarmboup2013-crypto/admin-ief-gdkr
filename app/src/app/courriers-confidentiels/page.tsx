"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import {
  DateInput,
  Field,
  FileInput,
  FormError,
  SelectInput,
  TextInput,
} from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status";
import {
  COURRIER_STATUTS,
  NATURES_CONFIDENTIELLES,
  TRANSMISSIONS_CONFIDENTIELLES,
  fmtDate,
  type CourrierRow,
} from "@/lib/admin-types";
import { Download, FileText, Mail, Trash2 } from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo, comme dans le formulaire source
const ACCEPTED_FILES =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp";

export default function CourriersPage() {
  const { uid, profile } = useRole();
  const [dateCourrier, setDateCourrier] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [numeroReference, setNumeroReference] = useState("");
  const [objet, setObjet] = useState("");
  const [typeCourrier] = useState("confidentiel");
  const [natureConf, setNatureConf] = useState("");
  const [expediteur, setExpediteur] = useState("");
  const [destinataire, setDestinataire] = useState("");
  const [transmission, setTransmission] = useState<string[]>([]);
  const [fichier, setFichier] = useState<File | null>(null);
  const [bureauId, setBureauId] = useState(
    profile.bureauId == null ? "" : String(profile.bureauId)
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bureaux, setBureaux] = useState<{ id: number; nom: string }[]>([]);
  const [rows, setRows] = useState<CourrierRow[]>([]);
  const [loading, setLoading] = useState(supabase != null);
  const [loadError, setLoadError] = useState<string | null>(
    supabase ? null : "Supabase n'est pas configuré (voir .env.local)."
  );
  const [tick, setTick] = useState(0);

  const enregistrePar = `${profile.fonction ?? "Agent"} IEF Grand Dakar ${
    profile.nom ?? "—"
  } ${new Date().getFullYear()}`.toUpperCase();

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase
      .from("bureaux")
      .select("id,nom")
      .order("id")
      .then(({ data }) => {
        if (active && data) setBureaux(data as { id: number; nom: string }[]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase
      .from("courriers")
      .select(
        "id,date_courrier,numero_reference,objet,type_courrier,nature_confidentielle,expediteur,destinataire,transmission_interne,fichier_path,fichier_nom,kobo_id,kobo_uuid,bureau_id,saisi_par,statut,created_at"
      )
      .eq("type_courrier", "confidentiel")
      .order("date_courrier", { ascending: false })
      .order("id", { ascending: false })
      .then(({ data, error: e }) => {
        if (!active) return;
        if (e) {
          setLoadError(e.message);
          setRows([]);
        } else {
          setLoadError(null);
          setRows((data ?? []) as CourrierRow[]);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tick]);

  const refresh = () => {
    setLoading(true);
    setTick((t) => t + 1);
  };

  function resetForm() {
    setDateCourrier(new Date().toISOString().slice(0, 10));
    setNumeroReference("");
    setObjet("");
    setNatureConf("");
    setExpediteur("");
    setDestinataire("");
    setTransmission([]);
    setFichier(null);
    setEditingId(null);
    const input = document.getElementById("courrier-fichier") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  function toggleDestinataire(value: string) {
    setTransmission((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function uploadFile(id: number, file: File) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${uid}/${id}_${Date.now()}_${safeName}`;
    const { error: e } = await supabase!.storage
      .from("courriers")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (e) throw new Error(`Pièce jointe : ${e.message}`);
    return { path, name: file.name };
  }

  async function save(statut: "brouillon" | "soumis") {
    setError(null);
    setSuccess(null);

    if (!supabase) {
      setError("Supabase n'est pas configuré (voir .env.local).");
      return;
    }
    if (!uid) {
      setError("Vous devez être connecté pour enregistrer un courrier.");
      return;
    }
    if (!dateCourrier) {
      setError("La date du courrier est obligatoire.");
      return;
    }
    if (!numeroReference.trim()) {
      setError("Le numéro de référence est obligatoire.");
      return;
    }
    if (!objet.trim()) {
      setError("L'objet du courrier est obligatoire.");
      return;
    }
    if (fichier && fichier.size > MAX_FILE_SIZE) {
      setError("Le fichier ne doit pas dépasser 10 Mo.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date_courrier: dateCourrier,
        numero_reference: numeroReference.trim(),
        objet: objet.trim(),
        type_courrier: typeCourrier,
        nature_confidentielle: natureConf || null,
        expediteur:
          natureConf === "arriv_e_confidentiel" ? expediteur.trim() || null : null,
        destinataire:
          natureConf === "d_part_confidentiel" ? destinataire.trim() || null : null,
        transmission_interne: transmission,
        bureau_id: bureauId === "" ? null : Number(bureauId),
        saisi_par: uid,
        statut,
        updated_at: new Date().toISOString(),
      };

      let rowId = editingId;
      if (editingId != null) {
        const { error: e } = await supabase
          .from("courriers")
          .update(payload)
          .eq("id", editingId);
        if (e) throw new Error(e.message);
      } else {
        const { data, error: e } = await supabase
          .from("courriers")
          .insert(payload)
          .select("id")
          .single();
        if (e) throw new Error(e.message);
        rowId = (data as { id: number }).id;
      }

      if (fichier && rowId != null) {
        const { path, name } = await uploadFile(rowId, fichier);
        const { error: e } = await supabase
          .from("courriers")
          .update({ fichier_path: path, fichier_nom: name })
          .eq("id", rowId);
        if (e) throw new Error(e.message);
      }

      resetForm();
      refresh();
      setSuccess(
        statut === "brouillon"
          ? "Brouillon enregistré."
          : "Courrier soumis et archivé."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(row: CourrierRow) {
    setEditingId(row.id);
    setDateCourrier(row.date_courrier?.slice(0, 10) ?? "");
    setNumeroReference(row.numero_reference ?? "");
    setObjet(row.objet ?? "");
    setNatureConf(row.nature_confidentielle ?? "");
    setExpediteur(row.expediteur ?? "");
    setDestinataire(row.destinataire ?? "");
    setTransmission(row.transmission_interne ?? []);
    setBureauId(row.bureau_id == null ? "" : String(row.bureau_id));
    setFichier(null);
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(row: CourrierRow) {
    if (!supabase) return;
    if (
      !window.confirm(
        `Supprimer le courrier n° ${row.numero_reference ?? row.id} ?`
      )
    )
      return;
    if (row.fichier_path) {
      await supabase.storage.from("courriers").remove([row.fichier_path]);
    }
    const { error: e } = await supabase
      .from("courriers")
      .delete()
      .eq("id", row.id);
    if (e) {
      setError(e.message);
      return;
    }
    if (editingId === row.id) resetForm();
    refresh();
  }

  async function download(row: CourrierRow) {
    if (!supabase || !row.fichier_path) return;
    const { data, error: e } = await supabase.storage
      .from("courriers")
      .createSignedUrl(row.fichier_path, 60);
    if (e) {
      setError(e.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <Mail className="size-6 text-primary" />
          <h1 className="text-[26px] leading-tight text-navy">
            Courriers confidentiels
          </h1>
        </div>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Système d’archivage électronique des courriers confidentiels de l’IEF
          Grand Dakar
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-[16px] text-navy">
            {editingId != null ? "Modifier le courrier" : "Enregistrer un courrier"}
          </h2>
          {editingId != null && (
            <Button variant="outline" size="sm" onClick={resetForm}>
              Annuler la modification
            </Button>
          )}
        </div>

        <FormError message={error} />
        {success ? (
          <p className="mb-4 rounded-md border border-teal-300/40 bg-teal-50 px-3 py-2 text-[12.5px] text-teal-700">
            {success}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date du courrier">
            <DateInput
              value={dateCourrier}
              onChange={(e) => setDateCourrier(e.target.value)}
            />
          </Field>
          <Field label="Numéro de référence">
            <TextInput
              value={numeroReference}
              onChange={(e) => setNumeroReference(e.target.value)}
              placeholder="Ex. 142/2026"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Objet du courrier">
            <TextInput
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Objet du courrier"
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type de courrier">
            <SelectInput value={typeCourrier} disabled>
              <option value="confidentiel">Confidentiel</option>
            </SelectInput>
          </Field>
          <Field label="Nature du Courrier">
            <SelectInput
              value={natureConf}
              onChange={(e) => {
                setNatureConf(e.target.value);
                if (e.target.value !== "arriv_e_confidentiel") setExpediteur("");
                if (e.target.value !== "d_part_confidentiel") setDestinataire("");
              }}
            >
              <option value="">— Choisir —</option>
              {Object.entries(NATURES_CONFIDENTIELLES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        {natureConf ? (
          <div className="mt-4">
            <Field
              label={
                natureConf === "arriv_e_confidentiel"
                  ? "Expéditeur"
                  : "Destinataire"
              }
            >
              {natureConf === "arriv_e_confidentiel" ? (
                <TextInput
                  value={expediteur}
                  onChange={(e) => setExpediteur(e.target.value)}
                  placeholder="Nom de l'expéditeur"
                />
              ) : (
                <TextInput
                  value={destinataire}
                  onChange={(e) => setDestinataire(e.target.value)}
                  placeholder="Nom du destinataire"
                />
              )}
            </Field>
          </div>
        ) : null}

        <fieldset className="mt-5">
          <legend className="mb-2 text-[12.5px] font-medium text-ink">
            Transmission interne
          </legend>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {TRANSMISSIONS_CONFIDENTIELLES.map((destinataire) => (
              <label
                key={destinataire}
                className="flex cursor-pointer items-start gap-2 text-[12px] leading-snug text-ink-soft"
              >
                <input
                  type="checkbox"
                  checked={transmission.includes(destinataire)}
                  onChange={() => toggleDestinataire(destinataire)}
                  className="mt-0.5 size-3.5 shrink-0 accent-[var(--primary)]"
                />
                <span>{destinataire}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pièce jointe" hint="PDF, Word ou image — 10 Mo maximum">
            <FileInput
              id="courrier-fichier"
              accept={ACCEPTED_FILES}
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field label="Bureau émetteur">
            <SelectInput
              value={bureauId}
              onChange={(e) => setBureauId(e.target.value)}
            >
              <option value="">— Aucun —</option>
              {bureaux.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div className="mt-5 rounded-md bg-muted/40 px-3 py-2.5">
          <div className="text-[11px] text-ink-soft">Enregistré par</div>
          <div className="font-mono text-[12px] text-ink">{enregistrePar}</div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => save("brouillon")}
          >
            Sauvegarder le brouillon
          </Button>
          <Button disabled={saving} onClick={() => save("soumis")}>
            {saving ? "Enregistrement…" : "Soumettre"}
          </Button>
          {editingId != null && (
            <Button variant="ghost" onClick={resetForm} disabled={saving}>
              Annuler
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="font-serif text-[15.5px] text-navy">
            Courriers enregistrés ({rows.length})
          </h2>
        </div>
        {loadError ? (
          <div className="px-5 py-8 text-center text-[13px] text-red">
            <p className="font-medium">Impossible de charger les courriers.</p>
            <p className="mt-1 text-ink-soft">{loadError}</p>
            <p className="mt-2 text-ink-soft">
              Si la table n’existe pas encore, appliquez la migration{" "}
              <code className="font-mono">0013_courriers.sql</code> dans l’éditeur SQL Supabase.
            </p>
          </div>
        ) : loading ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-soft">
            Chargement…
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-soft">
            Aucun courrier enregistré. Utilisez le formulaire ci-dessus.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Référence</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Date</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Objet</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Transmission</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Statut</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Fichier</th>
                  <th className="px-5 py-2.5 font-medium text-ink-soft">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const statut =
                    COURRIER_STATUTS[row.statut] ?? {
                      label: row.statut,
                      tone: "cours" as const,
                    };
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-5 py-2.5 font-mono text-[12px] font-medium text-ink">
                        {row.numero_reference}
                      </td>
                      <td className="px-5 py-2.5 text-ink-soft">
                        {fmtDate(row.date_courrier)}
                      </td>
                      <td className="px-5 py-2.5 text-ink">
                        <div>{row.objet || <span className="text-ink-soft">—</span>}</div>
                        {row.nature_confidentielle ? (
                          <div className="mt-0.5 text-[11px] text-ink-soft">
                            {NATURES_CONFIDENTIELLES[row.nature_confidentielle] ??
                              row.nature_confidentielle}
                            {row.expediteur ? ` · ${row.expediteur}` : null}
                            {row.destinataire ? ` · ${row.destinataire}` : null}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-2.5 text-ink-soft">
                        <span title={(row.transmission_interne ?? []).join(", ")}>
                          {(row.transmission_interne ?? []).length} destinataire(s)
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        <StatusBadge label={statut.label} tone={statut.tone} />
                      </td>
                      <td className="px-5 py-2.5">
                        {row.fichier_path ? (
                          <button
                            type="button"
                            onClick={() => download(row)}
                            title={row.fichier_nom ?? "Télécharger"}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Download className="size-3.5" />
                            <span className="max-w-[110px] truncate">
                              {row.fichier_nom ?? "Fichier"}
                            </span>
                          </button>
                        ) : (
                          <span className="text-ink-soft">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            title="Modifier"
                            className="text-primary hover:underline"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(row)}
                            title="Supprimer"
                            className="text-red hover:underline"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-ink-soft">
        <FileText className="size-3.5" />
        Les brouillons peuvent être repris et modifiés avant soumission.
      </p>
    </div>
  );
}
