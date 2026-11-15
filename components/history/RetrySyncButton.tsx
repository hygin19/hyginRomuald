"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { HistoryFeedback } from "@/components/history/HistoryNotice";

/** Relance la synchronisation d'une entrée restée « en attente ». */
export function RetrySyncButton({
  id,
  label = "Réessayer la synchronisation",
  className,
  onResult,
}: {
  id: string;
  label?: string;
  className?: string;
  onResult?: (feedback: HistoryFeedback) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const response = await fetch(`/api/multiplier-history/${id}/sync`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        onResult?.({ kind: "ok", text: "Synchronisé : les deux bases sont à jour." });
        router.refresh();
      } else {
        onResult?.({
          kind: "error",
          text: data.warning ?? data.error ?? "Synchronisation impossible.",
        });
      }
    } catch {
      onResult?.({ kind: "error", text: "Connexion impossible." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={className ?? "btn-ghost px-3 py-1.5 text-[11px]"}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Synchronisation…" : label}
    </button>
  );
}
