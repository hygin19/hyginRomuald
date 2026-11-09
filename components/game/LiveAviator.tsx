"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HistoryChips } from "@/components/game/HistoryChips";
import { FlightStage } from "@/components/game/FlightStage";
import { PhaseBadge } from "@/components/ui/Badges";
import { GAP_MS, MAX_BET, MIN_BET, multiplierAt } from "@/lib/game-constants";
import { formatMga, formatMultiplier } from "@/lib/format";
import type { GameState, RoundPhase } from "@/lib/types";

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

type Toast = { kind: "ok" | "error"; text: string };

export function LiveAviator({ initialState }: { initialState: GameState }) {
  const router = useRouter();
  const [state, setState] = useState<GameState>(initialState);
  const [amount, setAmount] = useState(500);
  const [clock, setClock] = useState(() => Date.now());
  const [busy, setBusy] = useState<null | "bet" | "cashout">(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const offsetRef = useRef(initialState.serverNow - Date.now());

  useEffect(() => {
    offsetRef.current = state.serverNow - Date.now();
  }, [state.serverNow]);

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 80);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(id);
  }, [toast]);

  const poll = useCallback(async () => {
    try {
      const response = await fetch("/api/game/state", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as GameState;
      setState(data);
    } catch {
      // le prochain cycle réessaiera
    }
  }, []);

  useEffect(() => {
    const id = setInterval(poll, 900);
    return () => clearInterval(id);
  }, [poll]);

  const serverNow = clock + offsetRef.current;
  const round = state.round;
  const phase: RoundPhase =
    serverNow < round.flyStartAt
      ? "waiting"
      : serverNow < round.flyEndAt
        ? "flying"
        : "crashed";

  const effectiveNow = Math.min(Math.max(serverNow, round.flyStartAt), round.flyEndAt);
  const rawMultiplier =
    phase === "waiting" ? 1 : multiplierAt(round.flyStartAt, effectiveNow);
  const liveMultiplier =
    phase === "crashed" ? (round.crashMultiplier ?? rawMultiplier) : rawMultiplier;

  const countdownSeconds = (round.waitEndsAt - serverNow) / 1000;
  const nextRoundSeconds = (round.flyEndAt + GAP_MS - serverNow) / 1000;

  const myBet = state.myBet;
  const betPlaced = myBet?.status === "placed";
  const potentialPayout =
    myBet && betPlaced ? Math.floor(myBet.amountMga * liveMultiplier) : 0;

  const canBet = phase === "waiting" && !myBet && busy === null;
  const canCash = phase === "flying" && betPlaced && busy === null;

  async function handleBet() {
    setBusy("bet");
    setToast(null);
    try {
      const response = await fetch("/api/game/bet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setToast({ kind: "error", text: data.error ?? "Mise impossible." });
      } else {
        setState(data.state as GameState);
        setToast({ kind: "ok", text: `Mise de ${formatMga(amount)} placée.` });
        router.refresh();
      }
    } catch {
      setToast({ kind: "error", text: "Connexion impossible. Réessayez." });
    } finally {
      setBusy(null);
    }
  }

  async function handleCashOut() {
    setBusy("cashout");
    setToast(null);
    try {
      const response = await fetch("/api/game/cashout", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setToast({ kind: "error", text: data.error ?? "Encaissement impossible." });
      } else {
        setState(data.state as GameState);
        setToast({
          kind: "ok",
          text: `Encaissé ${formatMga(data.payout)} à ${formatMultiplier(data.multiplier)}.`,
        });
        router.refresh();
      }
    } catch {
      setToast({ kind: "error", text: "Connexion impossible. Réessayez." });
    } finally {
      setBusy(null);
    }
  }

  const buttonLabel = (() => {
    if (busy === "bet") return "Envoi de la mise…";
    if (busy === "cashout") return "Encaissement…";
    if (canCash) return `Encaisser ${formatMultiplier(liveMultiplier)} · ${formatMga(potentialPayout)}`;
    if (phase === "waiting" && myBet) return `Mise placée · ${formatMga(myBet.amountMga)}`;
    if (phase === "waiting") return `Miser ${formatMga(amount)}`;
    if (phase === "flying") return "Trop tard pour cette manche";
    return `Prochaine manche dans ${Math.max(0, Math.ceil(nextRoundSeconds))} s`;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label">Manches récentes</p>
          <p className="mt-1 text-[11px] text-white/35">
            Simulateur local · aucune connexion aux serveurs HONORE
          </p>
        </div>
        <PhaseBadge phase={phase} />
      </div>

      <HistoryChips history={state.history} limit={12} />

      {toast && (
        <div
          role="status"
          className={clsx(
            "rounded-xl border px-3 py-2 text-xs font-medium",
            toast.kind === "ok"
              ? "border-mint/30 bg-mint/10 text-mint"
              : "border-flame-500/40 bg-flame-500/10 text-flame-300",
          )}
        >
          {toast.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="lg:col-start-1 lg:row-start-1">
          <FlightStage
            phase={phase}
            multiplier={liveMultiplier}
            elapsedMs={Math.max(0, effectiveNow - round.flyStartAt)}
            countdownSeconds={countdownSeconds}
            nextRoundSeconds={nextRoundSeconds}
            roundNo={round.no}
          />
        </div>

        {/* Panneau de mise */}
        <section className="surface p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <p className="label">Votre mise</p>
            <span className="text-[11px] text-white/40">Solde démo</span>
          </div>
          <p className="display-num mt-1 text-xl text-gold">{formatMga(state.balance)}</p>

          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(value)}
                className={clsx(
                  "rounded-lg border py-2 text-[11px] font-semibold tabular-nums transition",
                  amount === value
                    ? "border-flame-500/60 bg-flame-500/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07]",
                )}
              >
                {value >= 1000 ? `${value / 1000}k` : value}
              </button>
            ))}
          </div>

          <label className="mt-3 block">
            <span className="sr-only">Montant de la mise en MGA</span>
            <div className="flex items-center rounded-xl border border-white/10 bg-ink-950/70 focus-within:border-flame-500/60">
              <input
                type="number"
                inputMode="numeric"
                min={MIN_BET}
                max={MAX_BET}
                step={50}
                value={amount}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setAmount(
                    Number.isFinite(next)
                      ? Math.min(MAX_BET, Math.max(0, Math.round(next)))
                      : 0,
                  );
                }}
                className="w-full bg-transparent px-3 py-3 text-sm tabular-nums text-white outline-none"
              />
              <span className="pr-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                MGA
              </span>
            </div>
          </label>

          <button
            type="button"
            onClick={canCash ? handleCashOut : handleBet}
            disabled={canCash ? false : !canBet}
            className={clsx(
              "mt-3 w-full",
              canCash ? "btn-mint" : canBet ? "btn-primary" : "btn-ghost",
            )}
          >
            {buttonLabel}
          </button>

          <dl className="mt-4 space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <dt className="text-white/35">Gain potentiel</dt>
              <dd className="font-semibold tabular-nums text-white/80">
                {betPlaced && phase === "flying" ? formatMga(potentialPayout) : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-white/35">Mise minimum</dt>
              <dd className="tabular-nums text-white/60">{formatMga(MIN_BET)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-white/35">Mise maximum</dt>
              <dd className="tabular-nums text-white/60">{formatMga(MAX_BET)}</dd>
            </div>
          </dl>

          <p className="mt-4 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5 text-[10px] leading-relaxed text-white/35">
            Argent fictif. Aucun dépôt, aucun retrait, aucun pari réel n'est possible
            depuis cette démonstration.
          </p>
        </section>

        {/* Paris de la manche */}
        <section className="surface p-4 lg:col-start-1 lg:row-start-2">
          <div className="flex items-center justify-between">
            <p className="label">Paris de la manche #{round.no}</p>
            <span className="text-[11px] text-white/30">{state.feed.length}</span>
          </div>
          {state.feed.length === 0 ? (
            <p className="mt-3 text-xs text-white/30">
              Aucun pari sur cette manche pour l'instant.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-white/[0.05]">
              {state.feed.map((entry) => {
                const lost =
                  entry.status === "lost" ||
                  (entry.status === "placed" && phase === "crashed");
                return (
                  <li key={entry.id} className="flex items-center gap-2.5 py-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold uppercase text-white/50">
                      {entry.username.slice(0, 2)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-white/60">
                      {entry.username}
                    </span>
                    <span className="text-[11px] tabular-nums text-white/35">
                      {formatMga(entry.amountMga)}
                    </span>
                    {entry.status === "cashed" ? (
                      <span className="chip border-mint/30 bg-mint/10 tabular-nums text-mint">
                        {formatMultiplier(entry.cashedOutMultiplier ?? 1)}
                      </span>
                    ) : lost ? (
                      <span className="chip border-white/10 bg-white/5 text-white/30">
                        perdu
                      </span>
                    ) : (
                      <span className="chip border-gold/30 bg-gold/10 text-gold">
                        en vol
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
