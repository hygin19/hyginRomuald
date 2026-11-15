"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { HistoryNotice, type HistoryFeedback } from "@/components/history/HistoryNotice";
import { RetrySyncButton } from "@/components/history/RetrySyncButton";
import { toHistoryInputValue } from "@/lib/format";
import type { MultiplierHistoryItem } from "@/lib/types";

/** Modifier / supprimer une entrée : les deux bases sont mises à jour (même id). */
export function HistoryRowActions({ item }: { item: MultiplierHistoryItem }) {
  const router = useRouter();
  const [open, setOpen] = useState<"edit" | "confirm" | null>(null);
  const [multiplier, setMultiplier] = useState(item.multiplier.toFixed(2));
  const [occurredAt, setOccurredAt] = useState(toHistoryInputValue(item.occurredAt));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<HistoryFeedback | null>(null);

  function close() {
    setOpen(null);
    setFeedback(null);
    setMultiplier(item.multiplier.toFixed(2));
    setOccurredAt(toHistoryInputValue(item.occurredAt));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/multiplier-history/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ multiplier, occurred_at: occurredAt }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setFeedback({ kind: "ok", text: "Modification enregistrée dans les deux bases." });
        router.refresh();
        setOpen(null);
      } else if (response.status === 207) {
        setFeedback({
          kind: "warning",
          text: data.warning ?? "Modification locale enregistrée, synchronisation en attente.",
        });
        router.refresh();
      } else {
        setFeedback({ kind: "error", text: data.error ?? "Modification impossible." });
      }
    } catch {
      setFeedback({ kind: "error", text: "Connexion impossible." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/multiplier-history/${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setFeedback({ kind: "ok", text: "Entrée supprimée des deux bases." });
        setOpen(null);
        router.refresh();
      } else {
        setFeedback({ kind: "error", text: data.error ?? "Suppression impossible." });
      }
    } catch {
      setFeedback({ kind: "error", text: "Connexion impossible." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => (open === "edit" ? close() : setOpen("edit"))}
          className="btn-ghost px-3 py-1.5 text-[11px]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </button>
        <button
          type="button"
          onClick={() => (open === "confirm" ? close() : setOpen("confirm"))}
          className="btn-ghost px-3 py-1.5 text-[11px] text-flame-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer
        </button>
        {item.syncStatus === "pending" && (
          <RetrySyncButton id={item.id} onResult={setFeedback} />
        )}
      </div>

      {open === "edit" && (
        <form
          onSubmit={save}
          aria-label="Modifier l'entrée"
          className="surface-flat space-y-2 p-3"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor={`edit-multiplier-${item.id}`} className="label">
                Multiplicateur
              </label>
              <input
                id={`edit-multiplier-${item.id}`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                value={multiplier}
                onChange={(event) => setMultiplier(event.target.value)}
                className="field mt-1 py-2 text-xs"
              />
            </div>
            <div>
              <label htmlFor={`edit-date-${item.id}`} className="label">
                Date et heure (UTC+3)
              </label>
              <input
                id={`edit-date-${item.id}`}
                type="datetime-local"
                step="1"
                required
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                className="field mt-1 py-2 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-1.5">
            <button type="submit" disabled={busy} className="btn-primary px-3 py-1.5 text-[11px]">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={close} className="btn-ghost px-3 py-1.5 text-[11px]">
              <X className="h-3.5 w-3.5" />
              Annuler
            </button>
          </div>
        </form>
      )}

      {open === "confirm" && (
        <div
          role="dialog"
          aria-label="Confirmer la suppression"
          className="surface-flat space-y-2 border-flame-500/30 bg-flame-500/[0.06] p-3"
        >
          <p className="text-[11px] leading-relaxed text-white/70">
            Supprimer définitivement cette entrée ({item.multiplier.toFixed(2)}x) des
            deux bases ?
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="btn-ghost border-flame-500/40 bg-flame-500/15 px-3 py-1.5 text-[11px] text-flame-300"
            >
              {busy ? "Suppression…" : "Confirmer la suppression"}
            </button>
            <button type="button" onClick={close} className="btn-ghost px-3 py-1.5 text-[11px]">
              Annuler
            </button>
          </div>
        </div>
      )}

      {feedback && <HistoryNotice kind={feedback.kind} text={feedback.text} />}
    </div>
  );
}
