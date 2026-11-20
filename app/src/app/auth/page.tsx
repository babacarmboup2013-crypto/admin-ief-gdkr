"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/use-session";
import { Eye, EyeOff, KeyRound, Home } from "lucide-react";
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
  const [now, setNow] = useState<Date | null>(null);

  // Date et heure courantes, rafraîchies toutes les 30 secondes.
  // Initialisées après l'hydratation pour éviter un écart SSR / navigateur.
  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const next = searchParams.get("next") || "/";
  const dateLabel = now
    ? now.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

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
    <div
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f7efdb 0%, #fdf8ef 30%, #f0e8d4 60%, #faf6ee 100%)" }}
    >
      {/* Decorative radial blurs - larger, more visible */}
      <div className="pointer-events-none absolute left-[5%] top-[5%] h-[600px] w-[600px] rounded-full bg-[#1b2a4a]/[0.04] blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[0%] right-[10%] h-[450px] w-[450px] rounded-full bg-[#c89b3c]/[0.06] blur-[80px]" />
      <div className="pointer-events-none absolute left-[40%] top-[60%] h-[400px] w-[400px] rounded-full bg-[#1b2a4a]/[0.03] blur-[90px]" />

      {/* Logo en filigrane */}
      <Image
        src="/logo-ief.jpeg"
        alt=""
        aria-hidden
        width={520}
        height={520}
        unoptimized
        loading="eager"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] max-h-[75vh] max-w-[75vw] -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-[0.07] mix-blend-multiply"
      />

      {/* Decorative large faded shapes */}
      <div
        className="pointer-events-none absolute left-[8%] top-[10%] h-[600px] w-[500px] rounded-[80px] opacity-[0.035]"
        style={{ background: "linear-gradient(135deg, #1b2a4a, #101c33)" }}
      />
      <div
        className="pointer-events-none absolute right-[5%] bottom-[10%] h-[300px] w-[300px] rounded-full opacity-[0.03]"
        style={{ background: "linear-gradient(135deg, #c89b3c, #a87d2a)" }}
      />

      {/* Home button */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-50 flex size-[42px] items-center justify-center rounded-full border-2 border-[#1b2a4a]/25 bg-white/80 text-[#1b2a4a] shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
      >
        <Home className="size-5" />
      </Link>

      {/* Date et heure courantes */}
      {dateLabel && (
        <div className="absolute right-5 top-5 z-50 max-w-[70vw] truncate rounded-full border border-[#1b2a4a]/15 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-[#1b2a4a] shadow-sm backdrop-blur-sm sm:max-w-none sm:text-[12px]">
          {dateLabel}
        </div>
      )}

      {/* Main content - full width split layout */}
      <div className="relative z-10 flex w-full max-w-7xl flex-col items-center gap-12 px-6 py-10 lg:flex-row lg:justify-center lg:gap-28">

        {/* Left column: branding */}
        <div className="hidden max-w-lg flex-col space-y-6 lg:flex">
          <div className="flex items-center">
            <div className="flex size-[120px] shrink-0 items-center justify-center rounded-2xl bg-white/90 p-2 shadow-sm">
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
          </div>
          <h2 className="text-[38px] font-extrabold leading-[1.15] text-[#1b2a4a]">
            L&apos;administration IEF,<br />
            <span className="text-[#c89b3c]">simple et efficace.</span>
          </h2>
          <p className="text-[15px] leading-relaxed text-[#6b7a8a]">
            La plateforme centralisée de l&apos;Inspection de l&apos;Éducation
            et de la Formation de Grand Dakar — gérer le personnel, les écoles,
            les dossiers, les rapports, les réunions et la communication
            entre tous les bureaux de l&apos;IEF en un seul endroit.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {["Personnel", "Écoles", "Dossiers", "Rapports", "Réunions", "Discussions"].map((item) => (
              <span key={item} className="rounded-full border border-[#1b2a4a]/10 bg-white/60 px-4 py-1.5 text-[12px] font-medium text-[#1b2a4a]/70">
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Right column: card */}
        <div className="w-full max-w-2xl">
          {/* Login card */}
          <div
            className="rounded-2xl border border-[#e3ddd0] bg-white px-12 py-12 shadow-[0_2px_4px_rgba(27,42,74,0.04),0_16px_40px_-8px_rgba(27,42,74,0.10)] sm:px-14 sm:py-14"
            style={{ transition: "transform .25s, box-shadow .25s, border-color .25s" }}
          >
            <div className="mb-6 flex justify-center">
              <Image
                src="/logo-ief.jpeg"
                alt="Logo officiel de l'IEF Grand Dakar"
                width={144}
                height={144}
                unoptimized
                loading="eager"
                className="size-36 object-contain"
              />
            </div>
            <h2 className="mb-8 text-center text-[22px] font-semibold text-[#1b2a4a]">
              Connexion
            </h2>

            <form onSubmit={onSubmit} className="flex flex-col gap-6">
              {/* Email */}
              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#4a5568]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom@ief.local"
                  className="w-full rounded-xl border border-[#e3ddd0] bg-[#faf8f4] px-5 py-3.5 text-[14px] text-[#1b2a4a] placeholder:text-[#b0b8c0] outline-none transition-all focus:border-[#1b2a4a] focus:bg-white focus:ring-2 focus:ring-[#1b2a4a]/10"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#4a5568]">
                  Mot de passe
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#b0b8c0]" />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full rounded-xl border border-[#e3ddd0] bg-[#faf8f4] py-3.5 pl-11 pr-12 text-[14px] text-[#1b2a4a] placeholder:text-[#b0b8c0] outline-none transition-all focus:border-[#1b2a4a] focus:bg-white focus:ring-2 focus:ring-[#1b2a4a]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b0b8c0] hover:text-[#6b7a8a] cursor-pointer"
                  >
                    {showPw ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-300/40 bg-red-50 px-5 py-3.5 text-[13px] text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-1 w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#1b2a4a] to-[#101c33] py-4 text-[15px] font-semibold text-white shadow-lg shadow-[#1b2a4a]/20 transition-all hover:shadow-xl hover:shadow-[#1b2a4a]/30 disabled:opacity-60"
              >
                {busy ? "Patientez…" : "Se connecter"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-[11px] text-[#9ca3af]">
            © 2026 CN IEF Grand Dakar Built by Groupe InTechSoft Enterprises — Tous droits réservés
          </p>
        </div>
      </div>
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
