import { query } from "@/lib/server/db";
import type { Prediction } from "@/lib/types";

type PredictionRow = {
  id: string;
  target_round_no: number;
  predicted_multiplier: string | number;
  confidence: number;
  result: "pending" | "gagne" | "perdu";
  created_at: Date;
};

export type Suggestion = {
  targetRoundNo: number;
  predictedMultiplier: number;
  confidence: number;
  sampleSize: number;
  rationale: string;
};

/** Résout les prédictions dont la manche cible est terminée. */
export async function resolvePredictions(): Promise<void> {
  await query(
    `update public.predictions p
        set result = case when p.predicted_multiplier <= r.crash_multiplier then 'gagne' else 'perdu' end
       from public.game_rounds r
      where r.round_no = p.target_round_no
        and p.result = 'pending'
        and r.fly_end_at <= now()`,
  );
}

/**
 * Heuristique statistique locale (DEMO).
 * Propose le niveau franchi par ~65 % des dernières manches : ce n'est pas une
 * prédiction officielle et cela ne provient pas des API HONORE.
 */
export async function buildSuggestion(sampleSize = 24): Promise<Suggestion> {
  const rows = await query<{ crash_multiplier: string | number; round_no: number }>(
    `select crash_multiplier, round_no from public.game_rounds
      where fly_end_at <= now()
      order by round_no desc
      limit $1`,
    [sampleSize],
  );

  const nextRow = await query<{ next_no: number }>(
    "select coalesce(max(round_no), 0) + 1 as next_no from public.game_rounds",
  );
  const targetRoundNo = Number(nextRow[0]?.next_no ?? 1);

  const values = rows.map((row) => Number(row.crash_multiplier));
  if (values.length < 5) {
    return {
      targetRoundNo,
      predictedMultiplier: 1.5,
      confidence: 50,
      sampleSize: values.length,
      rationale:
        "Pas assez d'historique : valeur prudente utilisée par défaut (démo).",
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * 0.35)),
  );
  const level = Math.round(Math.min(5, Math.max(1.3, sorted[index])) * 100) / 100;
  const reached = values.filter((value) => value >= level).length;
  const confidence = Math.round((reached / values.length) * 100);

  return {
    targetRoundNo,
    predictedMultiplier: level,
    confidence,
    sampleSize: values.length,
    rationale: `Niveau franchi par ${reached} des ${values.length} dernières manches (${confidence} %). Heuristique statistique locale, aucune garantie.`,
  };
}

export async function savePrediction(
  userId: string,
  suggestion: Suggestion,
): Promise<void> {
  await query(
    `insert into public.predictions (user_id, target_round_no, predicted_multiplier, confidence)
     values ($1, $2, $3, $4)`,
    [
      userId,
      suggestion.targetRoundNo,
      suggestion.predictedMultiplier.toFixed(2),
      suggestion.confidence,
    ],
  );
}

export async function listPredictions(
  userId: string,
  limit = 15,
): Promise<Prediction[]> {
  const rows = await query<PredictionRow>(
    `select * from public.predictions
      where user_id = $1
      order by created_at desc
      limit $2`,
    [userId, limit],
  );

  return rows.map((row) => ({
    id: row.id,
    targetRoundNo: row.target_round_no,
    predictedMultiplier: Number(row.predicted_multiplier),
    confidence: row.confidence,
    result: row.result,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function getPredictionScore(userId: string) {
  const rows = await query<{ total: string; won: string }>(
    `select count(*)::text as total,
            count(*) filter (where result = 'gagne')::text as won
       from public.predictions
      where user_id = $1 and result <> 'pending'`,
    [userId],
  );
  const total = Number(rows[0]?.total ?? 0);
  const won = Number(rows[0]?.won ?? 0);
  return {
    total,
    won,
    accuracy: total === 0 ? 0 : Math.round((won / total) * 100),
  };
}
