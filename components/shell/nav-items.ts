import {
  BarChart3,
  LayoutDashboard,
  Plane,
  Radar,
  ShieldCheck,
  User,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Plane;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/prediction", label: "Prédictions", icon: Radar },
  { href: "/jeu", label: "Jouer", icon: Plane },
  { href: "/statistiques", label: "Stats", icon: BarChart3 },
  { href: "/profil", label: "Profil", icon: User },
];

export const ADMIN_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: ShieldCheck,
};

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
