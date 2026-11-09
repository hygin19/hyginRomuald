# HONORE AVIATOR — Version 1 (démonstration)

Simulateur Aviator complet, mobile-first et entièrement en français : manches en
direct, mises fictives en **MGA**, centre de prédiction, statistiques et espace
administrateur.

> ⚠️ **Démonstration uniquement.** Aucun argent réel, aucun dépôt, aucun retrait.
> L'adaptateur des API HONORE Gaming est présent côté serveur mais **verrouillé**
> tant que la documentation officielle et une autorisation écrite ne sont pas
> fournies (voir [`docs/honore-adapter.md`](docs/honore-adapter.md)).

## Fonctionnalités livrées

| Module | Contenu |
| --- | --- |
| Tableau de bord | Solde démo, manche en direct, bilan personnel, dernières mises, aperçu de prédiction |
| Arène (`/jeu`) | Manche serveur-autoritaire : 9 s de mise, multiplicateur temps réel, encaissement, crash, flux des paris, historique |
| Centre de prédiction | Seuil suggéré, confiance, méthode expliquée, enregistrement et suivi de précision |
| Statistiques | Distribution des crashes, moyenne/record/séries, historique détaillé, bilan personnel |
| Profil | Identité Supabase, solde, statistiques, historique, déconnexion |
| Administration | Comptes, volumes, manches récentes, état de l'adaptateur HONORE (endpoints à confirmer) |

## Stack

- **Next.js 15** (App Router, React 19, TypeScript) — interface et API routes
- **Supabase Auth** (`@supabase/ssr`) — sessions par cookies httpOnly
- **PostgreSQL** — schéma compatible Supabase (`db/schema.sql`)
- **Tailwind CSS** — design noir/rouge, mobile-first
- Aucun appel aux API HONORE n'est effectué

## Démarrage (environnement Base44)

```bash
docker compose --project-name app \
  --project-directory "$BASE44_PROJECT_ROOT" \
  -f "$BASE44_CONFIG_ROOT/docker-compose.base44.yml" up -d --build
```

Services : `db` (PostgreSQL 16), `auth` (Supabase Auth / GoTrue), `web` (Next.js
en mode développement, port **3000**). Le conteneur `web` installe les
dépendances, exécute `scripts/bootstrap.mjs` (schéma + données de démonstration)
puis lance `next dev`.

### Comptes de démonstration

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Joueur | `demo@honore.mg` | `Demo1234!` |
| Administrateur | `admin@honore.mg` | `Admin1234!` |
| Joueurs fictifs | `ravinala@honore.mg`, `baobab@honore.mg`, `soa@honore.mg` | `Demo1234!` |

Ces comptes sont créés au premier démarrage. Changez-les avant tout usage réel.

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL (locale ou Supabase) |
| `SUPABASE_URL` | URL du service Auth (locale : origine de l'app, proxy `/auth/v1`) |
| `SUPABASE_ANON_KEY` | Clé publique Supabase (serveur uniquement ici) |
| `AUTH_INTERNAL_URL` | Cible interne du proxy `/auth/v1` (GoTrue) |
| `HONORE_API_*` | Identifiants de l'adaptateur HONORE (facultatifs) |
| `HONORE_DOCS_VERIFIED` / `HONORE_LIVE_ENABLED` | Verrou d'activation des paris réels |

`.env.example` documente le modèle. Les valeurs réelles sont fournies par le
gestionnaire de secrets de l'environnement (`/run/base44/app.env`), jamais
committées.

## Déploiement sur un projet Supabase

1. Créer un projet Supabase et récupérer la chaîne de connexion PostgreSQL
   (`DATABASE_URL`), l'URL du projet (`SUPABASE_URL`) et la clé anon.
2. Exécuter `db/schema.sql` puis `supabase/rls.sql` dans l'éditeur SQL.
3. Renseigner les secrets `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
4. Désactiver la confirmation email ou configurer le SMTP pour autoriser les
   inscriptions immédiates.
5. Promouvoir un compte admin :
   `update public.profiles set role = 'admin' where email = 'vous@exemple.mg';`

## Aperçu / sandbox

`next.config.mjs` contient un bloc `previewOverrides` activé **uniquement**
quand `BASE44_PREVIEW_MODE === "1"` : il ajoute les origines de développement du
sandbox à `allowedDevOrigins` (sinon Next bloque les assets dev/HMR derrière le
proxy). Sans ce drapeau — en production — le comportement d'origine est
conservé : aucune origine supplémentaire n'est autorisée. Le proxy `/auth/v1` →
GoTrue, lui, sert aussi bien en local qu'en production.

## Vérifications

```bash
npm run typecheck   # TypeScript
npm run bootstrap   # ré-applique le schéma et complète les données démo
```

## Limites connues de la v1

- Les manches sont générées localement : ce ne sont pas les manches HONORE.
- L'heuristique de prédiction est statistique et **sans garantie** ; elle ne
  contourne pas l'aléa des manches.
- Aucun paiement, retrait, KYC ou limite de jeu responsable n'est implémenté.
- Les endpoints de l'adaptateur HONORE restent `verified: false`.
