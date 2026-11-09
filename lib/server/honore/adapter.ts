import { createHmac, timingSafeEqual } from "node:crypto";
import { HONORE_ENDPOINTS, findEndpoint } from "@/lib/server/honore/registry";
import type { HonoreAdapterStatus } from "@/lib/types";

/**
 * Adaptateur serveur HONORE Gaming.
 *
 * Règles de sécurité appliquées ici :
 *  - ce module ne doit jamais être importé par un composant client ;
 *  - aucun appel réseau n'est possible tant que la documentation officielle
 *    n'est pas vérifiée (`HONORE_DOCS_VERIFIED`) et l'activation explicite
 *    (`HONORE_LIVE_ENABLED`) n'est pas faite ;
 *  - seuls les points d'entrée du registre sont joignables (liste blanche) ;
 *  - la clé secrète reste côté serveur : elle sert à signer, jamais à exposer ;
 *  - les réponses sont bornées en taille et les erreurs ne fuient aucun secret.
 */

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 256 * 1024;

export class HonoreAdapterError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new HonoreAdapterError(
      "CLIENT_FORBIDDEN",
      "L'adaptateur HONORE est strictement côté serveur.",
      500,
    );
  }
}

function baseUrl(): string | null {
  const raw = process.env.HONORE_API_BASE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      throw new Error("https requis");
    }
    return url.origin + url.pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isLiveBettingAuthorized(): boolean {
  return (
    process.env.HONORE_LIVE_ENABLED === "true" &&
    process.env.HONORE_DOCS_VERIFIED === "true" &&
    Boolean(process.env.HONORE_API_KEY) &&
    Boolean(process.env.HONORE_API_SECRET) &&
    Boolean(baseUrl())
  );
}

export function getAdapterStatus(): HonoreAdapterStatus {
  return {
    configured: Boolean(process.env.HONORE_API_KEY) && Boolean(baseUrl()),
    liveBettingEnabled: isLiveBettingAuthorized(),
    documentationVerified: process.env.HONORE_DOCS_VERIFIED === "true",
    mode: "demo",
    endpoints: HONORE_ENDPOINTS,
    notice:
      "Aucun pari réel n'est transmis. L'adaptateur reste inactif jusqu'à réception de la documentation officielle HONORE et d'une autorisation écrite.",
  };
}

function sign(secret: string, timestamp: string, method: string, path: string, body: string) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${method}.${path}.${body}`)
    .digest("hex");
}

export type HonoreCallResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  requestId: string | null;
};

/**
 * Appel signé vers un point d'entrée du registre.
 * Refuse tout appel tant que l'autorisation officielle n'est pas en place.
 */
export async function callHonoreEndpoint<T = unknown>(
  endpointName: string,
  payload?: Record<string, unknown>,
): Promise<HonoreCallResult<T>> {
  assertServerRuntime();

  const endpoint = findEndpoint(endpointName);
  if (!endpoint) {
    throw new HonoreAdapterError(
      "ENDPOINT_INCONNU",
      "Point d'entrée HONORE non autorisé.",
      403,
    );
  }
  if (!endpoint.verified) {
    throw new HonoreAdapterError(
      "ENDPOINT_NON_VERIFIE",
      "Ce point d'entrée n'est pas confirmé par la documentation officielle.",
      409,
    );
  }
  if (!isLiveBettingAuthorized()) {
    throw new HonoreAdapterError(
      "LIVE_NON_AUTORISE",
      "Pari réel désactivé : documentation officielle et autorisation requises.",
      403,
    );
  }
  if (endpoint.path.includes("..") || !endpoint.path.startsWith("/")) {
    throw new HonoreAdapterError("CHEMIN_INVALIDE", "Chemin refusé.", 400);
  }

  const origin = baseUrl()!;
  const url = new URL(origin + endpoint.path);
  if (url.origin !== new URL(origin).origin) {
    throw new HonoreAdapterError("HOTE_REFUSE", "Hôte hors liste blanche.", 403);
  }

  const body = endpoint.method === "POST" ? JSON.stringify(payload ?? {}) : "";
  const timestamp = Date.now().toString();
  const signature = sign(
    process.env.HONORE_API_SECRET!,
    timestamp,
    endpoint.method,
    endpoint.path,
    body,
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-honore-key": process.env.HONORE_API_KEY!,
        "x-honore-timestamp": timestamp,
        "x-honore-signature": signature,
      },
      body: body || undefined,
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });

    const raw = await response.text();
    if (raw.length > MAX_RESPONSE_BYTES) {
      throw new HonoreAdapterError("REPONSE_TROP_VOLUMINEUSE", "Réponse refusée.", 502);
    }

    return {
      ok: response.ok,
      status: response.status,
      data: raw ? (JSON.parse(raw) as T) : null,
      requestId: response.headers.get("x-request-id"),
    };
  } catch (error) {
    if (error instanceof HonoreAdapterError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new HonoreAdapterError("DELAI_DEPASSE", "HONORE n'a pas répondu à temps.", 504);
    }
    throw new HonoreAdapterError("ERREUR_RESEAU", "Échec de l'appel HONORE.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

/** Utilitaire de comparaison sûre (tests internes / vérification de signatures). */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
