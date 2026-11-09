import { NextResponse } from "next/server";
import { createSupabaseServerClient, ensureProfile } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string; username?: string }
    | null;

  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const username = String(body?.username ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 },
    );
  }
  if (username.length < 3 || username.length > 24) {
    return NextResponse.json(
      { error: "Le pseudo doit contenir entre 3 et 24 caractères." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error) {
      const alreadyExists = /already|exists|registered/i.test(error.message);
      return NextResponse.json(
        {
          error: alreadyExists
            ? "Un compte existe déjà avec cet email."
            : "Création du compte impossible. Réessayez.",
        },
        { status: alreadyExists ? 409 : 400 },
      );
    }

    if (!data.session || !data.user) {
      return NextResponse.json({
        ok: true,
        requiresConfirmation: true,
        message:
          "Compte créé. Confirmez votre email pour activer votre accès démo.",
      });
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
