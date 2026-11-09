import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  ensureProfile,
  getSessionUser,
} from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Renseignez votre email et votre mot de passe." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 },
      );
    }

    const profile = await ensureProfile(data.user);
    return NextResponse.json({ ok: true, role: profile.role });
  } catch {
    return NextResponse.json(
      { error: "Service d'authentification indisponible. Réessayez." },
      { status: 503 },
    );
  }
}

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ authenticated: Boolean(user) });
}
