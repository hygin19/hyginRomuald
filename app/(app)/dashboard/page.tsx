import {
  ArrowUpRight,
  BarChart3,
  Radar,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { RecentBets } from "@/components/bets/RecentBets";
import { GameTicker } from "@/components/game/GameTicker";
import { DemoBadge } from "@/components/ui/Badges";
import { StatCard } from "@/components/ui/StatCard";
import { formatMga, formatMultiplier } from "@/lib/format";
import { requireUser } from "@/lib/server/auth";
import { getGameState } from "@/lib/server/game";
import { buildSuggestion } from "@/lib/server/predict";
import { getRecentBets, getRoundStats, getUserStats } from "@/lib/server/stats";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { profile } = await requireUser();

  const [roundStats, recentBets, suggestion, gameState, userStats] =
    await Promise.all([
      getRoundStats(100),
      getRecentBets(profile.id, 6),
      buildSuggestion(),
      getGameState(profile.id),
      getUserStats(profile.id),
    ]);

  const netPositive = userStats.netResult >= 0;

  return (
    <div className="animate-rise space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="label">Tableau de bord</p>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
            Bonjour, {profile.username}
          </h1>
        </div>
        <DemoBadge className="sm:hidden" />
      </div>

      <section className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        <div className="surface relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-flame-500/20 blur-3xl" />
          <div className="flex items-center justify-between">
            <span className="label">Solde de démonstration</span>
            <Wallet className="h-4 w-4 text-white/25" />
          </div>
          <p className="display-num mt-2 text-4xl text-gold sm:text-5xl">
            {formatMga(profile.balanceMga)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`chip ${
                netPositive
                  ? "border-mint/30 bg-mint/10 text-mint"
                  : "border-flame-500/30 bg-flame-500/10 text-flame-300"
              }`}
            >
              {netPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {netPositive ? "+" : ""}
              {formatMga(userStats.netResult)} sur {userStats.totalBets} mises
            </span>
            <span className="chip border-white/10 bg-white/[0.04] text-white/45">
              Taux d'encaissement {userStats.winRate} %
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href="/jeu" className="btn-primary flex-1 py-2.5 text-xs sm:flex-none sm:px-5">
              Jouer une manche
            </Link>
            <Link href="/prediction" className="btn-ghost flex-1 py-2.5 text-xs sm:flex-none sm:px-5">
              Prédire
            </Link>
          </div>
        </div>

        <GameTicker initialState={gameState} />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Moyenne / 100"
          value={formatMultiplier(roundStats.average)}
          hint={`${roundStats.totalRounds} manches analysées`}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          label="Record"
          value={formatMultiplier(roundStats.maximum)}
          hint="Plus haut crash"
          tone="gold"
        />
        <StatCard
          label="Dernier crash"
          value={formatMultiplier(roundStats.last)}
          hint={`Série basse : ${roundStats.lowStreak}`}
          tone="flame"
        />
        <StatCard
          label="Mes mises"
          value={userStats.totalBets}
          hint={`Gagnées : ${userStats.wonBets}`}
          tone="mint"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <div className="surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-white">
              Mes dernières mises
            </h2>
            <Link
              href="/statistiques"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-flame-300 hover:text-flame-200"
            >
              Statistiques
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-1.5">
            <RecentBets items={recentBets} />
          </div>
        </div>

        <div className="surface flex flex-col p-4">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-flame-400" />
            <h2 className="font-display text-sm font-bold text-white">
              Prochaine prédiction
            </h2>
          </div>

          <p className="mt-4 label">Manche #{suggestion.targetRoundNo}</p>
          <p className="display-num mt-1 text-3xl text-gold">
            {formatMultiplier(suggestion.predictedMultiplier)}
          </p>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-white/35">
              <span>Confiance</span>
              <span className="tabular-nums text-white/60">{suggestion.confidence} %</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-flame-600 via-flame-500 to-gold"
                style={{ width: `${Math.max(4, suggestion.confidence)}%` }}
              />
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-white/40">
            {suggestion.rationale}
          </p>

          <Link
            href="/prediction"
            className="btn-ghost mt-auto w-full py-2.5 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ouvrir le centre de prédiction
          </Link>
        </div>
      </section>
    </div>
  );
}
