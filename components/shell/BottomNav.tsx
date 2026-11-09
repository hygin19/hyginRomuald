"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_ITEM, NAV_ITEMS, isActive } from "@/components/shell/nav-items";

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? "/dashboard";
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/95 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1 backdrop-blur lg:hidden">
      <ul
        className={clsx(
          "mx-auto flex max-w-lg items-stretch justify-between px-2",
          isAdmin ? "gap-0.5" : "gap-1",
        )}
      >
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx("nav-link", active && "nav-link-active")}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
