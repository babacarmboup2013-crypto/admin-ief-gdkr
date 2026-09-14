"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/use-session";
import { Eye, EyeOff, KeyRound, Home } from "lucide-react";
import Link from "next/link";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const next = searchParams.get("next") || "/";

  useEffect(() => {
    if (session) {
      router.replace(next);
      router.refresh();
    }
  }, [session]);

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
      className="relative flex min-h-dvh items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f7efdb 0%, #fdf8ef 30%, #f0e8d4 60%, #faf6ee 100%)" }}
    >
      {/* Decorative radial blurs */}
      <div className="pointer-events-none absolute left-[8%] top-[10%] h-[500px] w-[500px] rounded-full bg-[#1b2a4a]/[0.05] blur-[80px]" />
      <div className="pointer-events-none absolute bottom-[5%] right-[15%] h-[350px] w-[350px] rounded-full bg-[#c89b3c]/[0.06] blur-[60px]" />

      {/* Decorative large faded shape behind left content */}
      <div
        className="pointer-events-none absolute left-[12%] top-[15%] h-[520px] w-[420px] rounded-[60px] opacity-[0.04]"
        style={{ background: "linear-gradient(135deg, #1b2a4a, #101c33)" }}
      />

      {/* Home button */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-50 flex size-[42px] items-center justify-center rounded-full border-2 border-[#1b2a4a]/25 bg-white/80 text-[#1b2a4a] shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
      >
        <Home className="size-5" />
      </Link>

      {/* Main content */}
      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-10 px-6 lg:flex-row lg:justify-center lg:gap-24">

        {/* Left column: branding */}
        <div className="hidden max-w-md flex-col space-y-4 lg:flex">
          <h2 className="text-[32px] font-extrabold leading-tight text-[#1b2a4a]">
            L&apos;administration IEF,<br />
            <span className="text-[#c89b3c]">simple et efficace.</span>
          </h2>
          <p className="text-sm leading-relaxed text-[#6b7a8a]">
            La plateforme de gestion du personnel et des écoles de la
            circonscription IEF Grand Dakar — suivi des affectations,
            mutations, archivages et dossiers RH en un seul endroit.
          </p>
        </div>

        {/* Right column: card */}
        <div className="w-full max-w-lg">
          {/* Logo + title */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b2a4a] to-[#101c33] shadow-lg shadow-[#1b2a4a]/25">
              <span className="text-[14px] font-bold tracking-widest text-[#c89b3c]">AIGDKR</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#1b2a4a]">
              Admin IEF
            </h1>
            <p className="mt-1 text-xs text-center text-[#6b7a8a]">
              Plateforme d&apos;administration IEF Grand Dakar
            </p>
          </div>

          {/* Login card */}
          <div
            className="rounded-2xl border border-[#e3ddd0] bg-white px-8 py-10 shadow-[0_1px_2px_rgba(27,42,74,0.04),0_12px_30px_-8px_rgba(27,42,74,0.08)]"
            style={{ transition: "transform .25s, box-shadow .25s, border-color .25s" }}
          >
            <h2 className="mb-6 text-center text-[16px] font-semibold text-[#1b2a4a]">
              Connexion
            </h2>

            <form onSubmit={onSubmit} className="flex flex-col gap-5">
              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#6b7a8a]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom@ief.local"
                  className="w-full rounded-lg border border-[#e3ddd0] bg-white px-4 py-3 text-sm text-[#1b2a4a] placeholder:text-[#aab0b8] outline-none transition-all focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#1b2a4a]/10"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#6b7a8a]">
                  Mot de passe
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#aab0b8]" />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full rounded-lg border border-[#e3ddd0] bg-white py-3 pl-9 pr-10 text-sm text-[#1b2a4a] placeholder:text-[#aab0b8] outline-none transition-all focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#1b2a4a]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aab0b8] hover:text-[#6b7a8a] cursor-pointer"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-300/40 bg-red-50 px-4 py-3 text-[12.5px] text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-[#1b2a4a] to-[#101c33] py-3 text-sm font-semibold text-white shadow-md shadow-[#1b2a4a]/20 transition-all hover:shadow-lg hover:shadow-[#1b2a4a]/30 disabled:opacity-60"
              >
                {busy ? "Patientez…" : "Se connecter"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-[11px] text-[#9ca3af]">
            © 2025 IEF Grand Dakar — Tous droits réservés
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
