import { randomUUID } from "node:crypto";
import { query, queryOne } from "@/lib/server/db";
import {
  supabaseDeleteMultiplierHistory,
  supabaseGetMultiplierHistory,
  supabaseRestConfig,
  supabaseUpsertMultiplierHistory,
} from "@/lib/server/supabase-rest";
import type { MultiplierHistoryItem, MultiplierHistoryPage, SyncStatus } from "@/lib/types";

/**
 * Historique manuel des multiplicateurs — module indépendant.
 *
 * Aucune capture automatique : les manches du simulateur ne sont jamais
 * poussées ici, et aucune règle d'analyse existante n'est utilisée ou modifiée.
 *
 * Chaque enregistrement est écrit dans DEUX bases avec le MÊME UUID :
 *  - `public.multiplier_history` : table Supabase PostgreSQL (PostgREST quand
 *    une URL hébergée + `SUPABASE_SECRET_KEY` sont configurées, sinon accès
 *    direct à la base Supabase du sandbox) ;
 *  - `public.multiplier_history_entity` : copie applicative (équivalent de
 *    l'entité MultiplierHistory côté base de l'application).
 *
 * `sync_status` ne passe à « synced » qu'après confirmation des deux écritures.
 */

export const HISTORY_TABLE_SUPABASE = "public.multiplier_history";
export const HISTORY_TABLE_ENTITY = "public.multiplier_history_entity";
/** Africa/Antananarivo = UTC+3 toute l'année (aucun changement d'heure). */
export const HISTORY_TZ_OFFSET = "+03:00";
export const HISTORY_TZ_LABEL = "Africa/Antananarivo (UTC+3)";
const MAX_MULTIPLIER = 100_000;
const DEFAULT_PAGE_SIZE = 10;

export class MultiplierHistoryError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MultiplierHistoryError";
    this.status = status;
  }
}

type HistoryRow = {
  id: string;
  multiplier: string | number;
  occurred_at: Date | string;
  created_at: Date | string;
  created_by: string;
  source: "manual";
  sync_status: SyncStatus;
};

type HistoryRecord = {
  id: string;
  multiplier: number;
  occurredAt: string;
  createdBy: string;
  source: "manual";
  syncStatus: SyncStatus;
};

export type SaveHistoryResult = {
  record: MultiplierHistoryItem;
  synced: boolean;
  warning?: string;
};

function toItem(row: HistoryRow): MultiplierHistoryItem {
  return {
    id: row.id,
    multiplier: Number(row.multiplier),
    occurredAt: new Date(row.occurred_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    createdBy: row.created_by,
    source: row.source,
    syncStatus: row.sync_status,
  };
}

/* ------------------------------------------------------------------ */
/* Validation (saisie manuelle)                                        */
/* ------------------------------------------------------------------ */

/** Multiplicateur : nombre décimal strictement positif. */
export function parseMultiplier(value: unknown): number {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) {
    throw new MultiplierHistoryError("Le multiplicateur est obligatoire.");
  }
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new MultiplierHistoryError(
      "Multiplicateur invalide : utilisez un nombre décimal positif (ex. 2.35).",
    );
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new MultiplierHistoryError("Le multiplicateur doit être supérieur à 0.");
  }
  if (parsed > MAX_MULTIPLIER) {
    throw new MultiplierHistoryError(
      `Le multiplicateur est trop élevé (maximum ${MAX_MULTIPLIER}).`,
    );
  }
  return Math.round(parsed * 10_000) / 10_000;
}

/**
 * Date/heure de saisie : `datetime-local` (avec ou sans secondes) interprété
 * en Africa/Antananarivo, ou instant ISO complet.
 */
export function parseOccurredAt(value: unknown): Date {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new MultiplierHistoryError("La date et l'heure sont obligatoires.");
  }

  const wallClock = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  const iso = wallClock
    ? `${raw.replace(" ", "T").slice(0, 19)}${wallClock[6] ? "" : ":00"}${HISTORY_TZ_OFFSET}`
    : raw;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new MultiplierHistoryError("Date ou heure invalide.");
  }
  const year = date.getUTCFullYear();
  if (year < 2000 || year > 2100) {
    throw new MultiplierHistoryError("Date hors limites (2000 – 2100).");
  }
  return date;
}

