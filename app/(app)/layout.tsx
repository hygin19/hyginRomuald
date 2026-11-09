import { AppShell } from "@/components/shell/AppShell";
import { requireUser } from "@/lib/server/auth";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireUser();
  return <AppShell profile={profile}>{children}</AppShell>;
}
