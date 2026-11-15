import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/server/auth";
import {
  listMultiplierHistory,
  saveMultiplierHistory,
} from "@/lib/server/multiplier-history";
import {
  readJson,
  respondError,
  respondSave,
} from "@/lib/server/multiplier-history-http";

export const dynamic = "force-dynamic";

/** Liste paginée et filtrable de l'historique manuel de l'utilisateur. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const search = new URL(request.url).searchParams;
  try {
    const page = await listMultiplierHistory(user.id, {
      from: search.get("du") ?? undefined,
      to: search.get("au") ?? undefined,
      page: Number(search.get("page") ?? 1) || 1,
      pageSize: Number(search.get("pageSize") ?? 10) || 10,
    });
    return NextResponse.json({ ok: true, ...page });
  } catch (error) {
    return respondError(error);
  }
}

/** `saveMultiplierHistory` : saisie manuelle → Supabase puis base applicative. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const body = await readJson(request);
  try {
    const result = await saveMultiplierHistory(user.id, {
      multiplier: body.multiplier,
      occurredAt: body.occurred_at,
    });
    revalidatePath("/historique");
    return respondSave(result);
  } catch (error) {
    return respondError(error);
  }
}
