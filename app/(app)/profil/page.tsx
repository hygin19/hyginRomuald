import type { Metadata } from "next";
import { Mail, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { RecentBets } from "@/components/bets/RecentBets";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { RoleBadge } from "@/components/ui/Badges";
import { StatCard } from "@/components/ui/StatCard";
import { formatMga, formatMultiplier } from "@/lib/format";
import { requireUser } from "@/lib/server/auth";
import { getRecentBets, getUserStats } from "@/lib/server/stats";

export const metadata: Metadata = { title: "Mon profil" };
export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const { profile } = await requireUser();
  const [userStats, recentBets] = await Promise.all([
    getUserStats(profile.id),
    getRecentBets(profile.id, 12),
  ]);

  const memberSince = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(profile.createdAt));

  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <div className="animate-rise space-y-4">
      <header>
        <p className="label">Mon profil</p>
        <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
          Compte de démonstration
        </h1>
      </header>

      <section className="surface relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-flame-500/20 blur-3xl" />
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-flame-500 to-flame-700 font-display text-xl font-extrabold text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-bold text-white">
                {profile.username}
              </p>
              <RoleBadge role={profile.role} />
            </div>
            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-white/40">
              <Mail className="h-3.5 w-3.5" />
              {profile.email}
            </p>
            <p className="mt-0.5 text-[10px] text-white/25">
              Membre depuis le {memberSince}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-gold/20 bg-gold/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-gold" />
            <div>
              <p className="label text-gold/80">Solde démo</p>
              <p className="display-num text-lg text-gold">
                {formatMga(profile.balanceMga)}
              </p>
            </div>
          </div>
          <span className="chip border-gold/30 bg-gold/10 text-[9px] uppercase tracking-[0.18em] text-gold">
            MGA fictif
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link href="/jeu" className="btn-primary py-2.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Jouer une manche
          </Link>
          {profile.role === "admin" ? (
            <Link href="/admin" className="btn-ghost py-2.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              Espace administrateur
            </Link>
          ) : (
            <Link href="/prediction" className="btn-ghost py-2.5 text-xs">
              Centre de prédiction
            </Link>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Mises" value={userStats.totalBets} hint="Total joué" />
        <StatCard
          label="Encaissements"
          value={userStats.wonBets}
          hint={`${userStats.winRate} % de réussite`}
          tone="mint"
        />
        <StatCard
          label="Résultat net"
          value={formatMga(userStats.netResult)}
          tone={userStats.netResult >= 0 ? "mint" : "flame"}
          hint="Encaissé − misé"
        />
        <StatCard
          label="Meilleur vol"
          value={formatMultiplier(userStats.bestMultiplier)}
          tone="gold"
          hint="Plus haut encaissement"
        />
      </section>

      <section className="surface p-4">
        <h2 className="font-display text-sm font-bold text-white">
          Historique de mes mises
        </h2>
        <div className="mt-1">
          <RecentBets items={recentBets} />
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="font-display text-sm font-bold text-white">Session</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-white/40">
          Authentification gérée par Supabase Auth. La déconnexion efface le cookie
          de session côté serveur.
        </p>
        <div className="mt-3">
          <LogoutButton />
        </div>
      </section>
    </div>
  );
}
