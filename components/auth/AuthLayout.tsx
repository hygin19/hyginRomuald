import Link from "next/link";
import type { ReactNode } from "react";
import { BrandName, Logo } from "@/components/brand/Logo";
import { DemoBadge } from "@/components/ui/Badges";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size="sm" />
          <BrandName compact />
        </Link>
        <DemoBadge />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        <div className="animate-rise">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/45">{subtitle}</p>

          <div className="surface mt-6 p-5">{children}</div>

          <div className="mt-5 text-center text-xs text-white/40">{footer}</div>
        </div>
      </main>

      <footer className="px-5 pb-6 text-center text-[10px] leading-relaxed text-white/25">
        HONORE AVIATOR · Démonstration · Argent fictif (MGA) — les paris réels
        restent désactivés jusqu'à autorisation officielle.
      </footer>
    </div>
  );
}
