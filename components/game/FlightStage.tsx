"use client";

import clsx from "clsx";
import { useMemo } from "react";
import { multiplierAt } from "@/lib/game-constants";
import { formatMultiplier, multiplierTone } from "@/lib/format";
import type { RoundPhase } from "@/lib/types";

const W = 400;
const H = 240;
const HORIZON_MS = 16_000;
const Y_MAX_MULT = 12;
const BASELINE = H - 26;

function yForMultiplier(multiplier: number): number {
  const norm = Math.min(1, Math.max(0, (multiplier - 1) / (Y_MAX_MULT - 1)));
  return BASELINE - norm * (H - 74);
}

export function FlightStage({
  phase,
  multiplier,
  elapsedMs,
  countdownSeconds,
  nextRoundSeconds,
  roundNo,
}: {
  phase: RoundPhase;
  multiplier: number;
  elapsedMs: number;
  countdownSeconds: number;
  nextRoundSeconds: number;
  roundNo: number;
}) {
  const points = useMemo(() => {
    const steps = 44;
    const arr: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = (elapsedMs * i) / steps;
      arr.push({
        x: Math.min(W, (t / HORIZON_MS) * W),
        y: yForMultiplier(multiplierAt(0, t)),
      });
    }
    return arr;
  }, [elapsedMs]);

  const head = points[points.length - 1] ?? { x: 0, y: BASELINE };
  const previous = points[points.length - 2] ?? head;
  const angle =
    phase === "flying"
      ? (Math.atan2((head.y - previous.y) * H, (head.x - previous.x) * W) * 180) /
        Math.PI
      : 0;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${head.x.toFixed(1)} ${BASELINE} L0 ${BASELINE} Z`;

  const planeX = phase === "waiting" ? 8.5 : (head.x / W) * 100;
  const planeY = phase === "waiting" ? 82 : (head.y / H) * 100;

  return (
    <div
      className={clsx(
        "relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07070c] sm:aspect-[16/9] lg:aspect-[16/10]",
        phase === "crashed" && "animate-shake",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_10%_100%,rgba(236,18,40,0.18),transparent_60%)]" />

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="trail" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#c00b1e" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#ec1228" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffc94a" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec1228" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ec1228" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            y1={H * ratio}
            x2={W}
            y2={H * ratio}
            stroke="#ffffff"
            strokeOpacity="0.05"
            strokeDasharray="4 8"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={`v-${ratio}`}
            x1={W * ratio}
            y1="0"
            x2={W * ratio}
            y2={H}
            stroke="#ffffff"
            strokeOpacity="0.04"
            strokeDasharray="4 8"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {phase !== "waiting" && (
          <>
            <path d={areaPath} fill="url(#area)" />
            <path
              d={linePath}
              fill="none"
              stroke="url(#trail)"
              strokeWidth="3.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        <line
          x1="0"
          y1={BASELINE}
          x2={W}
          y2={BASELINE}
          stroke="#ec1228"
          strokeOpacity="0.35"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Avion */}
      <div
        className="absolute transition-[left,top] duration-100 ease-linear"
        style={{
          left: `${planeX}%`,
          top: `${planeY}%`,
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
          opacity: phase === "crashed" ? 0 : 1,
          transitionProperty: "left, top, opacity",
          transitionDuration: phase === "crashed" ? "260ms" : "80ms",
        }}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 drop-shadow-[0_0_12px_rgba(236,18,40,0.85)] sm:h-10 sm:w-10">
          <path d="M23 12 2 2.4l4.7 9.6L2 21.6 23 12Z" fill="#ff3b4f" />
          <path d="M23 12 6.7 12l4.4 3.2L23 12Z" fill="#ffc94a" fillOpacity="0.85" />
        </svg>
      </div>

      {/* Multiplicateur */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4">
        {phase === "waiting" ? (
          <>
            <p className="label text-white/45">Départ dans</p>
            <p className="display-num mt-1 text-5xl text-white sm:text-6xl">
              {Math.max(0, Math.ceil(countdownSeconds))}
              <span className="ml-1 text-2xl text-white/40">s</span>
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-gold/80">
              Placez vos mises · démo
            </p>
          </>
        ) : phase === "crashed" ? (
          <>
            <p className="font-display text-xs font-bold uppercase tracking-[0.4em] text-flame-400">
              Crashé
            </p>
            <p className="display-num mt-1 text-5xl text-flame-400 sm:text-6xl">
              {formatMultiplier(multiplier)}
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
              Nouvelle manche dans {Math.max(0, Math.ceil(nextRoundSeconds))}s
            </p>
          </>
        ) : (
          <p
            className={clsx(
              "display-num text-6xl drop-shadow-[0_0_30px_rgba(236,18,40,0.5)] sm:text-7xl",
              multiplierTone(multiplier),
            )}
          >
            {formatMultiplier(multiplier)}
          </p>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2.5">
        <span className="chip border-white/10 bg-black/40 text-white/60">
          Manche #{roundNo}
        </span>
        <span className="chip border-flame-500/30 bg-black/40 text-[9px] uppercase tracking-[0.22em] text-flame-300">
          Honore · Démo
        </span>
      </div>

      {phase === "crashed" && (
        <div className="pointer-events-none absolute inset-0 animate-pulseGlow bg-flame-600/15" />
      )}
    </div>
  );
}
