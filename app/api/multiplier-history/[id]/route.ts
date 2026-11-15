import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/server/auth";
import {
  deleteMultiplierHistory,
  updateMultiplierHistory,
} from "@/lib/server/multiplier-history";
import {
  readJson,
  respondError,
  respondSave,
} from "@/lib/server/multiplier-history-http";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Modification : les deux bases sont réécrites avec le même `id`. */
export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;
  const body = await readJson(request);
  try {
    const result = await updateMultiplierHistory(user.id, id, {
      multiplier: body.multiplier,
      occurredAt: body.occurred_at,
    });
    revalidatePath("/historique");
    return respondSave(result, 200);
  } catch (error) {
    return respondError(error);
  }
}

/** Suppression confirmée côté interface : les deux bases, même `id`. */
export async function DELETE(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteMultiplierHistory(user.id, id);
    revalidatePath("/historique");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respondError(error);
  }
}
