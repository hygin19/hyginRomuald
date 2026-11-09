import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // La session locale est effacée même si le service est indisponible.
  }
  return NextResponse.json({ ok: true });
}
