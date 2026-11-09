const mgaFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

/** 12500 -> "12 500 MGA" */
export function formatMga(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${mgaFormatter.format(Math.round(Number.isFinite(n) ? n : 0))} MGA`;
}

export function formatMgaShort(value: number | string | null | undefined): string {
  return mgaFormatter.format(Math.round(Number(value ?? 0)));
}

export function formatMultiplier(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${(Number.isFinite(n) ? n : 0).toFixed(2)}x`;
}

export function multiplierTone(multiplier: number): string {
  if (multiplier >= 10) return "text-gold";
  if (multiplier >= 3) return "text-[#ff8a5c]";
  if (multiplier >= 1.8) return "text-flame-400";
  return "text-white/55";
}

export function formatDateTime(value: string | number | Date): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(value: string | number | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function timeAgo(value: string | number | Date): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
