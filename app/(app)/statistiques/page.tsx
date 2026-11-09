import type { Metadata } from "next";
import { BarChart3, Coins, Percent, TrendingUp } from "lucide-react";
import { HistoryChips } from "@/components/game/HistoryChips";
import { RecentBets } from "@/components/bets/RecentBets";
import { StatCard } from "@/components/ui/StatCard";
import { formatMga, formatMultiplier, formatTime } from "@/lib/format";
import { requireUser } from "@/lib/server/auth";
import { getHistory } from "@/lib/server/game";
import { getRecentBets, getRoundStats, getUserStats } from "@/lib/server/stats";

export const metadata: Metadata = { title: "Statistiques" };
export const dynamic = "force-dynamic";

export default async function StatistiquesPage() {
  const { profile } = await requireUser();
  const [roundStats, history, userStats, recentBets] = await Promise.all([
    getRoundStats(100),
    getHistory(30),
    getUserStats(profile.id),
    getRecentBets(profile.id, 10),
  ]);

  const total = roundStats.totalRounds || 1;
  const buckets = [
    {
      label: "Moins de 2,00x",
      count: roundStats.under2,
      className: "from-flame-700 to-flame-500",
    },
    {
      label: "2,00x – 4,99x",
      count: roundStats.between2and5,
      className: "from-flame-500 to-[#ff8a5c]",
    },
    {
      label: "5,00x – 9,99x",
      count: roundStats.between5and10,
      className: "from-[#ff8a5c] to-gold",
    },
    {
      label: "10,00x et plus",
      count: roundStats.over10,
      className: "from-gold to-[#fff0c2]",
    },
  ];

  return (
    <div className="animate-rise space-y-4">
      <header>
        <p className="label">Statistiques</p>
        <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
          Comportement des manches
        </h1>
        <p className="mt-1 text-xs text-white/40">
          Analyse des {roundStats.totalRounds} dernières manches simulées et de vos
          mises de démonstration.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Moyenne"
          value={formatMultiplier(roundStats.average)}
          hint="100 dernières manches"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          label="Record"
          value={formatMultiplier(roundStats.maximum)}
          hint={`Minimum ${formatMultiplier(roundStats.minimum)}`}
          tone="gold"
        />
        <StatCard
          label="Série basse"
          value={roundStats.lowStreak}
          hint="Crashs consécutifs < 2,00x"
          tone="flame"
        />
        <StatCard
          label="Série haute"
          value={roundStats.highStreak}
          hint="Crashs consécutifs ≥ 2,00x"
          tone="mint"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="surface p-4">
          <h2 className="font-display text-sm font-bold text-white">
            Distribution des multiplicateurs
          </h2>
          <ul className="mt-3 space-y-3">
            {buckets.map((bucket) => {
              const percent = Math.round((bucket.count / total) * 100);
              return (
                <li key={bucket.label}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/50">{bucket.label}</span>
                    <span className="tabular-nums text-white/70">
                      {bucket.count} · {percent} %
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${bucket.className}`}
                      style={{ width: `${Math.max(percent, bucket.count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[10px] leading-relaxed text-white/30">
            La majorité des manches se terminent sous 2,00x : c'est la mécanique
            normale d'un jeu de type Aviator simulé.
          </p>
        </div>

        <div className="surface p-4">
          <h2 className="font-display text-sm font-bold text-white">
            Mon bilan de démonstration
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            {[
              {
                label: "Total misé",
                value: formatMga(userStats.totalWagered),
                icon: <Coins className="h-3.5 w-3.5" />,
              },
              {
                label: "Total encaissé",
                value: formatMga(userStats.totalPayout),
                icon: <TrendingUp className="h-3.5 w-3.5" />,
              },
              {
                label: "Taux de réussite",
                value: `${userStats.winRate} %`,
                icon: <Percent className="h-3.5 w-3.5" />,
              },
              {
                label: "Meilleur encaissement",
                value: formatMultiplier(userStats.bestMultiplier),
                icon: <BarChart3 className="h-3.5 w-3.5" />,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-white/30">
                  {item.icon}
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-white/85">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[10px] text-white/30">
            {userStats.wonBets} encaissements sur {userStats.totalBets} mises ·
            résultat net {formatMga(userStats.netResult)}
          </p>
        </div>
      </section>

      <section className="surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-white">
            Historique des crashes
          </h2>
          <span className="text-[11px] text-white/30">30 dernières</span>
        </div>
        <div className="mt-2">
          <HistoryChips history={history} limit={30} />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                <th className="py-2 font-medium">Manche</th>
                <th className="py-2 font-medium">Crash</th>
                <th className="py-2 text-right font-medium">Terminée à</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {history.slice(0, 14).map((entry) => (
                <tr key={entry.no}>
                  <td className="py-2 text-white/55">#{entry.no}</td>
                  <td className="py-2 font-semibold tabular-nums text-white/85">
                    {formatMultiplier(entry.crashMultiplier)}
                  </td>
                  <td className="py-2 text-right text-[10px] tabular-nums text-white/30">
                    {formatTime(entry.endedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="font-display text-sm font-bold text-white">Mes dernières mises</h2>
        <div className="mt-1">
          <RecentBets items={recentBets} />
        </div>
      </section>
    </div>
  );
}
