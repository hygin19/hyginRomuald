"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { HistoryNotice, type HistoryFeedback } from "@/components/history/HistoryNotice";
import { RetrySyncButton } from "@/components/history/RetrySyncButton";
import { toHistoryInputValue } from "@/lib/format";

/** Saisie MANUELLE uniquement : aucun multiplicateur n'est capturé automatiquement. */
export function ManualHistoryForm() {
  const router = useRouter();
  const [multiplier, setMultiplier] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<HistoryFeedback | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Heure par défaut calculée côté client : évite tout décalage d'hydratation.
  useEffect(() => {
    setOccurredAt(toHistoryInputValue());
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    setPendingId(null);

    try {
      const response = await fetch("/api/multiplier-history", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ multiplier, occurred_at: occurredAt }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const value = Number(data.record?.multiplier ?? 0);
        setFeedback({
          kind: "ok",
          text: `Enregistré dans les deux bases : ${value.toFixed(2)}x.`,
        });
        setMultiplier("");
        setOccurredAt(toHistoryInputValue());
        router.refresh();
      } else if (response.status === 207) {
        setFeedback({
          kind: "warning",
          text: data.warning ?? "Enregistrement partiel : synchronisation en attente.",
        });
        setPendingId(data.record?.id ?? null);
        setMultiplier("");
        setOccurredAt(toHistoryInputValue());
        router.refresh();
      } else {
        setFeedback({
          kind: "error",
          text: data.error ?? "Enregistrement impossible.",
        });
      }
    } catch {
      setFeedback({ kind: "error", text: "Connexion impossible." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="history-multiplier" className="label">
            Multiplicateur
          </label>
          <input
            id="history-multiplier"
            name="multiplier"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            placeholder="2.35"
            value={multiplier}
            onChange={(event) => setMultiplier(event.target.value)}
            className="field mt-1.5"
          />
        </div>

        <div>
          <label htmlFor="history-occurred-at" className="label">
            Date et heure (Africa/Antananarivo)
          </label>
          <input
            id="history-occurred-at"
            name="occurred_at"
            type="datetime-local"
            step="1"
            required
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            className="field mt-1.5"
          />
          <p className="mt-1 text-[10px] text-white/30">
            UTC+3 — secondes incluses, sélection manuelle.
          </p>
        </div>
      </div>

      <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-xs sm:w-auto">
        <Save className="h-3.5 w-3.5" />
        {busy ? "Enregistrement…" : "Enregistrer"}
      </button>

      {feedback && <HistoryNotice kind={feedback.kind} text={feedback.text} />}

      {pendingId && (
        <RetrySyncButton
          id={pendingId}
          label="Réessayer la synchronisation"
          onResult={(result) => {
            setFeedback(result);
            if (result.kind === "ok") setPendingId(null);
          }}
        />
      )}
    </form>
  );
}
