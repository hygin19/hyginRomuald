import clsx from "clsx";
import { formatDateTime, formatMga, formatMultiplier } from "@/lib/format";
import type { BetHistoryItem } from "@/lib/types";

export function RecentBets({ items }: { items: BetHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-xs text-white/30">
        Aucune mise enregistrée. Lancez une manche pour commencer.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.05]">
      {items.map((bet) => {
        const cashed = bet.status === "cashed";
        const net = cashed ? (bet.payoutMga ?? 0) - bet.amountMga : -bet.amountMga;
        return (
          <li key={bet.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white/75">
                Manche #{bet.roundNo}
              </p>
              <p className="mt-0.5 text-[10px] text-white/30">
                {formatDateTime(bet.createdAt)} · crash {formatMultiplier(bet.crashMultiplier)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs tabular-nums text-white/60">
                {formatMga(bet.amountMga)}
              </p>
              <p
                className={clsx(
                  "text-[10px] font-semibold tabular-nums",
                  cashed ? "text-mint" : "text-flame-400/80",
                )}
              >
                {cashed
                  ? `+${formatMga(net)} · ${formatMultiplier(bet.cashedOutMultiplier ?? 1)}`
                  : "perdu"}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