/** Borne `YYYY-MM-DD` (heure d'Antananarivo) → instant ISO. */
function dayStart(date: string, addDays = 0): string | null {
  const match = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const base = new Date(`${date}T00:00:00${HISTORY_TZ_OFFSET}`);
  if (Number.isNaN(base.getTime())) return null;
  if (addDays) base.setUTCDate(base.getUTCDate() + addDays);
  const wall = new Date(base.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
  return `${wall}T00:00:00${HISTORY_TZ_OFFSET}`;
}

/* ------------------------------------------------------------------ */
/* Écritures                                                            */
/* ------------------------------------------------------------------ */

const LOCAL_COLUMNS = `(id, multiplier, occurred_at, created_by, source, sync_status)`;

async function upsertLocal(table: string, record: HistoryRecord) {
  const row = await queryOne<HistoryRow>(
    `insert into ${table} ${LOCAL_COLUMNS}
     values ($1, $2, $3, $4, $5, $6)
     on conflict (id) do update
       set multiplier = excluded.multiplier,
           occurred_at = excluded.occurred_at,
           sync_status = excluded.sync_status,
           updated_at = now()
     returning *`,
    [
      record.id,
      record.multiplier,
      record.occurredAt,
      record.createdBy,
      record.source,
      record.syncStatus,
    ],
  );
  if (!row) throw new Error(`upsert ${table} sans résultat`);
  return toItem(row);
}

async function deleteLocal(table: string, id: string, ownerId: string) {
  await query(`delete from ${table} where id = $1 and created_by = $2`, [id, ownerId]);
}

/** Table Supabase : PostgREST si configuré, sinon base Supabase locale. */
async function upsertSupabase(record: HistoryRecord) {
  const config = supabaseRestConfig();
  if (config) {
    await supabaseUpsertMultiplierHistory(config, record);
    return;
  }
  await upsertLocal(HISTORY_TABLE_SUPABASE, record);
}

async function deleteSupabase(id: string, ownerId: string) {
  const config = supabaseRestConfig();
  if (config) {
    await supabaseDeleteMultiplierHistory(config, id, ownerId);
    return;
  }
  await deleteLocal(HISTORY_TABLE_SUPABASE, id, ownerId);
}

/* ------------------------------------------------------------------ */
/* Synchronisation des deux bases                                       */
/* ------------------------------------------------------------------ */

/**
 * Écrit l'entrée dans les deux bases, dans l'ordre demandé :
 * Supabase d'abord, puis la base applicative, avec le même `id`.
 * Une base en échec ne produit jamais de faux succès.
 */
async function persistBoth(record: HistoryRecord): Promise<SaveHistoryResult> {
  const pending: HistoryRecord = { ...record, syncStatus: "pending" };
  const synced: HistoryRecord = { ...record, syncStatus: "synced" };

  try {
    await upsertSupabase(pending);
  } catch (error) {
    console.error("[multiplier-history] Supabase indisponible :", (error as Error).message);
    try {
      const kept = await upsertLocal(HISTORY_TABLE_ENTITY, pending);
      return {
        record: kept,
        synced: false,
        warning:
          "Supabase est indisponible : l'entrée est conservée localement et reste « en attente ». Relancez la synchronisation.",
      };
    } catch (localError) {
      console.error(
        "[multiplier-history] base applicative indisponible :",
        (localError as Error).message,
      );
      throw new MultiplierHistoryError(
        "Enregistrement impossible : Supabase et la base applicative sont indisponibles.",
        503,
      );
    }
  }

  let recordPending: MultiplierHistoryItem;
  try {
    recordPending = await upsertLocal(HISTORY_TABLE_ENTITY, pending);
  } catch (error) {
    console.error(
      "[multiplier-history] base applicative indisponible :",
      (error as Error).message,
    );
    throw new MultiplierHistoryError(
      "Supabase a accepté l'entrée mais la base applicative est indisponible : relancez la synchronisation.",
      503,
    );
  }

  try {
    await upsertSupabase(synced);
    const recordSynced = await upsertLocal(HISTORY_TABLE_ENTITY, synced);
    return { record: recordSynced, synced: true };
  } catch (error) {
    console.error(
      "[multiplier-history] confirmation de synchronisation échouée :",
      (error as Error).message,
    );
    return {
      record: recordPending,
      synced: false,
      warning:
        "Les deux bases contiennent l'entrée mais la confirmation de synchronisation a échoué. Relancez la synchronisation.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Lecture                                                              */
/* ------------------------------------------------------------------ */

/**
 * Retrouve une entrée, y compris quand seule la copie Supabase existe encore
 * (écriture applicative en échec) : sans cela la reprise serait impossible.
 */
export async function getMultiplierHistoryItem(
  id: string,
  userId: string,
): Promise<MultiplierHistoryItem | null> {
  const row = await queryOne<HistoryRow>(
    `select * from ${HISTORY_TABLE_ENTITY} where id = $1 and created_by = $2 limit 1`,
    [id, userId],
  );
  if (row) return toItem(row);

  const config = supabaseRestConfig();
  if (config) {
    const remote = await supabaseGetMultiplierHistory(config, id, userId);
    if (!remote) return null;
    return {
      id: remote.id,
      multiplier: remote.multiplier,
      occurredAt: remote.occurredAt,
      createdAt: remote.occurredAt,
      createdBy: remote.createdBy,
      source: remote.source,
      syncStatus: remote.syncStatus,
    };
  }

  const remoteRow = await queryOne<HistoryRow>(
    `select * from ${HISTORY_TABLE_SUPABASE} where id = $1 and created_by = $2 limit 1`,
    [id, userId],
  );
  return remoteRow ? toItem(remoteRow) : null;
}

export type ListHistoryOptions = {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function listMultiplierHistory(
  userId: string,
  options: ListHistoryOptions = {},
): Promise<MultiplierHistoryPage> {
  const pageSize = Math.min(50, Math.max(1, Math.round(options.pageSize ?? DEFAULT_PAGE_SIZE)));
  const page = Math.max(1, Math.round(options.page ?? 1));

  const conditions = ["created_by = $1"];
  const params: unknown[] = [userId];

  if (options.from) {
    const bound = dayStart(options.from);
    if (!bound) throw new MultiplierHistoryError("Date de début invalide.");
    params.push(bound);
    conditions.push(`occurred_at >= $${params.length}`);
  }
  if (options.to) {
    const bound = dayStart(options.to, 1);
    if (!bound) throw new MultiplierHistoryError("Date de fin invalide.");
    params.push(bound);
    conditions.push(`occurred_at < $${params.length}`);
  }

  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;
  const rows = await query<HistoryRow & { total: string | number }>(
    `select *, count(*) over() as total
       from ${HISTORY_TABLE_ENTITY}
      where ${conditions.join(" and ")}
      order by occurred_at desc, created_at desc
      limit $${limitParam} offset $${offsetParam}`,
    [...params, pageSize, (page - 1) * pageSize],
  );

  const total = rows.length > 0 ? Number(rows[0].total) : 0;
  return {
    items: rows.map(toItem),
    page,
    pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/* ------------------------------------------------------------------ */
/* Backend (saveMultiplierHistory et actions associées)                 */
/* ------------------------------------------------------------------ */

export async function saveMultiplierHistory(
  userId: string,
  input: { multiplier?: unknown; occurredAt?: unknown },
): Promise<SaveHistoryResult> {
  const multiplier = parseMultiplier(input.multiplier);
  const occurredAt = parseOccurredAt(input.occurredAt);

  return persistBoth({
    id: randomUUID(),
    multiplier,
    occurredAt: occurredAt.toISOString(),
    createdBy: userId,
    source: "manual",
    syncStatus: "pending",
  });
}

export async function updateMultiplierHistory(
  userId: string,
  id: string,
  input: { multiplier?: unknown; occurredAt?: unknown },
): Promise<SaveHistoryResult> {
  const existing = await getMultiplierHistoryItem(id, userId);
  if (!existing) throw new MultiplierHistoryError("Entrée introuvable.", 404);

  const multiplier = parseMultiplier(input.multiplier);
  const occurredAt = parseOccurredAt(input.occurredAt);

  return persistBoth({
    id: existing.id,
    multiplier,
    occurredAt: occurredAt.toISOString(),
    createdBy: userId,
    source: "manual",
    syncStatus: "pending",
  });
}

export async function retryMultiplierHistorySync(
  userId: string,
  id: string,
): Promise<SaveHistoryResult> {
  const existing = await getMultiplierHistoryItem(id, userId);
  if (!existing) throw new MultiplierHistoryError("Entrée introuvable.", 404);

  // Upserts idempotents sur le même `id` : aucun doublon en cas de rejeu.
  return persistBoth({
    id: existing.id,
    multiplier: existing.multiplier,
    occurredAt: existing.occurredAt,
    createdBy: userId,
    source: "manual",
    syncStatus: "pending",
  });
}

export async function deleteMultiplierHistory(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await getMultiplierHistoryItem(id, userId);
  if (!existing) throw new MultiplierHistoryError("Entrée introuvable.", 404);

  try {
    await deleteSupabase(id, userId);
  } catch (error) {
    console.error("[multiplier-history] suppression Supabase :", (error as Error).message);
    throw new MultiplierHistoryError(
      "Supabase n'a pas confirmé la suppression : aucune entrée n'a été effacée. Réessayez.",
      503,
    );
  }

  await deleteLocal(HISTORY_TABLE_ENTITY, id, userId);
}
