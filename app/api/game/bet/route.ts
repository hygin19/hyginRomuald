import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { GameError, placeBet } from "@/lib/server/game";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { amount?: number | string }
    | null;
  const amount = Number(body?.amount);

  if (!Number.isFinite(amount)) {
    return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  }

  try {
    const result = await placeBet(user.id, amount);
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 409 },
      );
    }
    console.error("[game/bet]", (error as Error).message);
    return NextResponse.json({ error: "Mise impossible." }, { status: 500 });
  }
}
