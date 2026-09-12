"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/use-session";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = searchParams.get("next") || "/";

  useEffect(() => {
    if (session) {
      router.replace(next);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (err) setError(err.message);
      else {
        router.replace(next);
        router.refresh();
      }
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nom_complet: email.split("@")[0] } },
      });
      setBusy(false);
      if (err) {
        setError(err.message);
        return;
      }
      if (data.session) {
        router.replace(next);
        router.refresh();
      } else {
        setMode("signin");
        setError("Compte créé. Si la confirmation par email est activée, vérifiez votre boîte mail, puis connectez-vous.");
      }
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex gap-1 border-b border-border bg-muted p-1.5">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={cn(
                "flex-1 cursor-pointer rounded-md py-2 text-[13px] font-medium",
                mode === m ? "bg-card text-ink shadow-sm" : "text-ink-soft"
              )}
            >
              {m === "signin" ? "Se connecter" : "Créer un compte"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-ink">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom@ief.local"
              className="rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-ink">Mot de passe</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="rounded-md border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </label>

          {error && (
            <p className="rounded-md border border-red-soft bg-red-soft/60 px-3 py-2 text-[12.5px] leading-relaxed text-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer rounded-lg bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Patientez…" : mode === "signin" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <p className="text-[11.5px] leading-relaxed text-ink-soft">
          Comptes de démonstration — mot de passe :{" "}
          <strong className="text-ink">IefAdmin2026!</strong>
        </p>
        <ul className="mt-2 space-y-0.5 text-[11.5px] leading-relaxed text-ink-soft">
          <li>super@ief.local — Super Admin</li>
          <li>ief@ief.local — Chef Admin</li>
          <li>secretaire@ief.local — Secrétaire Général</li>
          <li>nafi.toure@ief.local — Responsable RH</li>
          <li>mariam.cisse@ief.local — Agent Examens</li>
        </ul>
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