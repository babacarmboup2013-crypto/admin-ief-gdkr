"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/use-session";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

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
      setError("Supabase non configuré — vérifiez .env.local.");
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
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-[72px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <span className="font-serif text-[22px] font-bold tracking-wide text-white">AIGDKR</span>
          </div>
          <h1 className="font-serif text-[22px] font-semibold text-white">
            IEF Grand Dakar
          </h1>
          <p className="mt-1.5 text-[13px] text-slate-400">
            Plateforme d&apos;administration
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-md">
          <h2 className="mb-1 text-center text-[15px] font-semibold text-white">
            Connexion
          </h2>
          <p className="mb-6 text-center text-[12.5px] text-slate-400">
            Accès réservé aux agents IEF
          </p>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom@ief.local"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-4 text-[13.5px] text-white placeholder:text-slate-500 outline-none transition-all focus:border-white/20 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-10 text-[13.5px] text-white placeholder:text-slate-500 outline-none transition-all focus:border-white/20 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12.5px] leading-relaxed text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 cursor-pointer rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-[13.5px] font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/30 disabled:opacity-60"
            >
              {busy ? "Patientez…" : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11.5px] text-slate-500">
          © 2025 IEF Grand Dakar — Tous droits réservés
        </p>
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
