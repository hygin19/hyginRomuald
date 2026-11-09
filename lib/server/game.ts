import {
  DEMO_GAME_LOCK,
  GAP_MS,
  MAX_BET,
  MAX_CRASH,
  MIN_BET,
  WAIT_MS,
  flightDurationMs,
  multiplierAt,
} from "@/lib/game-constants";
import { query, queryOne, withTransaction } from "@/lib/server/db";
import type {
  BetView,
  FeedEntry,
  GameRoundView,
  GameState,
  HistoryEntry,
  RoundPhase,
} from "@/lib/types";

export {
  WAIT_MS,
  GAP_MS,
  GROWTH,
  MIN_FLIGHT_MS,
  MAX_CRASH,
  MIN_BET,
  MAX_BET,
  START_BALANCE,
  DEMO_GAME_LOCK,
  multiplierAt,
  flightDurationMs,
} from "@/lib/game-constants";

export type RoundRow = {
  id: string;
  round_no: number;
  crash_multiplier: string | number;
  started_at: Date;
  fly_start_at: Date;
  fly_end_at: Date;
};

type BetRow = {
  id: string;
  amount_mga: string | number;
  status: "placed" | "cashed" | "lost";
  cashed_out_multiplier: string | number | null;
  payout_mga: string | number | null;
};

/** Tirage de la manche (démo) : distribution type Aviator, plafonnée à 20x. */
export function sampleCrashMultiplier(): number {
  const u = Math.random();
  const raw = 0.99 / (1 - u);
  const clamped = Math.min(MAX_CRASH, Math.max(1, raw));
  return Math.round(clamped * 100) / 100;
}

export function phaseOf(round: RoundRow, nowMs: number): RoundPhase {
  const flyStart = new Date(round.fly_start_at).getTime();
  const flyEnd = new Date(round.fly_end_at).getTime();
  if (nowMs < flyStart) return "waiting";
  if (nowMs < flyEnd) return "flying";
  return "crashed";
}

function toBetView(row: BetRow | null): BetView | null {
  if (!row) return null;
  return {
    id: row.id,
    amountMga: Number(row.amount_mga),
    status: row.status,
    cashedOutMultiplier:
      row.cashed_out_multiplier === null ? null : Number(row.cashed_out_multiplier),
    payoutMga: row.payout_mga === null ? null : Number(row.payout_mga),
  };
}

function toRoundView(round: RoundRow, nowMs: number): GameRoundView {
  const phase = phaseOf(round, nowMs);
  return {
    id: round.id,
    no: round.round_no,
    phase,
    waitEndsAt: new Date(round.fly_start_at).getTime(),
    flyStartAt: new Date(round.fly_start_at).getTime(),
    flyEndAt: new Date(round.fly_end_at).getTime(),
    crashMultiplier:
      phase === "crashed" ? Number(round.crash_multiplier) : undefined,
  };
}

/**
 * Garantit l'existence d'une manche en cours. Crée la manche suivante après la
 * pause, et clôt les paris de la manche terminée. Verrou transactionnel pour
 * éviter les créations concurrentes.
 */
