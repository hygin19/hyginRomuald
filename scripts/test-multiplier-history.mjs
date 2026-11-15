#!/usr/bin/env node
/**
 * Tests du module « Historique manuel des multiplicateurs ».
 *
 * À lancer dans le conteneur web (base + application disponibles) :
 *   docker compose ... exec -T web node scripts/test-multiplier-history.mjs
 *
 * Couvre : saisie valide, multiplicateur invalide, date manquante,
 * Supabase indisponible, base applicative indisponible, reprise après
 * synchronisation partielle, et absence de doublon au rejeu.
 */
import pg from "pg";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const DEMO = { email: "demo@honore.mg", password: "Demo1234!" };
const OTHER = { email: "baobab@honore.mg", password: "Demo1234!" };

const RESULTS = [];
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const createdIds = [];
const renamed = [];

function check(name, passed, detail) {
  RESULTS.push({ name, passed, detail });
  console.log(`${passed ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function login(account) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(account),
  });
  if (!response.ok) throw new Error(`login ${account.email} → ${response.status}`);
  const cookies = response.headers.getSetCookie().map((value) => value.split(";")[0]);
  return cookies.join("; ");
}

async function call(method, path, { body, cookie } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function rows(table, id) {
  const { rows: found } = await pool.query(
    `select id, multiplier, occurred_at, created_by, source, sync_status from public.${table} where id = $1`,
    [id],
  );
  return found;
}

async function rename(table, backup) {
  await pool.query(`alter table public.${table} rename to ${backup}`);
  renamed.push({ table, backup });
}

async function restoreAll() {
  while (renamed.length > 0) {
    const { table, backup } = renamed.pop();
    await pool.query(`alter table public.${backup} rename to ${table}`).catch((error) => {
      console.error(`restauration ${table} impossible :`, error.message);
    });
  }
}

async function cleanup() {
  for (const id of createdIds) {
    await pool
      .query("delete from public.multiplier_history where id = $1", [id])
      .catch(() => {});
    await pool
      .query("delete from public.multiplier_history_entity where id = $1", [id])
      .catch(() => {});
  }
}

async function main() {
  const demoCookie = await login(DEMO);
  const otherCookie = await login(OTHER);
  const { rows: demoRows } = await pool.query("select id from public.profiles where email = $1", [
    DEMO.email,
  ]);
  const demoId = demoRows[0].id;

  // 1 — authentification requise
  const anonymous = await call("POST", "/api/multiplier-history", {
    body: { multiplier: "2.10", occurred_at: "2026-11-15T10:00:00" },
  });
  check("saisie refusée sans session", anonymous.status === 401, `HTTP ${anonymous.status}`);

  // 2 — saisie manuelle valide
  const valid = await call("POST", "/api/multiplier-history", {
    cookie: demoCookie,
    body: { multiplier: "2.35", occurred_at: "2026-11-15T22:00:00" },
  });
  const validId = valid.data?.record?.id;
  if (validId) createdIds.push(validId);
  const supabaseRow = validId ? (await rows("multiplier_history", validId))[0] : null;
  const entityRow = validId ? (await rows("multiplier_history_entity", validId))[0] : null;
  check(
    "saisie valide enregistrée dans les deux bases",
    valid.status === 201 && supabaseRow && entityRow,
    `HTTP ${valid.status}`,
  );
  check(
    "même UUID dans les deux bases, statut synchronisé",
    Boolean(supabaseRow && entityRow) &&
      supabaseRow.id === entityRow.id &&
      supabaseRow.sync_status === "synced" &&
      entityRow.sync_status === "synced" &&
      supabaseRow.source === "manual" &&
      supabaseRow.created_by === demoId,
    `supabase=${supabaseRow?.sync_status} entity=${entityRow?.sync_status}`,
  );
  check(
    "heure interprétée en UTC+3 (22:00 → 19:00Z)",
    new Date(entityRow?.occurred_at).toISOString() === "2026-11-15T19:00:00.000Z",
    new Date(entityRow?.occurred_at).toISOString(),
  );

  // 3 — multiplicateur invalide ou vide
  const beforeInvalid = await countRows(demoId);
  const invalidValues = ["", "0", "-2", "abc", "1.2.3"];
  const invalidStatuses = [];
  for (const value of invalidValues) {
    const attempt = await call("POST", "/api/multiplier-history", {
      cookie: demoCookie,
      body: { multiplier: value, occurred_at: "2026-11-15T10:00:00" },
    });
    invalidStatuses.push(attempt.status);
  }
  check(
    "multiplicateur invalide rejeté (400)",
    invalidStatuses.every((status) => status === 400),
    invalidStatuses.join(","),
  );
  check(
    "aucune entrée créée par les saisies invalides",
    (await countRows(demoId)) === beforeInvalid,
  );

  // 4 — date/heure manquante ou invalide
  const dateStatuses = [];
  for (const value of [undefined, "", "pas-une-date", "2026-13-45T10:00:00"]) {
    const attempt = await call("POST", "/api/multiplier-history", {
      cookie: demoCookie,
      body: { multiplier: "1.80", occurred_at: value },
    });
    dateStatuses.push(attempt.status);
  }
  check(
    "date/heure manquante ou invalide rejetée (400)",
    dateStatuses.every((status) => status === 400),
    dateStatuses.join(","),
  );

  // 5 — Supabase indisponible : entrée locale « en attente » + reprise
  const markerA = "2001-02-03T04:05:06";
  await rename("multiplier_history", "multiplier_history_test_bak");
  const supabaseDown = await call("POST", "/api/multiplier-history", {
    cookie: demoCookie,
    body: { multiplier: "1.55", occurred_at: markerA },
  });
  const supabaseDownId = supabaseDown.data?.record?.id;
  if (supabaseDownId) createdIds.push(supabaseDownId);
  const pendingEntity = supabaseDownId
    ? (await rows("multiplier_history_entity", supabaseDownId))[0]
    : null;
  check(
    "Supabase indisponible → avertissement, pas de faux succès",
    supabaseDown.status === 207 &&
      supabaseDown.data?.synced === false &&
      typeof supabaseDown.data?.warning === "string",
    `HTTP ${supabaseDown.status}`,
  );
  check(
    "entrée conservée localement en attente",
    pendingEntity?.sync_status === "pending",
    pendingEntity?.sync_status,
  );
  await restoreAll();
  const retryA = await call("POST", `/api/multiplier-history/${supabaseDownId}/sync`, {
    cookie: demoCookie,
  });
  const retryASupabase = supabaseDownId ? await rows("multiplier_history", supabaseDownId) : [];
  const retryAEntity = supabaseDownId ? await rows("multiplier_history_entity", supabaseDownId) : [];
  check(
    "reprise après synchronisation partielle (207 → synchronisé)",
    retryA.status === 200 &&
      retryASupabase.length === 1 &&
      retryAEntity.length === 1 &&
      retryASupabase[0].sync_status === "synced" &&
      retryAEntity[0].sync_status === "synced",
    `HTTP ${retryA.status}, supabase=${retryASupabase.length}, entity=${retryAEntity.length}`,
  );

  // 6 — base applicative indisponible : Supabase conserve l'entrée en attente
  const markerB = "2001-06-07T08:09:10";
  await rename("multiplier_history_entity", "multiplier_history_entity_test_bak");
  const entityDown = await call("POST", "/api/multiplier-history", {
    cookie: demoCookie,
    body: { multiplier: "1.65", occurred_at: markerB },
  });
  const { rows: orphanRows } = await pool.query(
    "select id, sync_status from public.multiplier_history where created_by = $1 and occurred_at = $2",
    [demoId, new Date(`${markerB}+03:00`).toISOString()],
  );
  if (orphanRows[0]) createdIds.push(orphanRows[0].id);
  check(
    "base applicative indisponible → erreur explicite, pas de succès",
    entityDown.status === 503 && typeof entityDown.data?.error === "string",
    `HTTP ${entityDown.status}`,
  );
  check(
    "Supabase conserve l'entrée en attente",
    orphanRows.length === 1 && orphanRows[0].sync_status === "pending",
    `lignes=${orphanRows.length}, statut=${orphanRows[0]?.sync_status}`,
  );
  await restoreAll();
  const orphanId = orphanRows[0]?.id;
  const retryB = orphanId
    ? await call("POST", `/api/multiplier-history/${orphanId}/sync`, { cookie: demoCookie })
    : { status: 0 };
  const retryBSupabase = orphanId ? await rows("multiplier_history", orphanId) : [];
  const retryBEntity = orphanId ? await rows("multiplier_history_entity", orphanId) : [];
  check(
    "reprise après écriture partielle côté applicatif",
    retryB.status === 200 &&
      retryBSupabase.length === 1 &&
      retryBEntity.length === 1 &&
      retryBEntity[0].sync_status === "synced",
    `HTTP ${retryB.status}, entity=${retryBEntity.length}`,
  );

  // 7 — rejeu : aucun doublon
  if (orphanId) {
    await call("POST", `/api/multiplier-history/${orphanId}/sync`, { cookie: demoCookie });
    const replaySupabase = await rows("multiplier_history", orphanId);
    const replayEntity = await rows("multiplier_history_entity", orphanId);
    check(
      "rejeu de synchronisation sans doublon",
      replaySupabase.length === 1 && replayEntity.length === 1,
      `supabase=${replaySupabase.length}, entity=${replayEntity.length}`,
    );
  }

  // 8 — modification : même id dans les deux bases
  const edited = await call("PATCH", `/api/multiplier-history/${validId}`, {
    cookie: demoCookie,
    body: { multiplier: "3.50", occurred_at: "2026-11-15T23:30:45" },
  });
  const editedSupabase = await rows("multiplier_history", validId);
  const editedEntity = await rows("multiplier_history_entity", validId);
  check(
    "modification propagée aux deux bases (même id)",
    edited.status === 200 &&
      editedSupabase.length === 1 &&
      editedEntity.length === 1 &&
      Number(editedSupabase[0].multiplier) === 3.5 &&
      Number(editedEntity[0].multiplier) === 3.5 &&
      editedEntity[0].sync_status === "synced",
    `HTTP ${edited.status}`,
  );

  // 9 — accès d'un autre utilisateur refusé
  const foreign = await call("PATCH", `/api/multiplier-history/${validId}`, {
    cookie: otherCookie,
    body: { multiplier: "9.99", occurred_at: "2026-11-15T10:00:00" },
  });
  check(
    "entrée d'un autre utilisateur inaccessible (404)",
    foreign.status === 404,
    `HTTP ${foreign.status}`,
  );

  // 10 — suppression confirmée dans les deux bases
  const deleted = await call("DELETE", `/api/multiplier-history/${validId}`, {
    cookie: demoCookie,
  });
  const goneSupabase = await rows("multiplier_history", validId);
  const goneEntity = await rows("multiplier_history_entity", validId);
  check(
    "suppression effective dans les deux bases",
    deleted.status === 200 && goneSupabase.length === 0 && goneEntity.length === 0,
    `HTTP ${deleted.status}`,
  );
  const deletedAgain = await call("DELETE", `/api/multiplier-history/${validId}`, {
    cookie: demoCookie,
  });
  check("suppression d'une entrée absente refusée (404)", deletedAgain.status === 404);

  // 11 — liste paginée et filtrable
  const nextDay = await call("POST", "/api/multiplier-history", {
    cookie: demoCookie,
    body: { multiplier: "1.10", occurred_at: "2026-11-16T08:30:00" },
  });
  if (nextDay.data?.record?.id) createdIds.push(nextDay.data.record.id);

  const all = await call("GET", "/api/multiplier-history", { cookie: demoCookie });
  const sameDay = await call("GET", "/api/multiplier-history?du=2026-11-15&au=2026-11-15", {
    cookie: demoCookie,
  });
  const otherDay = await call("GET", "/api/multiplier-history?du=2026-11-16&au=2026-11-16", {
    cookie: demoCookie,
  });
  const onlyNextDay =
    otherDay.status === 200 &&
    otherDay.data.items.length === 1 &&
    otherDay.data.items[0].multiplier === 1.1;
  const excludesNextDay =
    sameDay.status === 200 &&
    sameDay.data.items.every((item) => item.occurredAt < "2026-11-16T00:00:00Z" ||
      item.occurredAt >= "2026-11-17T00:00:00Z");
  check(
    "liste filtrée par date (bornes incluses, UTC+3)",
    all.status === 200 &&
      all.data.total >= 2 &&
      onlyNextDay &&
      excludesNextDay,
    `total=${all.data.total}, du jour=${sameDay.data.items?.length ?? 0}, autre jour=${otherDay.data.items?.length ?? 0}`,
  );
  const badFilter = await call("GET", "/api/multiplier-history?du=15-11-2026", {
    cookie: demoCookie,
  });
  check("filtre invalide rejeté (400)", badFilter.status === 400, `HTTP ${badFilter.status}`);
}

async function countRows(userId) {
  const { rows: found } = await pool.query(
    "select count(*)::int as count from public.multiplier_history_entity where created_by = $1",
    [userId],
  );
  return found[0].count;
}

main()
  .catch(async (error) => {
    check("exécution des tests", false, error.message);
  })
  .finally(async () => {
    await restoreAll();
    await cleanup();
    const failed = RESULTS.filter((item) => !item.passed);
    console.log(
      `\n${RESULTS.length - failed.length}/${RESULTS.length} vérifications réussies`,
    );
    await pool.end();
    process.exit(failed.length === 0 ? 0 : 1);
  });
