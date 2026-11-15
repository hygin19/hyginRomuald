import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, PenLine } from "lucide-react";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import { HistoryList } from "@/components/history/HistoryList";
import { ManualHistoryForm } from "@/components/history/ManualHistoryForm";
import { EmptyState } from "@/components/ui/StatCard";
import { requireUser } from "@/lib/server/auth";
import {
  HISTORY_TZ_LABEL,
  listMultiplierHistory,
  MultiplierHistoryError,
} from "@/lib/server/multiplier-history";

export const metadata: Metadata = { title: "Historique manuel" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ du?: string; au?: string; page?: string }>;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const params = await searchParams;

  const from = params.du?.trim() || undefined;
  const to = params.au?.trim() || undefined;
  const page = Number(params.page ?? 1) || 1;

  let filterError: string | null = null;
  let data;
  try {
    data = await listMultiplierHistory(profile.id, { from, to, page });
  } catch (error) {
    filterError =
      error instanceof MultiplierHistoryError
        ? error.message
        : "Filtres invalides : affichage complet de l'historique.";
    data = await listMultiplierHistory(profile.id, { page: 1 });
  }

  const hrefForPage = (target: number) => {
    const query = new URLSearchParams();
    if (from) query.set("du", from);
    if (to) query.set("au", to);
    if (target > 1) query.set("page", String(target));
    const search = query.toString();
    return search ? `/historique?${search}` : "/historique";
  };

  return (
    <div className="animate-rise space-y-4">
      <header>
        <p className="label">Historique manuel</p>
        <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
          Multiplicateurs saisis à la main
        </h1>
        <p className="mt-1 text-xs text-white/40">
          Module séparé : chaque valeur est saisie manuellement, puis enregistrée
          dans Supabase et dans la base applicative.
        </p>
      </header>

      <section className="surface p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-flame-500/25 bg-flame-500/10 text-flame-400">
            <PenLine className="h-4 w-4" />
          </span>
          <div>
            <p className="label">Nouvelle entrée</p>
            <p className="text-[11px] text-white/40">
              Saisie manuelle uniquement · {HISTORY_TZ_LABEL}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <ManualHistoryForm />
        </div>
      </section>

      <section className="surface p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="label">Filtrer</p>
            <p className="text-[11px] text-white/40">
              Bornes incluses, heure d&apos;Antananarivo.
            </p>
          </div>
          <span className="text-[11px] text-white/30">
            {data.total} entrée{data.total > 1 ? "s" : ""} · page {data.page}/{data.pages}
          </span>
        </div>

        <div className="mt-3">
          <HistoryFilters from={from} to={to} />
        </div>

        {filterError && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-flame-500/40 bg-flame-500/10 px-3 py-2 text-[11px] text-flame-300"
          >
            {filterError}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-white">Entrées enregistrées</h2>
          <span className="text-[11px] text-white/30">Plus récente en premier</span>
        </div>

        {data.items.length === 0 ? (
          <EmptyState
            title="Aucune entrée pour l'instant"
            description="Ajoutez votre premier multiplicateur avec le formulaire ci-dessus : il sera enregistré dans les deux bases."
          />
        ) : (
          <HistoryList items={data.items} />
        )}

        {data.pages > 1 && (
          <nav className="flex items-center justify-between gap-2" aria-label="Pagination">
            {data.page > 1 ? (
              <Link href={hrefForPage(data.page - 1)} className="btn-ghost px-3 py-2 text-[11px]">
                <ChevronLeft className="h-3.5 w-3.5" />
                Précédent
              </Link>
            ) : (
              <span />
            )}
            <span className="text-[11px] text-white/35">
              Page {data.page} sur {data.pages}
            </span>
            {data.page < data.pages ? (
              <Link href={hrefForPage(data.page + 1)} className="btn-ghost px-3 py-2 text-[11px]">
                Suivant
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>

      <section className="surface border-gold/20 bg-gold/[0.04] p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
          <Info className="h-3.5 w-3.5" />
          À savoir
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/50">
          Ce module n&apos;analyse rien et ne modifie aucune règle de prédiction :
          il conserve uniquement les multiplicateurs que vous saisissez. Aucune
          capture automatique n&apos;est effectuée, ni depuis le simulateur, ni
          depuis les API HONORE.
        </p>
      </section>
    </div>
  );
}
