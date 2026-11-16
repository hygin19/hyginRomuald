# AVIATOR NEON TRACKER

A neon, mobile-friendly tracker that records Aviator game multipliers by hand, together with the
exact date and time (down to the second) each one appeared.

It deliberately does **not** predict anything, auto-collect multipliers, draw charts, take bets, or
invent results. It records what you type, keeps it in SQLite, and lets you export/import that
database.

## Features

- **Manual entry** — multiplier (e.g. `2.50x`), date picker, and an hour / minute / second time picker.
- **History table** — ID, multiplier, date, exact time, delete button, newest first.
- **Persistence** — SQLite table `aviator_results` (`id`, `multiplier`, `result_date`,
  `result_time` as `HH:MM:SS`, `created_at`).
- **EXPORT DATABASE (.DB)** — downloads a genuine SQLite file (a byte-exact copy via SQLite's
  online backup API), not a renamed CSV/JSON.
- **IMPORT DATABASE** — restores rows from any compatible Aviator `.db`; duplicates
  (same multiplier, date and time) are skipped and invalid files are rejected.
- **Languages** — Malagasy, French and English; the choice is remembered in `localStorage`.
- **Neon UI** — dark navy glassmorphism cards, cyan/purple/pink glows, responsive layout.

## Stack

- **Backend:** Python 3.12, FastAPI, uvicorn, standard-library `sqlite3`.
- **Frontend:** plain HTML/CSS/JS (no build step) served by the same process.

## Run it

```bash
docker compose -f docker-compose.base44.yml up -d
# open http://localhost:3000
```

The container installs `backend/requirements.txt` on start and runs
`uvicorn backend.main:app --reload`. The SQLite file lives in the `aviator_data` volume at
`/data/aviator.db`, so records survive restarts.

## API

| Method | Path                 | Purpose                                |
| ------ | -------------------- | -------------------------------------- |
| GET    | `/api/health`        | Health probe + row count               |
| GET    | `/api/results`       | All results, newest first              |
| POST   | `/api/results`       | Save `{multiplier, result_date, result_time}` |
| DELETE | `/api/results/{id}`  | Delete one result                      |
| GET    | `/api/export`        | Download the SQLite database (`.db`)   |
| POST   | `/api/import`        | Upload a `.db` file (multipart `file`) |
