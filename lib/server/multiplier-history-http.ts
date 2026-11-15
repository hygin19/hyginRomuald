import { NextResponse } from "next/server";
import {
  MultiplierHistoryError,
  type SaveHistoryResult,
} from "@/lib/server/multiplier-history";

/** 201/200 quand les deux bases confirment, 207 quand la synchro reste en attente. */
export function respondSave(result: SaveHistoryResult, successStatus = 201) {
  return NextResponse.json(
    {
      ok: result.synced,
      synced: result.synced,
      warning: result.warning,
      record: result.record,
    },
    { status: result.synced ? successStatus : 207 },
  );
}

export function respondError(error: unknown) {
  if (error instanceof MultiplierHistoryError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  console.error("[multiplier-history]", (error as Error).message);
  return NextResponse.json(
    { ok: false, error: "Enregistrement impossible pour le moment." },
    { status: 500 },
  );
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  return (body ?? {}) as Record<string, unknown>;
}
