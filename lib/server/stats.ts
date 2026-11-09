import { query } from "@/lib/server/db";
import type { BetHistoryItem, RoundStats } from "@/lib/types";

type CrashRow = { crash_multiplier: string | number };

export async function getRoundStats(sampleSize = 100): Promise<RoundStats> {
  const rows = await query<CrashRow>(
    `select crash_multiplier from public.game_rounds
      where fly_end_at <= now()
      order by round_no desc
      limit $1`,
    [sampleSize],
  );
  const values = rows.map((row) => Number(row.crash_multiplier));

  if (values.length === 0) {
    return {
      totalRounds: 0,
      average: 0,
      maximum: 0,
      minimum: 0,
      last: 0,
      under2: 0,
      between2and5: 0,
      between5and10: 0,
      over10: 0,
      lowStreak: 0,
      highStreak: 0,
    };
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / values.length;

  let lowStreak = 0;
  for (const value of values) {
    if (value < 2) lowStreak += 1;
    else break;
  }
  let highStreak = 0;
  for (const value of values) {
    if (value >= 2) highStreak += 1;
    else break;
  }

  return {
    totalRounds: values.length,
    average: Math.round(average * 100) / 100,
    maximum: Math.max(...values),
    minimum: Math.min(...values),
    last: values[0],
    under2: values.filter((value) => value < 2).length,
    between2and5: values.filter((value) => value >= 2 && value < 5).length,
    between5and10: values.filter((value) => value >= 5 && value < 10).length,
    over10: values.filter((value) => value >= 10).length,
    lowStreak,
    highStreak,
  };
}

export type UserStats = {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  totalWagered: number;
  totalPayout: number;
  netResult: number;
  bestMultiplier: number;
  winRate: number;
};

export async function getUserStats(userId: string): Promise<UserStats> {
  const rows = await query<{
    total_bets: string;
    won_bets: string;
    total_wagered: string | null;
    total_payout: string | null;
    best_multiplier: string | null;
  }>(
    `select
        count(*)::text as total_bets,
        count(*) filter (where status = 'cashed')::text as won_bets,
        coalesce(sum(amount_mga), 0)::text as total_wagered,
        coalesce(sum(payout_mga), 0)::text as total_payout,
        max(cashed_out_multiplier)::text as best_multiplier
       from public.bets
      where user_id = $1`,
    [userId],
  );

  const row = rows[0];
  const totalBets = Number(row?.total_bets ?? 0);
  const wonBets = Number(row?.won_bets ?? 0);
  const totalWagered = Number(row?.total_wagered ?? 0);
  const totalPayout = Number(row?.total_payout ?? 0);

  return {
    totalBets,
    wonBets,
    lostBets: totalBets - wonBets,
    totalWagered,
    totalPayout,
    netResult: totalPayout - totalWagered,
    bestMultiplier: Number(row?.best_multiplier ?? 0),
    winRate: totalBets === 0 ? 0 : Math.round((wonBets / totalBets) * 100),
  };
}

export async function getRecentBets(
  userId: string,
  limit = 12,
): Promise<BetHistoryItem[]> {
  const rows = await query<{
    id: string;
    amount_mga: string;
    status: "placed" | "cashed" | "lost";
    cashed_out_multiplier: string | null;
    payout_mga: string | null;
    round_no: number;
    crash_multiplier: string;
    created_at: Date;
  }>(
    `select b.id, b.amount_mga, b.status, b.cashed_out_multiplier, b.payout_mga,
            r.round_no, r.crash_multiplier, b.created_at
       from public.bets b
       join public.game_rounds r on r.id = b.round_id
      where b.user_id = $1
      order by b.created_at desc
      limit $2`,
    [userId, limit],
  );

  return rows.map((row) => ({
    id: row.id,
    amountMga: Number(row.amount_mga),
    status: row.status,
    cashedOutMultiplier:
      row.cashed_out_multiplier === null ? null : Number(row.cashed_out_multiplier),
    payoutMga: row.payout_mga === null ? null : Number(row.payout_mga),
    roundNo: row.round_no,
    crashMultiplier: Number(row.crash_multiplier),
    createdAt: new Date(row.created_at).toISOString(),
  }));
}
