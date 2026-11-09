#!/usr/bin/env node
/**
 * Amorçage idempotent de la base HONORE AVIATOR (mode démonstration).
 *
 *  1. attend PostgreSQL puis le schéma `auth` de GoTrue ;
 *  2. applique db/schema.sql ;
 *  3. crée les comptes de démonstration via Supabase Auth (GoTrue) ;
 *  4. insère des manches, mises et prédictions clairement fictives.
 *
 * Aucune donnée réelle n'est utilisée. Rejouable sans effet de bord.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const AUTH_URL = process.env.AUTH_INTERNAL_URL || "http://auth:9999";
const GROWTH = 0.155;

if (!DATABASE_URL) {
  console.error("[bootstrap] DATABASE_URL manquant");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 3 });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, label, attempts = 45) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      if (await check()) return;
    } catch {
      // on réessaie
    }
    if (i === 0) console.log(`[bootstrap] attente de ${label}…`);
    await sleep(2000);
  }
  throw new Error(`${label} indisponible`);
}

function sampleCrash() {
  const u = Math.random();
  const raw = 0.99 / (1 - u);
  return Math.min(20, Math.max(1, Math.round(raw * 100) / 100));
}

function flightMs(crash) {
  return Math.max(1200, (Math.log(crash) / GROWTH) * 1000);
}

async function ensureAuthUser(email, password) {
  await fetch(`${AUTH_URL}/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);

  const { rows } = await pool.query("select id from auth.users where email = $1", [
    email.toLowerCase(),
  ]);
  if (rows.length === 0) {
    throw new Error(`compte ${email} introuvable après inscription`);
  }
  return rows[0].id;
}

async function upsertProfile({ id, email, username, role, balance }) {
  await pool.query(
    `insert into public.profiles (id, email, username, role, balance_mga)
     values ($1, $2, $3, $4, $5)
     on conflict (id) do update set role = excluded.role, username = excluded.username`,
    [id, email, username, role, balance],
  );
}

const PLAYERS = [
  { email: "demo@honore.mg", password: "Demo1234!", username: "demo", role: "user" },
  { email: "admin@honore.mg", password: "Admin1234!", username: "admin", role: "admin" },
  { email: "ravinala@honore.mg", password: "Demo1234!", username: "ravinala", role: "user" },
  { email: "baobab@honore.mg", password: "Demo1234!", username: "baobab", role: "user" },
  { email: "soa@honore.mg", password: "Demo1234!", username: "soa", role: "user" },
];

async function seedRounds() {
  const { rows } = await pool.query("select count(*)::int as count from public.game_rounds");
  if (rows[0].count > 0) {
    console.log(`[bootstrap] ${rows[0].count} manches déjà présentes`);
    return;
  }

  const total = 60;
  const generated = [];
  let cursor = Date.now();
  for (let i = 0; i < total; i += 1) {
    const crash = sampleCrash();
    const flyStart = cursor;
    const flyEnd = flyStart + flightMs(crash);
    generated.push({ no: i + 1, crash, flyStart, flyEnd });
    cursor = flyEnd + 3200;
  }

  // Recale la série pour que la dernière manche se termine il y a ~10 s.
  const shift = Date.now() - 10_000 - generated[generated.length - 1].flyEnd;
  for (const item of generated) {
    item.flyStart += shift;
    item.flyEnd += shift;
  }

  for (const item of generated) {
    await pool.query(
      `insert into public.game_rounds
         (round_no, crash_multiplier, started_at, fly_start_at, fly_end_at)
       values ($1, $2, $3, $4, $5)
       on conflict (round_no) do nothing`,
      [
        item.no,
        item.crash.toFixed(2),
        new Date(item.flyStart - 9000).toISOString(),
        new Date(item.flyStart).toISOString(),
        new Date(item.flyEnd).toISOString(),
      ],
    );
  }
  console.log(`[bootstrap] ${total} manches de démonstration créées`);
}

async function seedBets(players) {
  const { rows } = await pool.query("select count(*)::int as count from public.bets");
  if (rows[0].count > 0) {
    console.log(`[bootstrap] ${rows[0].count} mises déjà présentes`);
    return;
  }

  const rounds = await pool.query(
    `select id, round_no, crash_multiplier, fly_start_at
       from public.game_rounds
      where fly_end_at <= now()
      order by round_no desc
      limit 14`,
  );

  if (rounds.rows.length === 0) return;

  let demoNet = 0;

  for (const round of rounds.rows) {
    for (const player of players) {
      if (Math.random() > 0.55) continue;
      const amount = [100, 250, 500, 1000, 2000][Math.floor(Math.random() * 5)];
      const crash = Number(round.crash_multiplier);
      const cashed = Math.random() < 0.46;
      const cashout = cashed
        ? Math.max(1.01, Math.min(crash, 1.1 + Math.random() * 2.4))
        : null;
      const payout = cashed ? Math.floor(amount * cashout) : null;
      const createdAt = new Date(
        new Date(round.fly_start_at).getTime() - 4000 + Math.random() * 3000,
      ).toISOString();

      await pool.query(
        `insert into public.bets
           (user_id, round_id, amount_mga, status, cashed_out_multiplier, payout_mga, created_at, cashed_out_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (user_id, round_id) do nothing`,
        [
          player.id,
          round.id,
          amount,
          cashed ? "cashed" : "lost",
          cashout === null ? null : cashout.toFixed(2),
          payout,
          createdAt,
          cashed ? new Date(new Date(round.fly_start_at).getTime() + 2000).toISOString() : null,
        ],
      );

      if (player.role !== "admin") {
        demoNet += cashed ? (payout ?? 0) - amount : -amount;
      }
    }
  }

  // Le solde du compte démo reflète son historique fictif.
  const demo = players.find((player) => player.username === "demo");
  if (demo) {
    await pool.query(
      "update public.profiles set balance_mga = greatest(5000, 50000 + $2) where id = $1",
      [demo.id, demoNet],
    );
  }
  console.log(`[bootstrap] mises de démonstration créées (net démo ${demoNet} MGA)`);
}

async function seedPredictions(demoId) {
  const { rows } = await pool.query("select count(*)::int as count from public.predictions");
  if (rows[0].count > 0) return;

  const rounds = await pool.query(
    `select round_no, crash_multiplier from public.game_rounds
      where fly_end_at <= now() order by round_no asc limit 8`,
  );

  for (const round of rounds.rows) {
    const predicted = Math.round((1.3 + Math.random() * 1.7) * 100) / 100;
    const result = Number(round.crash_multiplier) >= predicted ? "gagne" : "perdu";
    await pool.query(
      `insert into public.predictions (user_id, target_round_no, predicted_multiplier, confidence, result, created_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        demoId,
        round.round_no,
        predicted.toFixed(2),
        45 + Math.floor(Math.random() * 30),
        result,
        new Date(Date.now() - Math.random() * 600_000).toISOString(),
      ],
    );
  }
  console.log("[bootstrap] prédictions de démonstration créées");
}

async function main() {
  await waitFor(async () => {
    await pool.query("select 1");
    return true;
  }, "PostgreSQL");

  await waitFor(async () => {
    const { rows } = await pool.query(
      `select 1 from information_schema.tables
        where table_schema = 'auth' and table_name = 'users'`,
    );
    return rows.length > 0;
  }, "Supabase Auth (schéma auth)");

  const schema = await readFile(path.join(process.cwd(), "db/schema.sql"), "utf8");
  await pool.query(schema);
  console.log("[bootstrap] schéma applicatif appliqué");

  const players = [];
  for (const account of PLAYERS) {
    const id = await ensureAuthUser(account.email, account.password);
    await upsertProfile({
      id,
      email: account.email,
      username: account.username,
      role: account.role,
      balance: 50_000,
    });
    players.push({ ...account, id });
  }
  console.log(`[bootstrap] ${players.length} comptes vérifiés`);

  await seedRounds();
  await seedBets(players);
  const demo = players.find((player) => player.username === "demo");
  if (demo) await seedPredictions(demo.id);

  console.log("[bootstrap] terminé");
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[bootstrap] échec :", error.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
