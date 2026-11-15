"use client";

import clsx from "clsx";

export type HistoryFeedback = {
  kind: "ok" | "warning" | "error";
  text: string;
};

const TONES = {
  ok: "border-mint/30 bg-mint/10 text-mint",
  warning: "border-gold/40 bg-gold/10 text-gold",
  error: "border-flame-500/40 bg-flame-500/10 text-flame-300",
} as const;

/** Message de retour commun au formulaire et aux actions de ligne. */
export function HistoryNotice({
  kind,
  text,
  className,
}: HistoryFeedback & { className?: string }) {
  return (
    <p
      role="status"
      className={clsx("rounded-lg border px-3 py-2 text-[11px] leading-relaxed", TONES[kind], className)}
    >
      {text}
    </p>
  );
}
