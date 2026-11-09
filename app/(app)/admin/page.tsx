import type { Metadata } from "next";
import { Activity, Coins, Database, Lock, ShieldCheck, Users } from "lucide-react";
import { RoleBadge } from "@/components/ui/Badges";
import { StatCard } from "@/components/ui/StatCard";
import { formatDateTime, formatMga, formatMultiplier } from "@/lib/format";
import { getAdminOverview } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const overview = await getAdminOverview();
  const margin = overview.wagered - overview.paidOut;

  return (
    <div className="animate-rise space-y-4">
      <header>
        <p className="label">Administration</p>
        <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
          Pilotage de la démonstration
        </h1>
        <p className="mt-1 text-xs text-white/40">
          Comptes, volumes de mises et état de l'intégration HONORE. Données de
          démonstration uniquement.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Comptes"
          value={overview.users}
          hint={`${overview.admins} administrateur(s)`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Manches"
          value={overview.rounds}
          hint="Générées par le simulateur"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Volume misé"
          value={formatMga(overview.wagered)}
          hint={`${overview.bets} mises`}
          icon={<Coins className="h-4 w-4" />}
        />
        <StatCard
          label="Marge fictive"
          value={formatMga(margin)}
          hint={`Encaissé ${formatMga(overview.paidOut)}`}
          tone={margin >= 0 ? "mint" : "flame"}
        />
      </section>

      <section className="surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-flame-500/25 bg-flame-500/10 text-flame-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-sm font-bold text-white">
                Adaptateur HONORE Gaming
              </h2>
              <p className="text-[10px] text-white/35">
                Appels signés côté serveur · liste blanche d'endpoints
              </p>
            </div>
          </div>
          <span
            className={`chip ${
              overview.adapter.liveBettingEnabled
                ? "border-mint/40 bg-mint/10 text-mint"
                : "border-flame-500/40 bg-flame-500/10 text-flame-300"
            }`}
          >
            <Lock className="h-3 w-3" />
            {overview.adapter.liveBettingEnabled ? "Paris réels actifs" : "Pari réel verrouillé"}
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            {
              label: "Identifiants",
              value: overview.adapter.configured ? "Configurés" : "Absents",
            },
            {
              label: "Documentation",
              value: overview.adapter.documentationVerified ? "Vérifiée" : "Non fournie",
            },
            { label: "Mode", value: "DÉMO" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                {item.label}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-white/80">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                <th className="py-2 font-medium">Endpoint</th>
                <th className="py-2 font-medium">Méthode</th>
                <th className="py-2 font-medium">Chemin</th>
                <th className="py-2 text-right font-medium">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {overview.adapter.endpoints.map((endpoint) => (
                <tr key={endpoint.name}>
                  <td className="py-2 font-mono text-[11px] text-white/65">
                    {endpoint.name}
                  </td>
                  <td className="py-2 text-white/40">{endpoint.method}</td>
                  <td className="py-2 font-mono text-[11px] text-white/40">
                    {endpoint.path}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={`chip ${
                        endpoint.verified
                          ? "border-mint/30 bg-mint/10 text-mint"
                          : "border-white/10 bg-white/5 text-white/35"
                      }`}
                    >
                      {endpoint.verified ? "vérifié" : "à confirmer"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 rounded-lg border border-gold/20 bg-gold/[0.05] px-3 py-2 text-[11px] leading-relaxed text-gold/90">
          {overview.adapter.notice}
        </p>
      </section>

      <section className="surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-white">Comptes</h2>
          <span className="text-[11px] text-white/30">
            {overview.userRows.length} affichés
          </span>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                <th className="py-2 font-medium">Joueur</th>
                <th className="py-2 font-medium">Rôle</th>
                <th className="py-2 text-right font-medium">Solde</th>
                <th className="py-2 text-right font-medium">Mises</th>
                <th className="py-2 text-right font-medium">Inscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {overview.userRows.map((user) => (
                <tr key={user.id}>
                  <td className="py-2.5">
                    <p className="font-semibold text-white/75">{user.username}</p>
                    <p className="text-[10px] text-white/30">{user.email}</p>
                  </td>
                  <td className="py-2.5">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-gold">
                    {formatMga(user.balanceMga)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-white/50">
                    {user.bets}
                  </td>
                  <td className="py-2.5 text-right text-[10px] text-white/30">
                    {formatDateTime(user.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="surface p-4">
          <h2 className="font-display text-sm font-bold text-white">
            Manches récentes
          </h2>
          <ul className="mt-2 divide-y divide-white/[0.05]">
            {overview.recentRounds.map((round) => (
              <li key={round.no} className="flex items-center justify-between py-2">
                <span className="text-xs text-white/50">Manche #{round.no}</span>
                <span className="text-xs font-semibold tabular-nums text-white/85">
                  {formatMultiplier(round.crash)}
                </span>
                <span className="text-[10px] tabular-nums text-white/25">
                  {formatDateTime(round.endedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface p-4">
          <p className="flex items-center gap-2 label">
            <Database className="h-3.5 w-3.5" />
            Données
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-white/45">
            Schéma PostgreSQL compatible Supabase : profils, manches, mises et
            prédictions. Les politiques RLS fournies protègent l'accès direct
            depuis un client Supabase.
          </p>
          <p className="mt-3 text-[11px] text-white/30">
            {overview.predictions} prédictions enregistrées · {overview.rounds} manches
          </p>
        </div>
      </section>
    </div>
  );
}
