import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { GameError, cashOut } from "@/lib/server/game";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const result = await cashOut(user.id);
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
    console.error("[game/cashout]", (error as Error).message);
    return NextResponse.json({ error: "Encaissement impossible." }, { status: 500 });
  }
}
