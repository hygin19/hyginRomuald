"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandName, Logo } from "@/components/brand/Logo";
import { ADMIN_ITEM, NAV_ITEMS, isActive } from "@/components/shell/nav-items";

export function SideNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? "/dashboard";
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-ink-950/80 px-4 py-6 backdrop-blur lg:flex">
      <Link href="/dashboard" className="flex items-center gap-3 px-2">
        <Logo />
        <BrandName />
      </Link>

      <ul className="mt-9 space-y-1.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "border border-flame-500/30 bg-flame-500/10 text-white"
                    : "border border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white/85",
                )}
              >
                <Icon
                  className={clsx("h-[18px] w-[18px]", active && "text-flame-400")}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto rounded-xl border border-gold/20 bg-gold/[0.06] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
          Mode démo
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
          Argent fictif, aucune transaction réelle. Les API HONORE ne sont pas
          activées.
        </p>
      </div>
    </aside>
  );
}
