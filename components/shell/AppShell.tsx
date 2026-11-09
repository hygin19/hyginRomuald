import type { ReactNode } from "react";
import { BottomNav } from "@/components/shell/BottomNav";
import { SideNav } from "@/components/shell/SideNav";
import { TopBar } from "@/components/shell/TopBar";
import type { Profile } from "@/lib/types";

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const isAdmin = profile.role === "admin";

  return (
    <div className="min-h-dvh">
      <SideNav isAdmin={isAdmin} />
      <div className="lg:pl-64">
        <TopBar profile={profile} />
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
