# Agent notes — AVIATOR NEON TRACKER

## Running in the sandbox

- Stack: `docker-compose.base44.yml` (repo root; there is no separate environment repository here).
  One `python:3.12-slim` service serves both the API and the static frontend on host port **3000**.
- Start / restart: `docker compose -f docker-compose.base44.yml up -d`
- Health: `curl http://localhost:3000/api/health` → `{"status":"ok","results":N}`
- First start takes ~10–20 s because `pip install` runs before uvicorn. `pip_cache` is a named
  volume, so later starts are faster; `aviator_data` holds the SQLite file (`/data/aviator.db`) and
  must never be deleted to refresh dependencies.
- Host has no language runtimes: run any Python one-liner inside the service, e.g.
  `docker compose -f docker-compose.base44.yml exec -T web python -c "..."`.

## Live reload behaviour

- `uvicorn --reload` watches `/app/backend` only → Python edits reload automatically.
- `frontend/` is served straight from disk by `StaticFiles`, so HTML/CSS/JS edits show on a browser
  refresh without restarting the service.
- There is no test suite and no linter configured; verify through the HTTP API
  (`/api/health`, `/api/results`, `/api/export`, `/api/import`) and the preview UI.

## Non-obvious details

- Export uses `sqlite3.Connection.backup` into a temp file, so the download is a real SQLite
  database (`SQLite format 3` header) containing the `aviator_results` table and `sqlite_sequence`.
- Import merges rows and skips duplicates on `(multiplier, result_date, result_time)`; a non-SQLite
  upload returns HTTP 400 `invalid_database`.
- `result_date` / `result_time` are validated server-side (`YYYY-MM-DD`, `HH:MM:SS`); the multiplier
  accepts `2.5`, `2.50x` or `2,50` and is stored rounded to 2 decimals.
- Language choice persists in `localStorage` under `aviator.lang`; all copy lives in
  `frontend/i18n.js` (`en`, `fr`, `mg`).
