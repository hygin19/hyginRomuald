/** Constantes partagées client/serveur du jeu de démonstration (aucun accès I/O). */

/** Durée de la fenêtre de mise (ms). */
export const WAIT_MS = 9000;
/** Pause entre deux manches (ms). */
export const GAP_MS = 3200;
/** Croissance du multiplicateur : m(t) = e^(GROWTH * t_secondes). */
export const GROWTH = 0.155;
export const MIN_FLIGHT_MS = 1200;
export const MAX_CRASH = 20;
export const MIN_BET = 50;
export const MAX_BET = 100_000;
export const START_BALANCE = 50_000;
export const DEMO_GAME_LOCK = 918_273;

export function multiplierAt(flyStartAt: number, nowMs: number): number {
  const seconds = Math.max(0, (nowMs - flyStartAt) / 1000);
  return Math.exp(GROWTH * seconds);
}

export function flightDurationMs(crashMultiplier: number): number {
  return Math.max(MIN_FLIGHT_MS, (Math.log(crashMultiplier) / GROWTH) * 1000);
}
