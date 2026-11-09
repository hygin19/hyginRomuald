"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HistoryChips } from "@/components/game/HistoryChips";
import { GAP_MS, multiplierAt } from "@/lib/game-constants";
import { formatMultiplier, multiplierTone } from "@/lib/format";
import type { GameState, RoundPhase } from "@/lib/types";

/** Bandeau compact « manche en direct » pour le tableau de bord. */
export function GameTicker({ initialState }: { initialState: GameState }) {
  const [state, setState] = useState(initialState);
  const [clock, setClock] = useState(() => Date.now());
  const offsetRef = useRef(initialState.serverNow - Date.now());

  useEffect(() => {
    offsetRef.current = state.serverNow - Date.now();
  }, [state.serverNow]);

  useEffect(() => {
    const tick = setInterval(() => setClock(Date.now()), 100);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const response = await fetch("/api/game/state", { cache: "no-store" });
        if (!response.ok) return;
        setState((await response.json()) as GameState);
      } catch {
        // silencieux
      }
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const serverNow = clock + offsetRef.current;
  const round = state.round;
  const phase: RoundPhase =
    serverNow < round.flyStartAt
      ? "waiting"
      : serverNow < round.flyEndAt
        ? "flying"
        : "crashed";
  const multiplier =
    phase === "waiting"
      ? 1
      : phase === "crashed"
        ? (round.crashMultiplier ??
          multiplierAt(round.flyStartAt, round.flyEndAt))
        : multiplierAt(round.flyStartAt, serverNow);

  const label =
    phase === "waiting"
      ? `Départ dans ${Math.max(0, Math.ceil((round.waitEndsAt - serverNow) / 1000))} s`
      : phase === "flying"
        ? "Manche en vol"
        : `Nouvelle manche dans ${Math.max(0, Math.ceil((round.flyEndAt + GAP_MS - serverNow) / 1000))} s`;

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-flame-500/30 bg-flame-500/10">
          <span
            className={clsx(
              "h-2 w-2 rounded-full",
              phase === "flying" ? "bg-mint" : phase === "crashed" ? "bg-flame-500" : "bg-gold",
            )}
          />
          <span className="absolute inset-0 animate-pulseGlow rounded-xl bg-flame-500/10" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="label">Manche #{round.no}</p>
          <p className="mt-0.5 truncate text-xs text-white/45">{label}</p>
        </div>
        <p className={clsx("display-num text-2xl", multiplierTone(multiplier))}>
          {formatMultiplier(multiplier)}
        </p>
      </div>
      <div className="border-t border-white/[0.06] px-4 py-2.5">
        <HistoryChips history={state.history} limit={8} />
      </div>
      <Link
        href="/jeu"
        className="block border-t border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-flame-300 transition hover:bg-white/[0.05]"
      >
        Entrer dans l'arène
      </Link>
    </div>
  );
}