export async function ensureCurrentRound(): Promise<{
  round: RoundRow;
  nowMs: number;
}> {
  return withTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock($1)", [DEMO_GAME_LOCK]);

    const timeResult = await client.query<{ now: Date }>("select now() as now");
    const nowMs = new Date(timeResult.rows[0].now).getTime();

    const { rows } = await client.query<RoundRow>(
      "select * from public.game_rounds order by round_no desc limit 1",
    );
    const current = rows[0];

    if (current && nowMs < new Date(current.fly_end_at).getTime() + GAP_MS) {
      return { round: current, nowMs };
    }

    await client.query(
      `update public.bets b
          set status = 'lost'
         from public.game_rounds r
        where b.round_id = r.id
          and b.status = 'placed'
          and r.fly_end_at <= now()`,
    );

    const roundNo = (current?.round_no ?? 0) + 1;
    const crash = sampleCrashMultiplier();
    const flyStart = nowMs + WAIT_MS;
    const flyEnd = flyStart + flightDurationMs(crash);

    const inserted = await client.query<RoundRow>(
      `insert into public.game_rounds
         (round_no, crash_multiplier, started_at, fly_start_at, fly_end_at)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [
        roundNo,
        crash.toFixed(2),
        new Date(nowMs).toISOString(),
        new Date(flyStart).toISOString(),
        new Date(flyEnd).toISOString(),
      ],
    );

    return { round: inserted.rows[0], nowMs };
  });
}

export async function getCurrentRoundReadOnly(): Promise<RoundRow | null> {
  return queryOne<RoundRow>(
    "select * from public.game_rounds order by round_no desc limit 1",
  );
}

export async function getHistory(limit = 30): Promise<HistoryEntry[]> {
  const rows = await query<RoundRow>(
    `select * from public.game_rounds
      where fly_end_at <= now()
      order by round_no desc
      limit $1`,
    [limit],
  );
  return rows.map((row) => ({
    no: row.round_no,
    crashMultiplier: Number(row.crash_multiplier),
    endedAt: new Date(row.fly_end_at).getTime(),
  }));
}

export async function getBalance(userId: string): Promise<number> {
  const row = await queryOne<{ balance_mga: string | number }>(
    "select balance_mga from public.profiles where id = $1",
    [userId],
  );
  return Number(row?.balance_mga ?? 0);
}

export async function getFeed(roundId: string): Promise<FeedEntry[]> {
  const rows = await query<{
    id: string;
    username: string;
    amount_mga: string | number;
    status: "placed" | "cashed" | "lost";
    cashed_out_multiplier: string | number | null;
    payout_mga: string | number | null;
  }>(
    `select b.id, p.username, b.amount_mga, b.status, b.cashed_out_multiplier, b.payout_mga
       from public.bets b
       join public.profiles p on p.id = b.user_id
      where b.round_id = $1
      order by b.created_at desc
      limit 12`,
    [roundId],
  );

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    amountMga: Number(row.amount_mga),
    status: row.status,
    cashedOutMultiplier:
      row.cashed_out_multiplier === null ? null : Number(row.cashed_out_multiplier),
    payoutMga: row.payout_mga === null ? null : Number(row.payout_mga),
  }));
}

export async function getGameState(userId: string): Promise<GameState> {
  const { round, nowMs } = await ensureCurrentRound();
  const [history, betRow, balance, feed] = await Promise.all([
    getHistory(30),
    queryOne<BetRow>(
      "select * from public.bets where user_id = $1 and round_id = $2 limit 1",
      [userId, round.id],
    ),
    getBalance(userId),
    getFeed(round.id),
  ]);

  const view = toRoundView(round, nowMs);
  const flyEndAt = new Date(round.fly_end_at).getTime();

  return {
    serverNow: nowMs,
    round: view,
    history,
    myBet: toBetView(betRow),
    balance,
    nextRoundInMs:
      view.phase === "crashed" ? Math.max(0, flyEndAt + GAP_MS - nowMs) : 0,
    feed,
  };
}

export class GameError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function placeBet(
  userId: string,
  rawAmount: number,
): Promise<{ bet: BetView; balance: number; state: GameState }> {
  const amount = Math.round(rawAmount);
  if (!Number.isFinite(amount) || amount < MIN_BET || amount > MAX_BET) {
    throw new GameError(
      "MONTANT_INVALIDE",
      `La mise doit être comprise entre ${MIN_BET} et ${MAX_BET} MGA.`,
    );
  }

  const { round, nowMs } = await ensureCurrentRound();
  if (phaseOf(round, nowMs) !== "waiting") {
    throw new GameError(
      "MANCHE_EN_COURS",
      "Les mises sont fermées : la manche est déjà en vol.",
    );
  }

  const balance = await withTransaction(async (client) => {
    const profile = await client.query<{ balance_mga: string | number }>(
      "select balance_mga from public.profiles where id = $1 for update",
      [userId],
    );
    if (profile.rowCount === 0) {
      throw new GameError("PROFIL_INTROUVABLE", "Profil introuvable.");
    }
    const currentBalance = Number(profile.rows[0].balance_mga);
    if (currentBalance < amount) {
      throw new GameError("SOLDE_INSUFFISANT", "Solde de démonstration insuffisant.");
    }

    try {
      await client.query(
        `insert into public.bets (user_id, round_id, amount_mga)
         values ($1, $2, $3)`,
        [userId, round.id, amount],
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505" || code === "23P01") {
        throw new GameError("PARI_EXISTANT", "Vous avez déjà misé sur cette manche.");
      }
      throw error;
    }

    const updated = await client.query<{ balance_mga: string | number }>(
      `update public.profiles
          set balance_mga = balance_mga - $2
        where id = $1
        returning balance_mga`,
      [userId, amount],
    );
    return Number(updated.rows[0].balance_mga);
  });

  const betRow = await queryOne<BetRow>(
    "select * from public.bets where user_id = $1 and round_id = $2 limit 1",
    [userId, round.id],
  );
  const state = await getGameState(userId);
  return { bet: toBetView(betRow)!, balance, state };
}

export async function cashOut(
  userId: string,
): Promise<{
  multiplier: number;
  payout: number;
  balance: number;
  state: GameState;
}> {
  const round = await getCurrentRoundReadOnly();
  if (!round) {
    throw new GameError("AUCUNE_MANCHE", "Aucune manche en cours.");
  }

  const clock = await query<{ now: Date }>("select now() as now");
  const nowMs = new Date(clock[0].now).getTime();
  const phase = phaseOf(round, nowMs);
  if (phase !== "flying") {
    throw new GameError(
      phase === "waiting" ? "PAS_DECOLLAGE" : "MANCHE_TERMINEE",
      phase === "waiting"
        ? "Attendez le décollage pour encaisser."
        : "La manche est terminée.",
    );
  }

  const crash = Number(round.crash_multiplier);
  const multiplier =
    Math.round(
      Math.min(crash, multiplierAt(new Date(round.fly_start_at).getTime(), nowMs)) *
        100,
    ) / 100;

  const payout = await withTransaction(async (client) => {
    const betResult = await client.query<BetRow>(
      `update public.bets
          set status = 'cashed',
              cashed_out_multiplier = $3::numeric,
              payout_mga = floor(amount_mga * $3::numeric)::bigint,
              cashed_out_at = now()
        where user_id = $1 and round_id = $2 and status = 'placed'
        returning *`,
      [userId, round.id, multiplier],
    );

    if (betResult.rowCount === 0) {
      throw new GameError("AUCUN_PARIS", "Aucune mise active à encaisser.");
    }

    const paid = Number(betResult.rows[0].payout_mga);
    await client.query(
      "update public.profiles set balance_mga = balance_mga + $2 where id = $1",
      [userId, paid],
    );
    return paid;
  });

  const balance = await getBalance(userId);
  const state = await getGameState(userId);
  return { multiplier, payout, balance, state };
}
