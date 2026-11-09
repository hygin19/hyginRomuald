/**
 * Registre des points d'entrée HONORE Gaming.
 *
 * ⚠️ Aucune spécification officielle n'accompagne ce dépôt : les chemins
 * ci-dessous sont des emplacements de configuration à faire confirmer par la
 * documentation officielle HONORE avant toute activation. `verified: false`
 * interdit tout appel réel (voir adapter.ts).
 */
export type HonoreEndpoint = {
  name: string;
  method: "GET" | "POST";
  path: string;
  verified: boolean;
  description: string;
};

export const HONORE_ENDPOINTS: HonoreEndpoint[] = [
  {
    name: "auth.login",
    method: "POST",
    path: "/api/auth/login",
    verified: false,
    description: "Obtention d'un jeton opérateur (à confirmer).",
  },
  {
    name: "wallet.balance",
    method: "GET",
    path: "/api/wallet/balance",
    verified: false,
    description: "Consultation du solde joueur (à confirmer).",
  },
  {
    name: "aviator.state",
    method: "GET",
    path: "/api/aviator/state",
    verified: false,
    description: "État de la manche en cours (à confirmer).",
  },
  {
    name: "aviator.bet",
    method: "POST",
    path: "/api/aviator/bet",
    verified: false,
    description: "Placement d'une mise réelle (à confirmer).",
  },
  {
    name: "aviator.cashout",
    method: "POST",
    path: "/api/aviator/cashout",
    verified: false,
    description: "Encaissement d'une mise réelle (à confirmer).",
  },
  {
    name: "aviator.history",
    method: "GET",
    path: "/api/aviator/history",
    verified: false,
    description: "Historique des multiplicateurs (à confirmer).",
  },
];

export function findEndpoint(name: string): HonoreEndpoint | undefined {
  return HONORE_ENDPOINTS.find((endpoint) => endpoint.name === name);
}
