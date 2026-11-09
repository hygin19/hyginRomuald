import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/server/auth";
import { buildSuggestion, savePrediction } from "@/lib/server/predict";

export const dynamic = "force-dynamic";

/** Enregistre la prédiction courante. L'heuristique est calculée côté serveur. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const suggestion = await buildSuggestion();
    await savePrediction(user.id, suggestion);
    revalidatePath("/prediction");
    return NextResponse.json({ ok: true, suggestion });
  } catch (error) {
    console.error("[predictions]", (error as Error).message);
    return NextResponse.json(
      { error: "Enregistrement impossible." },
      { status: 500 },
    );
  }
}
