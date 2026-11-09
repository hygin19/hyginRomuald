import { query } from "@/lib/server/db";
import { getAdapterStatus } from "@/lib/server/honore/adapter";
import type { HonoreAdapterStatus } from "@/lib/types";

export type AdminOverview = {
  users: number;
  admins: number;
  rounds: number;
  bets: number;
  wagered: number;
  paidOut: number;
  predictions: number;
  adapter: HonoreAdapterStatus;
  userRows: {
    id: string;
    email: string;
    username: string;
    role: "user" | "admin";
    balanceMga: number;
    bets: number;
    createdAt: string;
  }[];
  recentRounds: { no: number; crash: number; endedAt: string }[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const [counters] = await query<{
    users: string;
    admins: string;
    rounds: string;
    bets: string;
    wagered: string | null;
    paid_out: string | null;
    predictions: string;
  }>(`select
        (select count(*) from public.profiles)::text as users,
        (select count(*) from public.profiles where role = 'admin')::text as admins,
        (select count(*) from public.game_rounds)::text as rounds,
        (select count(*) from public.bets)::text as bets,
        (select coalesce(sum(amount_mga), 0) from public.bets)::text as wagered,
        (select coalesce(sum(payout_mga), 0) from public.bets)::text as paid_out,
        (select count(*) from public.predictions)::text as predictions`);

  const userRows = await query<{
    id: string;
    email: string;
    username: string;
    role: "user" | "admin";
    balance_mga: string;
    bets: string;
    created_at: Date;
  }>(`select p.id, p.email, p.username, p.role, p.balance_mga,
            (select count(*) from public.bets b where b.user_id = p.id)::text as bets,
            p.created_at
       from public.profiles p
      order by p.created_at desc
      limit 40`);

  const recentRounds = await query<{
    round_no: number;
    crash_multiplier: string;
    fly_end_at: Date;
  }>(`select round_no, crash_multiplier, fly_end_at
        from public.game_rounds
       where fly_end_at <= now()
       order by round_no desc
       limit 12`);

  return {
    users: Number(counters?.users ?? 0),
    admins: Number(counters?.admins ?? 0),
    rounds: Number(counters?.rounds ?? 0),
    bets: Number(counters?.bets ?? 0),
    wagered: Number(counters?.wagered ?? 0),
    paidOut: Number(counters?.paid_out ?? 0),
    predictions: Number(counters?.predictions ?? 0),
    adapter: getAdapterStatus(),
    userRows: userRows.map((row) => ({
      id: row.id,
      email: row.email,
      username: row.username,
      role: row.role,
      balanceMga: Number(row.balance_mga),
      bets: Number(row.bets),
      createdAt: new Date(row.created_at).toISOString(),
    })),
    recentRounds: recentRounds.map((row) => ({
      no: row.round_no,
      crash: Number(row.crash_multiplier),
      endedAt: new Date(row.fly_end_at).toISOString(),
    })),
  };
}
