/**
 * Accès serveur à l'API Supabase (PostgREST) de la table `multiplier_history`.
 *
 * Règles de sécurité :
 *  - ce module ne doit jamais être importé par un composant client ;
 *  - la clé secrète (`SUPABASE_SECRET_KEY`, format `sb_secret_...`) reste côté
 *    serveur : elle n'est ni renvoyée au navigateur, ni journalisée ;
 *  - les appels sont bornés en taille et en durée.
 *
 * Repli local : dans le bac à sable, l'application parle directement à la base
 * PostgreSQL Supabase via `DATABASE_URL` (aucune clé secrète n'est disponible).
 * L'écriture se fait alors sur la même table `public.multiplier_history`.
 * Dès qu'une URL Supabase hébergée (https) et une clé secrète sont fournies,
 * la synchronisation passe par PostgREST.
 */

const REQUEST_TIMEOUT_MS = 8_000;
const TABLE = "multiplier_history";

export type SupabaseRestConfig = { url: string; key: string };

export type SupabaseHistoryRow = {
  id: string;
  multiplier: number;
  occurredAt: string;
  createdBy: string;
  source: "manual";
  syncStatus: "pending" | "synced";
};

/** Configuration PostgREST, ou `null` quand l'écriture locale doit être utilisée. */
export function supabaseRestConfig(): SupabaseRestConfig | null {
  if (typeof window !== "undefined") {
    throw new Error("La clé secrète Supabase est strictement réservée au serveur.");
  }
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  // Un projet Supabase hébergé est toujours en https ; l'URL locale (http) ne
  // sert qu'à l'authentification GoTrue de ce sandbox.
  if (!url || !key || !url.startsWith("https://")) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function headers(config: SupabaseRestConfig, extra: Record<string, string> = {}) {
  return {
    apikey: config.key,
    authorization: `Bearer ${config.key}`,
    "content-type": "application/json",
    ...extra,
  };
}

function toRow(row: SupabaseHistoryRow) {
  return {
    id: row.id,
    multiplier: row.multiplier,
    occurred_at: row.occurredAt,
    created_by: row.createdBy,
    source: row.source,
    sync_status: row.syncStatus,
    updated_at: new Date().toISOString(),
  };
}

async function request(
  config: SupabaseRestConfig,
  path: string,
  init: RequestInit,
): Promise<void> {
  const response = await fetch(`${config.url}/rest/v1${path}`, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new Error(`Supabase ${response.status}: ${detail || "échec"}`);
  }
}

/** Upsert idempotent basé sur `id` (aucun doublon en cas de rejeu). */
export async function supabaseUpsertMultiplierHistory(
  config: SupabaseRestConfig,
  row: SupabaseHistoryRow,
): Promise<void> {
  await request(config, `/${TABLE}?on_conflict=id`, {
    method: "POST",
    headers: headers(config, {
      prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify(toRow(row)),
  });
}

export async function supabaseDeleteMultiplierHistory(
  config: SupabaseRestConfig,
  id: string,
  ownerId: string,
): Promise<void> {
  await request(
    config,
    `/${TABLE}?id=eq.${encodeURIComponent(id)}&created_by=eq.${encodeURIComponent(ownerId)}`,
    { method: "DELETE", headers: headers(config, { prefer: "return=minimal" }) },
  );
}

/** Relit une entrée encore absente de la base applicative. */
export async function supabaseGetMultiplierHistory(
  config: SupabaseRestConfig,
  id: string,
  ownerId: string,
): Promise<SupabaseHistoryRow | null> {
  const response = await fetch(
    `${config.url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&created_by=eq.${encodeURIComponent(ownerId)}&limit=1`,
    {
      headers: headers(config),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: lecture impossible`);
  }
  const rows = (await response.json()) as Array<{
    id: string;
    multiplier: string | number;
    occurred_at: string;
    created_by: string;
    source: "manual";
    sync_status: "pending" | "synced";
  }>;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    multiplier: Number(row.multiplier),
    occurredAt: new Date(row.occurred_at).toISOString(),
    createdBy: row.created_by,
    source: row.source,
    syncStatus: row.sync_status,
  };
}
