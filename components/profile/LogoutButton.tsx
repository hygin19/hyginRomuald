"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // on redirige quand même
    }
    router.replace("/connexion");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="btn-ghost w-full text-xs"
    >
      {busy ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
