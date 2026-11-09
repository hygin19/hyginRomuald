# Adaptateur serveur HONORE Gaming

## État actuel : verrouillé (mode démonstration)

Aucune spécification officielle ni APK n'est présent dans ce dépôt. Les chemins
déclarés dans `lib/server/honore/registry.ts` sont donc des **emplacements à
confirmer** (`verified: false`) et ne peuvent pas être appelés.

Conséquences :

- aucun pari réel n'est possible depuis l'application ;
- toutes les manches, mises, gains et statistiques proviennent du simulateur
  local (PostgreSQL), et sont marqués **DEMO** dans l'interface ;
- le centre de prédiction n'interroge pas HONORE : il calcule une heuristique
  statistique sur les manches simulées.

## Ce que fait l'adaptateur

`lib/server/honore/adapter.ts`

| Contrôle | Détail |
| --- | --- |
| Exécution serveur uniquement | Refus si `window` existe (import client interdit). |
| Liste blanche | Seuls les endpoints du registre sont joignables. |
| Documentation requise | `HONORE_DOCS_VERIFIED=true` obligatoire. |
| Activation explicite | `HONORE_LIVE_ENABLED=true` obligatoire. |
| HTTPS | Base URL en `https://` (sauf `localhost`). |
| Signature | HMAC-SHA256 sur `timestamp.méthode.chemin.corps`. |
| Délai | 8 s maximum par appel. |
| Taille | Réponse limitée à 256 Ko. |
| Secrets | Jamais renvoyés au client ni journalisés. |

Les clés `HONORE_API_KEY` / `HONORE_API_SECRET` sont des secrets d'environnement
côté serveur : elles ne doivent jamais être préfixées `NEXT_PUBLIC_`.

## Procédure d'activation (à ne faire qu'avec autorisation écrite)

1. Recevoir la documentation officielle HONORE Gaming (domaines, chemins,
   schémas de requête/réponse, schéma de signature, environnements de test).
2. Mettre à jour `registry.ts` : chemins et méthodes exacts, puis passer
   `verified: true` **uniquement** pour les endpoints documentés.
3. Vérifier la signature dans un environnement de test HONORE (sandbox), sans
   argent réel.
4. Fournir `HONORE_API_BASE_URL`, `HONORE_API_KEY`, `HONORE_API_SECRET` via le
   gestionnaire de secrets.
5. Régler `HONORE_DOCS_VERIFIED=true` puis `HONORE_LIVE_ENABLED=true`.
6. Contrôler dans `/admin` que l'état passe à « Paris réels actifs ».

## Ce qui manque pour aller plus loin

- La documentation officielle (aucune fournie à ce jour).
- Une autorisation écrite de l'opérateur / du fournisseur de jeu.
- Les règles de conformité locales (jeu responsable, KYC, limites, fiscalité).
- Un mécanisme de réconciliation des soldes et d'idempotence des mises
  (`Idempotency-Key`) côté HONORE.

Tant que ces éléments ne sont pas réunis, **le mode DEMO reste la seule
configuration autorisée**.
