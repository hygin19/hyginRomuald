"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(nextEmail: string, nextPassword: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Connexion impossible.");
        setBusy(false);
        return;
      }
      router.replace(data.role === "admin" ? "/admin" : "/dashboard");
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau.");
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(email, password);
      }}
    >
      <label className="block">
        <span className="label">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="joueur@exemple.mg"
          className="field mt-1.5"
        />
      </label>

      <label className="block">
        <span className="label">Mot de passe</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="field mt-1.5"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-flame-500/40 bg-flame-500/10 px-3 py-2 text-xs text-flame-300"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary mt-1 w-full">
        {busy ? "Connexion…" : "Se connecter"}
      </button>

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
        <p className="label">Comptes de démonstration</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: "Joueur démo", email: "demo@honore.mg", password: "Demo1234!" },
            { label: "Admin démo", email: "admin@honore.mg", password: "Admin1234!" },
          ].map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword(account.password);
              }}
              className={clsx(
                "rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/60",
                "transition hover:bg-white/[0.08] hover:text-white",
              )}
            >
              {account.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-white/30">
          demo@honore.mg · Demo1234! — admin@honore.mg · Admin1234!
        </p>
      </div>

      <p className="pt-1 text-center text-xs text-white/40">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-flame-300 hover:text-flame-200">
          Créer un compte démo
        </Link>
      </p>
    </form>
  );
}
