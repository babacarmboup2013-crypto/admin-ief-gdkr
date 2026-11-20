"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { peutVoirCourriers, voitTousLesBureaux } from "@/lib/admin-perms";
import { useBureauxRef } from "@/components/admin/use-refs";
import {
  DateInput,
  Field,
  FormError,
  SelectInput,
  TextInput,
} from "@/components/admin/fields";
import { StatusBadge } from "@/components/admin/status";
import {
  COURRIER_STATUTS,
  NATURES_CONFIDENTIELLES,
  NATURES_ORDINAIRES,
  TRANSMISSIONS_CONFIDENTIELLES,
  TRANSMISSIONS_INTERNES,
  fmtDate,
  type CourrierRow,
} from "@/lib/admin-types";
import { Download, FileText, Search, X } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "tous", label: "Tous les types" },
  { value: "ordinaire", label: "Courriers ordinaires" },
  { value: "confidentiel", label: "Courriers confidentiels" },
] as const;

const NATURES = { ...NATURES_ORDINAIRES, ...NATURES_CONFIDENTIELLES };
const TRANSMISSIONS = [
  ...new Set([...TRANSMISSIONS_INTERNES, ...TRANSMISSIONS_CONFIDENTIELLES]),
].sort((a, b) => a.localeCompare(b, "fr"));

const statutAide = (statut: string) =>
  COURRIER_STATUTS[statut] ?? {
    label: statut,
    tone: "cours" as const,
  };

