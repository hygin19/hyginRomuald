import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/auth";
import { getAdapterStatus } from "@/lib/server/honore/adapter";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const status = getAdapterStatus();
  const payload =
    session.profile.role === "admin"
      ? status
      : {
          configured: status.configured,
          liveBettingEnabled: status.liveBettingEnabled,
          mode: status.mode,
          notice: status.notice,
          endpoints: [] as typeof status.endpoints,
        };

  return NextResponse.json(payload);
}
