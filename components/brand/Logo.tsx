import clsx from "clsx";

export function Logo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dimensions = {
    sm: "h-8 w-8 rounded-lg",
    md: "h-10 w-10 rounded-xl",
    lg: "h-14 w-14 rounded-2xl",
  }[size];

  const icon = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  }[size];

  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center border border-flame-500/40",
        "bg-gradient-to-br from-flame-500/30 via-flame-700/20 to-transparent shadow-glow",
        dimensions,
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={clsx("text-flame-400", icon)}
        aria-hidden="true"
      >
        <path
          d="M2.5 13.2 21 4.5l-5.1 18.1-3.6-6.2-6.1 1.6 2.7-3.4-6.4-1.4Z"
          fill="currentColor"
          fillOpacity="0.92"
        />
        <path d="M12.3 16.4 21 4.5l-8.7 11.9Z" fill="#06060a" fillOpacity="0.35" />
      </svg>
    </span>
  );
}

export function BrandName({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex flex-col leading-none">
      <span className="font-display text-[15px] font-extrabold uppercase tracking-[0.14em] text-white">
        Honore
        {!compact && <span className="text-flame-500"> Aviator</span>}
      </span>
      {!compact && (
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.32em] text-white/35">
          Démo · MGA
        </span>
      )}
    </span>
  );
}
