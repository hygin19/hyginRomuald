import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/server/db";
import type { Profile } from "@/lib/types";

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase Auth n'est pas configuré (SUPABASE_URL / SUPABASE_ANON_KEY).",
    );
  }
  return { url, key: anonKey };
}

export async function createSupabaseServerClient() {
  const { url, key } = supabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        try {
          for (const { name, value, options } of items) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Lecture seule (composant serveur) : la session est rafraîchie
          // par la route d'authentification suivante.
        }
      },
    },
  });
}

type ProfileRow = {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
  balance_mga: string | number;
  created_at: Date;
};

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    balanceMga: Number(row.balance_mga),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function usernameFromEmail(email: string): string {
  const base = email.split("@")[0] ?? "joueur";
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24);
  return clean.length >= 3 ? clean : `joueur-${Math.random().toString(36).slice(2, 7)}`;
}

/** Crée le profil applicatif au premier accès si le trigger Supabase n'existe pas. */
export async function ensureProfile(user: User): Promise<Profile> {
  const email = user.email ?? `${user.id}@honore.local`;
  const metadataName =
    typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username.trim()
      : "";

  const row = await queryOne<ProfileRow>(
    `insert into public.profiles (id, email, username)
     values ($1, $2, $3)
     on conflict (id) do update set email = excluded.email
     returning *`,
    [user.id, email, metadataName || usernameFromEmail(email)],
  );

  return toProfile(row!);
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export type SessionContext = { user: User; profile: Profile };

export async function getSessionContext(): Promise<SessionContext | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const profile = await ensureProfile(user);
  return { user, profile };
}

export async function requireUser(): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!session) redirect("/connexion");
  return session;
}

export async function requireAdmin(): Promise<SessionContext> {
  const session = await requireUser();
  if (session.profile.role !== "admin") redirect("/dashboard");
  return session;
}

export async function getProfileRow(userId: string) {
  return query<ProfileRow>(`select * from public.profiles where id = $1 limit 1`, [userId]);
}