/** Recherche insensible aux accents et à la casse. */
function normalise(valeur: string | null | undefined): string {
  return (valeur ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function RechercheCourriersPage() {
  const { role, profile } = useRole();
  const bureaux = useBureauxRef();
  const [rows, setRows] = useState<CourrierRow[]>([]);
  const [loading, setLoading] = useState(supabase != null);
  const [loadError, setLoadError] = useState<string | null>(
    supabase ? null : "Supabase n'est pas configuré (voir .env.local)."
  );
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [type, setType] = useState<string>("tous");
  const [bureauFiltre, setBureauFiltre] = useState("");
  const [motCle, setMotCle] = useState("");
  const [nature, setNature] = useState("");
  const [statut, setStatut] = useState("");
  const [transmission, setTransmission] = useState("");
  const [dateDu, setDateDu] = useState("");
  const [dateAu, setDateAu] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let requete = supabase
      .from("courriers")
      .select(
        "id,date_courrier,numero_reference,objet,type_courrier,nature_ordinaire,nature_confidentielle,expediteur,destinataire,transmission_interne,fichier_path,fichier_nom,bureau_id,statut"
      );

    if (!voitTousLesBureaux(role)) {
      requete = requete.eq("bureau_id", profile.bureauId ?? -1);
    }

    requete
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
  }, [role, profile.bureauId]);

  const resultats = useMemo(() => {
    const terme = normalise(motCle);
    return rows.filter((row) => {
      if (type !== "tous" && row.type_courrier !== type) return false;
      if (bureauFiltre && row.bureau_id !== Number(bureauFiltre)) return false;

      const natureCourrier = row.nature_ordinaire ?? row.nature_confidentielle;
      if (nature && natureCourrier !== nature) return false;
      if (statut && row.statut !== statut) return false;
      if (
        transmission &&
        !(row.transmission_interne ?? []).includes(transmission)
      )
        return false;
      if (dateDu && (!row.date_courrier || row.date_courrier < dateDu))
        return false;
      if (dateAu && (!row.date_courrier || row.date_courrier > dateAu))
        return false;

      if (terme) {
        const contenu = normalise(
          [
            row.numero_reference,
            row.objet,
            row.expediteur,
            row.destinataire,
            row.fichier_nom,
            (row.transmission_interne ?? []).join(" "),
            natureCourrier ? NATURES[natureCourrier] : "",
          ]
            .filter(Boolean)
            .join(" ")
        );
        if (!contenu.includes(terme)) return false;
      }
      return true;
    });
  }, [rows, type, bureauFiltre, motCle, nature, statut, transmission, dateDu, dateAu]);

  const reinitialiser = () => {
    setType("tous");
    setBureauFiltre("");
    setMotCle("");
    setNature("");
    setStatut("");
    setTransmission("");
    setDateDu("");
    setDateAu("");
  };

  const nombreFiltres = [
    type !== "tous",
    bureauFiltre !== "",
    motCle.trim() !== "",
    nature !== "",
    statut !== "",
    transmission !== "",
    dateDu !== "",
    dateAu !== "",
  ].filter(Boolean).length;

  async function download(row: CourrierRow) {
    if (!supabase || !row.fichier_path) return;
    setDownloadError(null);
    const { data, error: e } = await supabase.storage
      .from("courriers")
      .createSignedUrl(row.fichier_path, 60);
    if (e) {
      setDownloadError(e.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (!peutVoirCourriers(role, profile)) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="font-serif text-[20px] text-navy">Accès refusé</h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">
          Cette rubrique est réservée au Secrétariat, à l&apos;IEF et au Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <Search className="size-6 text-primary" />
          <h1 className="text-[26px] leading-tight text-navy">
            Recherche de courriers
          </h1>
        </div>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Recherche unifiée parmi les courriers ordinaires et confidentiels de
          l’IEF Grand Dakar
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-[16px] text-navy">Critères de recherche</h2>
          {nombreFiltres > 0 ? (
            <button
              type="button"
              onClick={reinitialiser}
              className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
            >
              <X className="size-3.5" /> Effacer les filtres ({nombreFiltres})
            </button>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setType(option.value);
                setNature("");
              }}
              className={
                "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors " +
                (type === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-ink-soft hover:bg-muted/40")
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        {voitTousLesBureaux(role) ? null : (
          <p className="mb-4 rounded-md bg-muted/40 px-3 py-2 text-[12px] text-ink-soft">
            Recherche limitée à votre bureau :{" "}
            {bureaux.rows.find((b) => b.id === profile.bureauId)?.nom ?? "—"}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voitTousLesBureaux(role) ? (
            <Field label="Bureau">
              <SelectInput
                value={bureauFiltre}
                onChange={(e) => setBureauFiltre(e.target.value)}
              >
                <option value="">Tous les bureaux</option>
                {bureaux.rows.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nom}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : null}
          <Field label="Mot-clé" className="lg:col-span-2">
            <TextInput
              value={motCle}
              onChange={(e) => setMotCle(e.target.value)}
              placeholder="Référence, objet, expéditeur, destinataire, transmission…"
            />
          </Field>
          <Field label="Statut">
            <SelectInput value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(COURRIER_STATUTS).map(([value, aide]) => (
                <option key={value} value={value}>
                  {aide.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Nature du courrier">
            <SelectInput value={nature} onChange={(e) => setNature(e.target.value)}>
              <option value="">Toutes les natures</option>
              {Object.entries(NATURES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Transmission interne">
            <SelectInput
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
            >
              <option value="">Toutes les transmissions</option>
              {TRANSMISSIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date du —">
            <DateInput value={dateDu} onChange={(e) => setDateDu(e.target.value)} />
          </Field>
          <Field label="Date au —">
            <DateInput value={dateAu} onChange={(e) => setDateAu(e.target.value)} />
          </Field>
        </div>
      </div>

      <FormError message={loadError ?? downloadError} />

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="font-serif text-[15.5px] text-navy">
            {resultats.length} résultat(s)
            {nombreFiltres > 0 ? ` sur ${rows.length}` : ""}
          </h2>
        </div>
        {loading ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-soft">
            Chargement…
          </div>
        ) : resultats.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-soft">
            Aucun courrier ne correspond aux critères.
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Référence</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Type</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Date</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Objet</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Transmission</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Statut</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Fichier</th>
                </tr>
              </thead>
              <tbody>
                {resultats.map((row) => {
                  const natureCourrier =
                    row.nature_ordinaire ?? row.nature_confidentielle;
                  const statut = statutAide(row.statut);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-2.5 font-mono text-[12px] font-medium text-ink">
                        {row.numero_reference ?? <span className="text-ink-soft">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={
                            "rounded px-1.5 py-0.5 text-[11px] font-medium " +
                            (row.type_courrier === "confidentiel"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-sky-100 text-sky-800")
                          }
                        >
                          {row.type_courrier === "confidentiel"
                            ? "Confidentiel"
                            : "Ordinaire"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">
                        {fmtDate(row.date_courrier)}
                      </td>
                      <td className="px-4 py-2.5 text-ink">
                        <div>{row.objet || <span className="text-ink-soft">—</span>}</div>
                        {natureCourrier ? (
                          <div className="mt-0.5 text-[11px] text-ink-soft">
                            {NATURES[natureCourrier] ?? natureCourrier}
                            {row.expediteur ? ` · ${row.expediteur}` : null}
                            {row.destinataire ? ` · ${row.destinataire}` : null}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">
                        <span title={(row.transmission_interne ?? []).join(", ")}>
                          {(row.transmission_interne ?? []).length} destinataire(s)
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge label={statut.label} tone={statut.tone} />
                      </td>
                      <td className="px-4 py-2.5">
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
        Les résultats sont mis à jour instantanément lors de la saisie.
      </p>
    </div>
  );
}
