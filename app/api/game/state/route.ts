import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { getGameState } from "@/lib/server/game";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const state = await getGameState(user.id);
    return NextResponse.json(state, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("[game/state]", (error as Error).message);
    return NextResponse.json(
      { error: "Moteur de démonstration indisponible." },
      { status: 503 },
    );
  }
}
