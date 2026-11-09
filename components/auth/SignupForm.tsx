"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Création impossible.");
        setBusy(false);
        return;
      }
      if (data.requiresConfirmation) {
        setNotice(data.message ?? "Confirmez votre email pour activer votre compte.");
        setBusy(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Création impossible. Vérifiez votre réseau.");
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label className="block">
        <span className="label">Pseudo</span>
        <input
          type="text"
          required
          minLength={3}
          maxLength={24}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Ravinala"
          className="field mt-1.5"
        />
      </label>

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
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="8 caractères minimum"
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
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold"
        >
          {notice}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary mt-1 w-full">
        {busy ? "Création…" : "Créer mon compte démo"}
      </button>

      <p className="pt-1 text-center text-xs text-white/40">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-flame-300 hover:text-flame-200">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
