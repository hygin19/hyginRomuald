import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/server/auth";
import { retryMultiplierHistorySync } from "@/lib/server/multiplier-history";
import { respondError, respondSave } from "@/lib/server/multiplier-history-http";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Relance la synchronisation d'une entrée restée « en attente ». */
export async function POST(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await retryMultiplierHistorySync(user.id, id);
    revalidatePath("/historique");
    return respondSave(result, 200);
  } catch (error) {
    return respondError(error);
  }
}
