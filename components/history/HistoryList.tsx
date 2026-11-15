import clsx from "clsx";
import { HistoryRowActions } from "@/components/history/HistoryRowActions";
import { formatHistoryDate, formatHistoryTime, formatMultiplier } from "@/lib/format";
import type { MultiplierHistoryItem } from "@/lib/types";

function SyncBadge({ status }: { status: MultiplierHistoryItem["syncStatus"] }) {
  const synced = status === "synced";
  return (
    <span
      className={clsx(
        "chip shrink-0",
        synced
          ? "border-mint/40 bg-mint/10 text-mint"
          : "border-gold/40 bg-gold/10 text-gold",
      )}
      title={
        synced
          ? "Présent dans Supabase et dans la base applicative"
          : "En attente de synchronisation avec l'une des deux bases"
      }
    >
      {synced ? "Synchronisé" : "En attente"}
    </span>
  );
}

/** Liste des saisies manuelles, de la plus récente à la plus ancienne. */
export function HistoryList({ items }: { items: MultiplierHistoryItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="surface-flat p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="display-num text-2xl text-gold">
                {formatMultiplier(item.multiplier)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-white/60">
                {formatHistoryDate(item.occurredAt)}
                <span className="mx-1 text-white/20">·</span>
                <span className="tabular-nums">{formatHistoryTime(item.occurredAt)}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-white/30">
                Saisie manuelle · ajoutée le {formatHistoryDate(item.createdAt)} à{" "}
                {formatHistoryTime(item.createdAt)} (UTC+3)
              </p>
            </div>
            <SyncBadge status={item.syncStatus} />
          </div>

          <div className="mt-2">
            <HistoryRowActions item={item} />
          </div>
        </li>
      ))}
    </ul>
  );
}
