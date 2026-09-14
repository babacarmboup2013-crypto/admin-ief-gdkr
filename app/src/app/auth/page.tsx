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
      style={{ background: "linear-gradient(135deg, #e8f0eb 0%, #f0f4f1 30%, #e6ede8 60%, #f2f5f3 100%)" }}
    >
      {/* Decorative radial blurs */}
      <div className="pointer-events-none absolute left-[8%] top-[10%] h-[500px] w-[500px] rounded-full bg-[#0d8a5a]/[0.06] blur-[80px]" />
      <div className="pointer-events-none absolute bottom-[5%] right-[15%] h-[350px] w-[350px] rounded-full bg-[#b8862f]/[0.05] blur-[60px]" />

      {/* Decorative large faded shape behind left content */}
      <div
        className="pointer-events-none absolute left-[12%] top-[15%] h-[520px] w-[420px] rounded-[60px] opacity-[0.07]"
        style={{ background: "linear-gradient(135deg, #0d8a5a, #0a6b45)" }}
      />

      {/* Home button */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-50 flex size-[42px] items-center justify-center rounded-full border-2 border-[#0a6b45]/30 bg-white/80 text-[#0a6b45] shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
      >
        <Home className="size-5" />
      </Link>

      {/* Main content */}
      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-10 px-6 lg:flex-row lg:justify-center lg:gap-24">

        {/* Left column: branding */}
        <div className="hidden max-w-md flex-col space-y-4 lg:flex">
          <h2 className="text-[32px] font-extrabold leading-tight text-[#12241a]">
            L&apos;administration IEF,<br />
            <span className="text-[#0a6b45]">simple et efficace.</span>
          </h2>
          <p className="text-sm leading-relaxed text-[#6b7670]">
            La plateforme de gestion du personnel et des écoles de la
            circonscription IEF Grand Dakar — suivi des affectations,
            mutations, archivages et dossiers RH en un seul endroit.
          </p>
        </div>

        {/* Right column: card */}
        <div className="w-full max-w-lg">
          {/* Logo + title */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0d8a5a] to-[#0a6b45] shadow-lg shadow-[#0a6b45]/20">
              <span className="text-[14px] font-bold tracking-widest text-white">AIGDKR</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#12241a]">
              Admin IEF
            </h1>
            <p className="mt-1 text-xs text-center text-[#6b7670]">
              Plateforme d&apos;administration IEF Grand Dakar
            </p>
          </div>

          {/* Login card */}
          <div
            className="rounded-2xl border border-[#e3e9e5] bg-white px-8 py-10 shadow-[0_1px_2px_rgba(10,30,20,0.04),0_12px_30px_-8px_rgba(10,30,20,0.10)]"
            style={{ transition: "transform .25s, box-shadow .25s, border-color .25s" }}
          >
            <h2 className="mb-6 text-center text-[16px] font-semibold text-[#12241a]">
              Connexion
            </h2>

            <form onSubmit={onSubmit} className="flex flex-col gap-5">
              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#6b7670]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom@ief.local"
                  className="w-full rounded-lg border border-[#e3e9e5] bg-white px-4 py-3 text-sm text-[#12241a] placeholder:text-[#aab5b0] outline-none transition-all focus:border-[#0d8a5a] focus:ring-2 focus:ring-[#0d8a5a]/15"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#6b7670]">
                  Mot de passe
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#aab5b0]" />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full rounded-lg border border-[#e3e9e5] bg-white py-3 pl-9 pr-10 text-sm text-[#12241a] placeholder:text-[#aab5b0] outline-none transition-all focus:border-[#0d8a5a] focus:ring-2 focus:ring-[#0d8a5a]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aab5b0] hover:text-[#6b7670] cursor-pointer"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-[#a8402f]/20 bg-[#fbe9e6] px-4 py-3 text-[12.5px] text-[#a8402f]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-[#16a374] to-[#0a4f3a] py-3 text-sm font-semibold text-white shadow-md shadow-[#0a4f3a]/20 transition-all hover:shadow-lg hover:shadow-[#0a4f3a]/25 disabled:opacity-60"
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
