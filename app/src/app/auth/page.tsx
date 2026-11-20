"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/use-session";
import { ArrowRight, Eye, EyeOff, Home, KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [etapeActive, setEtapeActive] = useState<1 | 2>(1);
  const [now, setNow] = useState<Date | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Horloge du bandeau : initialisée après hydratation, rafraîchie toutes les 30 s.
  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const timeLabel = now
    ? now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";
  const dateRaw = now
    ? now.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const dateLabel = dateRaw
    ? dateRaw.charAt(0).toUpperCase() + dateRaw.slice(1)
    : "";

  const next = searchParams.get("next") || "/";

  useEffect(() => {
    if (session) {
      router.replace(next);
      router.refresh();
    }
  }, [session, next, router]);

  if (session) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase non configuré.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError(err.message);
    else {
      router.replace(next);
      router.refresh();
    }
  }

  return (
    <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-[#f6f7fb] lg:grid-cols-2">
      {/* ---------------- Bandeau gauche ---------------- */}
      <section
        className="relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden px-6 py-14 text-white lg:min-h-dvh lg:px-12"
        style={{ background: "linear-gradient(145deg, #1b2a4a 0%, #14213c 55%, #0a1426 100%)" }}
      >
        {/* Cercles décoratifs */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-[300px] rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-[350px] rounded-full bg-white/[0.04]" />
        <div className="pointer-events-none absolute left-[-40px] top-[40%] size-[150px] rounded-full bg-white/[0.05]" />

        {/* Retour accueil */}
        <Link
          href="/"
          aria-label="Retour à l'accueil"
          className="absolute left-5 top-5 z-20 flex size-[42px] items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <Home className="size-5" />
        </Link>

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Logo IEF */}
          <div className="mb-8 flex size-[120px] items-center justify-center rounded-[26px] bg-white p-3 shadow-[0_20px_40px_rgba(0,0,0,0.3)]">
            <Image
              src="/logo-ief.jpeg"
              alt="Logo officiel de l'IEF Grand Dakar"
              width={120}
              height={120}
              unoptimized
              loading="eager"
              className="size-full object-contain"
            />
          </div>

          {/* Horloge et date */}
          {timeLabel && (
            <div className="text-[64px] font-extrabold leading-none tracking-tight text-white sm:text-[76px]">
              {timeLabel}
            </div>
          )}
          {dateLabel && (
            <div className="mt-4 text-[15px] font-medium tracking-wide text-white/70 sm:text-[18px]">
              {dateLabel}
            </div>
          )}

          <div className="mt-9 h-px w-16 bg-white/25" />
          <p className="mt-6 max-w-[320px] text-[13px] leading-relaxed text-white/60">
            Portail d&apos;administration de l&apos;Inspection de l&apos;Éducation
            et de la Formation de Grand Dakar.
          </p>
        </div>

        <div className="absolute bottom-6 z-10 text-center text-[11px] text-white/35">
          © 2026 CN IEF Grand Dakar — Tous droits réservés
        </div>
      </section>

      {/* ---------------- Panneau droit ---------------- */}
      <section
        className="relative flex items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:py-16"
        style={{
          background:
            "radial-gradient(circle at 85% 8%, rgba(200,155,60,0.10) 0, transparent 42%), radial-gradient(circle at 8% 92%, rgba(27,42,74,0.07) 0, transparent 36%), #f6f7fb",
        }}
      >
        {/* Logo en filigrane */}
        <Image
          src="/logo-ief.jpeg"
          alt=""
          aria-hidden
          width={640}
          height={640}
          unoptimized
          loading="eager"
          className="pointer-events-none absolute left-[54%] top-[52%] h-[640px] w-[640px] max-h-[85vh] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-[0.11] mix-blend-multiply"
        />

        <div className="relative z-10 w-full max-w-[440px]">
          <div className="rounded-[20px] border border-[#e6e8f0] bg-white px-8 py-9 shadow-[0_1px_2px_rgba(26,33,56,0.04),0_24px_48px_-24px_rgba(26,33,56,0.20)] sm:px-9 sm:py-10">
            {/* En-tête */}
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f0e6] px-3 py-1 text-[11px] font-semibold text-[#8a6a1f]">
                <KeyRound className="size-3.5" />
                Espace sécurisé
              </span>
              <h1 className="mt-4 text-[26px] font-extrabold tracking-tight text-[#1b2a4a]">
                Connexion
              </h1>
              <p className="mt-1 text-[13px] leading-relaxed text-[#8a92a8]">
                Accédez à votre espace d&apos;administration IEF Grand Dakar.
              </p>
            </div>

            {/* Étapes — segmented control animé qui suit le champ actif */}
            <div className="mb-6" aria-label={`Étape ${etapeActive} sur 2`}>
              <div className="relative grid grid-cols-2 rounded-xl border border-[#e6e8f0] bg-[#f6f7fb] p-1">
                {/* Pilule coulissante */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%_-_4px)] rounded-lg bg-gradient-to-r from-[#1b2a4a] to-[#101c33] shadow-[0_8px_18px_-8px_rgba(27,42,74,0.85)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  style={{ transform: etapeActive === 2 ? "translateX(100%)" : "translateX(0)" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setEtapeActive(1);
                    emailRef.current?.focus();
                  }}
                  className={`relative z-10 flex items-center justify-center gap-2 rounded-lg py-2 text-[12px] font-semibold transition-colors duration-300 ${
                    etapeActive === 1 ? "text-white" : "text-[#8a92a8] hover:text-[#4b5371]"
                  }`}
                >
                  <span
                    className={`grid size-[20px] place-items-center rounded-full text-[10px] font-bold transition-colors duration-300 ${
                      etapeActive === 1 ? "bg-white/20 text-white" : "bg-white text-[#8a92a8]"
                    }`}
                  >
                    1
                  </span>
                  Identifiant
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEtapeActive(2);
                    passwordRef.current?.focus();
                  }}
                  className={`relative z-10 flex items-center justify-center gap-2 rounded-lg py-2 text-[12px] font-semibold transition-colors duration-300 ${
                    etapeActive === 2 ? "text-white" : "text-[#8a92a8] hover:text-[#4b5371]"
                  }`}
                >
                  <span
                    className={`grid size-[20px] place-items-center rounded-full text-[10px] font-bold transition-colors duration-300 ${
                      etapeActive === 2 ? "bg-white/20 text-white" : "bg-white text-[#8a92a8]"
                    }`}
                  >
                    2
                  </span>
                  Mot de passe
                </button>
              </div>
              {/* Barre de progression */}
              <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-[#e6e8f0]">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-[#c89b3c] to-[#e0bd6d] transition-[width] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  style={{ width: etapeActive === 2 ? "100%" : "50%" }}
                />
              </div>
            </div>

            {/* Logo dans la carte */}
            <div className="mb-6 flex justify-center">
              <Image
                src="/logo-ief.jpeg"
                alt="Logo officiel de l'IEF Grand Dakar"
                width={112}
                height={112}
                unoptimized
                loading="eager"
                className="size-28 object-contain"
              />
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-[#4b5371]">
                  E-mail professionnel
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#a9b0c2]" />
                  <input
                    ref={emailRef}
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEtapeActive(1)}
                    onClick={() => setEtapeActive(1)}
                    placeholder="prenom.nom@ief.local"
                    className="h-12 w-full rounded-xl border border-[#e6e8f0] bg-white pl-11 pr-4 text-[14px] text-[#1b2a4a] placeholder:text-[#a9b0c2] outline-none transition-all hover:border-[#cfd4e3] focus:border-[#1b2a4a] focus:ring-4 focus:ring-[#1b2a4a]/10"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-[#4b5371]">
                  Mot de passe
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#a9b0c2]" />
                  <input
                    ref={passwordRef}
                    id="password"
                    type={showPw ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setEtapeActive(2)}
                    onClick={() => setEtapeActive(2)}
                    placeholder="••••••••••"
                    className="h-12 w-full rounded-xl border border-[#e6e8f0] bg-white pl-11 pr-12 text-[14px] text-[#1b2a4a] placeholder:text-[#a9b0c2] outline-none transition-all hover:border-[#cfd4e3] focus:border-[#1b2a4a] focus:ring-4 focus:ring-[#1b2a4a]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#a9b0c2] transition-colors hover:bg-[#f6f7fb] hover:text-[#4b5371]"
                  >
                    {showPw ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="group mt-2 flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1b2a4a] to-[#101c33] text-[15px] font-semibold text-white shadow-[0_10px_20px_-8px_rgba(27,42,74,0.6)] transition-all hover:-translate-y-px hover:shadow-[0_14px_26px_-8px_rgba(27,42,74,0.7)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {busy ? "Patientez…" : "Se connecter"}
                {!busy && <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[12px] text-[#9aa2b4]">
            Accès réservé au personnel de l&apos;IEF Grand Dakar.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
