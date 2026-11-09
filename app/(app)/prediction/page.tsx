import type { Metadata } from "next";
import { AlertTriangle, Info, Radar, Target } from "lucide-react";
import { HistoryChips } from "@/components/game/HistoryChips";
import { SavePrediction } from "@/components/prediction/SavePrediction";
import { ResultBadge } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/StatCard";
import { formatDateTime, formatMultiplier } from "@/lib/format";
import { requireUser } from "@/lib/server/auth";
import { getHistory } from "@/lib/server/game";
import {
  buildSuggestion,
  getPredictionScore,
  listPredictions,
  resolvePredictions,
} from "@/lib/server/predict";

export const metadata: Metadata = { title: "Centre de prédiction" };
export const dynamic = "force-dynamic";

export default async function PredictionPage() {
  const { profile } = await requireUser();
  await resolvePredictions();

  const [suggestion, predictions, score, history] = await Promise.all([
    buildSuggestion(),
    listPredictions(profile.id, 12),
    getPredictionScore(profile.id),
    getHistory(20),
  ]);

  return (
    <div className="animate-rise space-y-4">
      <header>
        <p className="label">Centre de prédiction</p>
        <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
          Analyse de la prochaine manche
        </h1>
        <p className="mt-1 text-xs text-white/40">
          Heuristique statistique calculée côté serveur sur les dernières manches
          simulées.
        </p>
      </header>

      <HistoryChips history={history} limit={12} />

      <section className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-flame-500/20 blur-3xl" />
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-flame-500/25 bg-flame-500/10 text-flame-400">
              <Radar className="h-4 w-4" />
            </span>
            <div>
              <p className="label">Manche cible</p>
              <p className="font-display text-sm font-bold text-white">
                #{suggestion.targetRoundNo}
              </p>
            </div>
          </div>

          <p className="label mt-5">Seuil suggéré</p>
          <div className="mt-1 flex flex-wrap items-end gap-3">
            <p className="display-num text-5xl text-gold">
              {formatMultiplier(suggestion.predictedMultiplier)}
            </p>
            <span className="chip border-mint/30 bg-mint/10 text-mint">
              <Target className="h-3 w-3" />
              Confiance {suggestion.confidence} %
            </span>
          </div>

          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-flame-600 via-flame-500 to-gold"
                style={{ width: `${Math.max(4, suggestion.confidence)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/40">
              {suggestion.rationale}
            </p>
          </div>

          <div className="mt-5">
            <SavePrediction
              predicted={suggestion.predictedMultiplier}
              targetRoundNo={suggestion.targetRoundNo}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="surface p-4">
            <p className="label">Mon taux de réussite</p>
            <p className="display-num mt-2 text-3xl text-white">{score.accuracy} %</p>
            <p className="mt-1 text-[11px] text-white/40">
              {score.won} prédictions gagnées sur {score.total} évaluées.
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-mint/70 to-mint"
                style={{ width: `${Math.max(3, score.accuracy)}%` }}
              />
            </div>
          </div>

          <div className="surface border-gold/20 bg-gold/[0.04] p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
              <AlertTriangle className="h-3.5 w-3.5" />
              À lire
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/50">
              Ce centre ne se connecte à aucune API HONORE et ne prédit pas un
              résultat réel. Les manches sont générées aléatoirement par le
              simulateur : aucun modèle ne peut devancer un tirage indépendant.
            </p>
          </div>
        </div>
      </section>

      <section className="surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-white">
            Mes prédictions
          </h2>
          <span className="text-[11px] text-white/30">{predictions.length}</span>
        </div>

        {predictions.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Aucune prédiction enregistrée"
              description="Enregistrez votre première analyse pour suivre votre précision manche après manche."
            />
          </div>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  <th className="py-2 font-medium">Manche</th>
                  <th className="py-2 font-medium">Seuil</th>
                  <th className="py-2 font-medium">Confiance</th>
                  <th className="py-2 font-medium">Résultat</th>
                  <th className="py-2 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {predictions.map((prediction) => (
                  <tr key={prediction.id}>
                    <td className="py-2.5 font-semibold text-white/70">
                      #{prediction.targetRoundNo}
                    </td>
                    <td className="py-2.5 tabular-nums text-gold">
                      {formatMultiplier(prediction.predictedMultiplier)}
                    </td>
                    <td className="py-2.5 tabular-nums text-white/45">
                      {prediction.confidence} %
                    </td>
                    <td className="py-2.5">
                      <ResultBadge result={prediction.result} />
                    </td>
                    <td className="py-2.5 text-right text-[10px] text-white/30">
                      {formatDateTime(prediction.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface p-4">
        <p className="flex items-center gap-2 label">
          <Info className="h-3.5 w-3.5" />
          Méthode utilisée
        </p>
        <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-white/45">
          <li>
            1. Le serveur lit les 24 dernières manches terminées de la base de
            démonstration.
          </li>
          <li>
            2. Il retient le niveau franchi par environ 65 % d'entre elles
            (35e centile), plafonné à 5,00x.
          </li>
          <li>
            3. La confiance correspond au pourcentage de manches ayant dépassé ce
            seuil. Une prédiction est « gagnée » si le crash dépasse le seuil.
          </li>
        </ol>
      </section>
    </div>
  );
}
