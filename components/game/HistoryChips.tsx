import clsx from "clsx";
import { formatMultiplier, multiplierTone } from "@/lib/format";
import type { HistoryEntry } from "@/lib/types";

export function HistoryChips({
  history,
  limit = 14,
  className,
}: {
  history: HistoryEntry[];
  limit?: number;
  className?: string;
}) {
  const items = history.slice(0, limit);

  if (items.length === 0) {
    return (
      <p className="text-xs text-white/30">Aucune manche enregistrée pour le moment.</p>
    );
  }

  return (
    <div className={clsx("flex gap-1.5 overflow-x-auto pb-1", className)}>
      {items.map((entry) => (
        <span
          key={entry.no}
          className={clsx(
            "chip shrink-0 border-white/10 bg-white/[0.04] tabular-nums",
            multiplierTone(entry.crashMultiplier),
          )}
          title={`Manche #${entry.no}`}
        >
          {formatMultiplier(entry.crashMultiplier)}
        </span>
      ))}
    </div>
  );
}
