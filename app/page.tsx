import {
  BarChart3,
  ChevronRight,
  Plane,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { BrandName, Logo } from "@/components/brand/Logo";
import { FlightStage } from "@/components/game/FlightStage";
import { DemoBadge } from "@/components/ui/Badges";
import { getSessionUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Plane,
    title: "Jeu en direct",
    text: "Manches simulées toutes les ~20 s : 9 s de mise, multiplicateur en temps réel, encaissement instantané et historique des crashes.",
  },
  {
    icon: Radar,
    title: "Centre de prédiction",
    text: "Une heuristique statistique transparente, calculée côté serveur sur les dernières manches. Aucune promesse, aucun accès aux serveurs HONORE.",
  },
  {
    icon: BarChart3,
    title: "Statistiques",
    text: "Distribution des multiplicateurs, moyenne, records, séries en cours et bilan personnel de vos mises fictives.",
  },
  {
    icon: ShieldCheck,
    title: "Espace administrateur",
    text: "Suivi des comptes, volumes de mises, manches récentes et état de l'adaptateur d'API HONORE.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <BrandName />
        </Link>
        <nav className="flex items-center gap-2">
          <DemoBadge className="hidden sm:inline-flex" />
          <Link
            href={user ? "/dashboard" : "/connexion"}
            className="btn-ghost px-3.5 py-2 text-xs"
          >
            {user ? "Mon tableau de bord" : "Connexion"}
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-16">
        <section className="grid items-center gap-8 pt-4 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pt-10">
          <div className="animate-rise">
            <span className="chip border-flame-500/30 bg-flame-500/10 text-[10px] uppercase tracking-[0.24em] text-flame-300">
              <Sparkles className="h-3 w-3" />
              Honore Gaming · Version 1
            </span>

            <h1 className="mt-4 font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl">
              Le crash se prépare.
              <br />
              <span className="bg-gradient-to-r from-flame-400 via-flame-500 to-flame-700 bg-clip-text text-transparent">
                Le vol se décide.
              </span>
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/50 sm:text-base">
              Simulateur Aviator complet : manches en direct, mises fictives en
              <span className="font-semibold text-white/75"> MGA</span>, centre de
              prédiction et statistiques détaillées. Interface mobile-first,
              entièrement en français.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href={user ? "/dashboard" : "/inscription"}
                className="btn-primary px-5 text-sm"
              >
                {user ? "Ouvrir mon espace" : "Créer mon compte démo"}
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link href="/jeu" className="btn-ghost px-5 text-sm">
                Voir l'arène
              </Link>
            </div>

            <ul className="mt-6 grid grid-cols-2 gap-2 text-[11px] text-white/45">
              {[
                "Argent fictif, aucun dépôt",
                "Aucun pari réel activé",
                "API HONORE côté serveur",
                "Mobile-first en français",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-flame-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative animate-rise">
            <FlightStage
              phase="flying"
              multiplier={3.47}
              elapsedMs={8200}
              countdownSeconds={0}
              nextRoundSeconds={0}
              roundNo={1248}
            />
            <div className="mt-2 flex items-center justify-between px-1 text-[10px] uppercase tracking-[0.2em] text-white/25">
              <span>Aperçu · manche simulée</span>
              <span>Multiplicateur ×3,47</span>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-lg font-bold tracking-tight text-white">
            Ce que contient la version 1
          </h2>
          <p className="mt-1 text-xs text-white/40">
            Quatre modules, une seule promesse : vous montrer exactement comment
            l'arène fonctionne, sans risquer un ariary.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="surface p-5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-flame-500/25 bg-flame-500/10 text-flame-400">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <h3 className="mt-3 font-display text-sm font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/45">
                    {feature.text}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="surface mt-10 border-gold/20 bg-gold/[0.04] p-5">
          <p className="label text-gold">Cadre de la démonstration</p>
          <div className="mt-3 grid gap-3 text-xs leading-relaxed text-white/55 sm:grid-cols-3">
            <p>
              <span className="font-semibold text-white/80">Argent fictif.</span> Les
              soldes, mises et gains en MGA sont générés par le simulateur et
              n'engagent aucun paiement.
            </p>
            <p>
              <span className="font-semibold text-white/80">Aucun pari réel.</span>{" "}
              L'adaptateur HONORE est présent côté serveur mais reste verrouillé
              jusqu'à réception de la documentation officielle et d'une autorisation
              écrite.
            </p>
            <p>
              <span className="font-semibold text-white/80">Données marquées DEMO.</span>{" "}
              Manches, utilisateurs et statistiques d'exemple sont identifiés comme
              fictifs dans l'application.
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-flame-500/25 bg-gradient-to-br from-flame-600/20 via-ink-900 to-ink-950 p-6 text-center">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            Prêt à tester une manche ?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/45">
            Un compte démo vous donne 50 000 MGA fictifs, l'accès au centre de
            prédiction et à toutes les statistiques.
          </p>
          <Link
            href={user ? "/jeu" : "/inscription"}
            className="btn-primary mx-auto mt-4 px-6"
          >
            {user ? "Jouer la manche en cours" : "Commencer la démonstration"}
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] px-5 py-6 text-center text-[10px] leading-relaxed text-white/25">
        HONORE AVIATOR · Version 1 · Démonstration technique. Les jeux d'argent
        présentent des risques : cette application est un simulateur sans argent
        réel. Aucun paiement, aucun retrait.
      </footer>
    </div>
  );
}
