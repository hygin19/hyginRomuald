import clsx from "clsx";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "flame" | "gold" | "mint";
  className?: string;
}) {
  const tones = {
    default: "text-white",
    flame: "text-flame-400",
    gold: "text-gold",
    mint: "text-mint",
  } as const;

  return (
    <div className={clsx("surface p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="label">{label}</span>
        {icon && <span className="text-white/30">{icon}</span>}
      </div>
      <p className={clsx("display-num mt-2 text-2xl", tones[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight text-white">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-xs text-white/40">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-flat flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="font-display text-sm font-semibold text-white/80">{title}</p>
      <p className="max-w-sm text-xs text-white/40">{description}</p>
      {action}
    </div>
  );
}
