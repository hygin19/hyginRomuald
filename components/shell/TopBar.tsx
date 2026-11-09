import Link from "next/link";
import { BrandName, Logo } from "@/components/brand/Logo";
import { DemoBadge } from "@/components/ui/Badges";
import { formatMga } from "@/lib/format";
import type { Profile } from "@/lib/types";

function initials(username: string): string {
  const parts = username.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

export function TopBar({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2.5 lg:hidden">
          <Logo size="sm" />
          <BrandName compact />
        </Link>

        <div className="hidden lg:block">
          <p className="label">Espace joueur</p>
          <p className="mt-0.5 font-display text-sm font-semibold text-white">
            Bonjour, {profile.username}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <DemoBadge className="hidden sm:inline-flex" />
          <Link
            href="/profil"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 transition hover:bg-white/[0.08]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-flame-500 to-flame-700 text-[11px] font-bold text-white">
              {initials(profile.username)}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Solde
              </span>
              <span className="display-num text-[13px] text-gold">
                {formatMga(profile.balanceMga)}
              </span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
