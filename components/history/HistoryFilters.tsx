"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";

/** Filtre par date (bornes incluses, heure d'Antananarivo). */
export function HistoryFilters({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const [du, setDu] = useState(from ?? "");
  const [au, setAu] = useState(to ?? "");

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (du) params.set("du", du);
    if (au) params.set("au", au);
    const query = params.toString();
    router.push(query ? `/historique?${query}` : "/historique");
  }

  function reset() {
    setDu("");
    setAu("");
    router.push("/historique");
  }

  return (
    <form onSubmit={apply} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <div>
        <label htmlFor="history-from" className="label">
          Du
        </label>
        <input
          id="history-from"
          type="date"
          value={du}
          onChange={(event) => setDu(event.target.value)}
          className="field mt-1.5 py-2.5 text-xs"
        />
      </div>
      <div>
        <label htmlFor="history-to" className="label">
          Au
        </label>
        <input
          id="history-to"
          type="date"
          value={au}
          onChange={(event) => setAu(event.target.value)}
          className="field mt-1.5 py-2.5 text-xs"
        />
      </div>
      <button type="submit" className="btn-ghost px-3 py-2.5 text-[11px]">
        <Filter className="h-3.5 w-3.5" />
        Filtrer
      </button>
      <button type="button" onClick={reset} className="btn-ghost px-3 py-2.5 text-[11px]">
        <RotateCcw className="h-3.5 w-3.5" />
        Réinitialiser
      </button>
    </form>
  );
}
