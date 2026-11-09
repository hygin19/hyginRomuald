import type { Metadata } from "next";
import { LiveAviator } from "@/components/game/LiveAviator";
import { requireUser } from "@/lib/server/auth";
import { getGameState } from "@/lib/server/game";

export const metadata: Metadata = { title: "Arène — jeu en direct" };
export const dynamic = "force-dynamic";

export default async function JeuPage() {
  const { profile } = await requireUser();
  const state = await getGameState(profile.id);

  return (
    <div className="animate-rise space-y-4">
      <header>
        <p className="label">Arène · démonstration</p>
        <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
          Manche en direct
        </h1>
        <p className="mt-1 text-xs text-white/40">
          Mises ouvertes 9 s avant le décollage. Encaissez avant le crash pour
          conserver votre gain fictif.
        </p>
      </header>

      <LiveAviator initialState={state} />
    </div>
  );
}
