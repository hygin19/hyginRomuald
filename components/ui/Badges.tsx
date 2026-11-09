import clsx from "clsx";

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "chip border-gold/40 bg-gold/10 text-[10px] uppercase tracking-[0.16em] text-gold",
        className,
      )}
      title="Données et argent fictifs — aucun pari réel"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
      Démo
    </span>
  );
}

export function RoleBadge({ role }: { role: "user" | "admin" }) {
  return role === "admin" ? (
    <span className="chip border-flame-500/40 bg-flame-500/10 text-flame-300">
      Administrateur
    </span>
  ) : (
    <span className="chip border-white/15 bg-white/5 text-white/60">Joueur</span>
  );
}

export function ResultBadge({
  result,
}: {
  result: "pending" | "gagne" | "perdu";
}) {
  const map = {
    pending: { label: "En cours", className: "border-white/15 bg-white/5 text-white/55" },
    gagne: { label: "Gagné", className: "border-mint/40 bg-mint/10 text-mint" },
    perdu: { label: "Perdu", className: "border-flame-500/40 bg-flame-500/10 text-flame-300" },
  } as const;
  const item = map[result];
  return <span className={clsx("chip", item.className)}>{item.label}</span>;
}

export function PhaseBadge({ phase }: { phase: "waiting" | "flying" | "crashed" }) {
  const map = {
    waiting: { label: "Mises ouvertes", className: "border-gold/40 bg-gold/10 text-gold" },
    flying: { label: "En vol", className: "border-mint/40 bg-mint/10 text-mint" },
    crashed: { label: "Crashé", className: "border-flame-500/40 bg-flame-500/10 text-flame-300" },
  } as const;
  const item = map[phase];
  return <span className={clsx("chip", item.className)}>{item.label}</span>;
}
