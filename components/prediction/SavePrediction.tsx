"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bookmark } from "lucide-react";
import { formatMultiplier } from "@/lib/format";

export function SavePrediction({
  predicted,
  targetRoundNo,
}: {
  predicted: number;
  targetRoundNo: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/predictions", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ kind: "error", text: data.error ?? "Enregistrement impossible." });
      } else {
        setMessage({
          kind: "ok",
          text: `Prédiction enregistrée pour la manche #${targetRoundNo} (${formatMultiplier(predicted)}).`,
        });
        router.refresh();
      }
    } catch {
      setMessage({ kind: "error", text: "Connexion impossible." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="btn-primary w-full py-2.5 text-xs"
      >
        <Bookmark className="h-3.5 w-3.5" />
        {busy ? "Enregistrement…" : "Enregistrer cette prédiction"}
      </button>
      {message && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-[11px] ${
            message.kind === "ok"
              ? "border-mint/30 bg-mint/10 text-mint"
              : "border-flame-500/40 bg-flame-500/10 text-flame-300"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
