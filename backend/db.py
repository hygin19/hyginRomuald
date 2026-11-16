"""SQLite storage for Aviator multipliers.

The live database always holds a real ``aviator_results`` table, so an export is
simply a byte-exact copy of that database (never a renamed text file).
"""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = os.environ.get("AVIATOR_DB_PATH", "/data/aviator.db")

TABLE = "aviator_results"

SCHEMA = """
CREATE TABLE IF NOT EXISTS aviator_results (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    multiplier  REAL    NOT NULL,
    result_date TEXT    NOT NULL,
    result_time TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_aviator_results_when
    ON aviator_results (result_date DESC, result_time DESC);
"""


class InvalidDatabase(Exception):
    """Raised when an uploaded file is not a compatible Aviator database."""


@contextmanager
def connection(path: str, read_only: bool = False):
    if read_only:
        conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=10)
    else:
        conn = sqlite3.connect(path, timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        if not read_only:
            conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with connection(DB_PATH) as conn:
        conn.executescript(SCHEMA)


def list_results() -> list[dict]:
    with connection(DB_PATH, read_only=True) as conn:
        rows = conn.execute(
            f"""
            SELECT id, multiplier, result_date, result_time, created_at
            FROM {TABLE}
            ORDER BY result_date DESC, result_time DESC, id DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def add_result(multiplier: float, result_date: str, result_time: str) -> dict:
    with connection(DB_PATH) as conn:
        cursor = conn.execute(
            f"INSERT INTO {TABLE} (multiplier, result_date, result_time) VALUES (?, ?, ?)",
            (multiplier, result_date, result_time),
        )
        row = conn.execute(
            f"SELECT id, multiplier, result_date, result_time, created_at FROM {TABLE} WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return dict(row)


def delete_result(result_id: int) -> bool:
    with connection(DB_PATH) as conn:
        cursor = conn.execute(f"DELETE FROM {TABLE} WHERE id = ?", (result_id,))
        return cursor.rowcount > 0


def count_results() -> int:
    with connection(DB_PATH, read_only=True) as conn:
        return int(conn.execute(f"SELECT COUNT(*) FROM {TABLE}").fetchone()[0])


def export_database(destination: str) -> str:
    """Write a valid SQLite database containing every saved result."""
    with connection(DB_PATH, read_only=True) as source, connection(destination) as target:
        source.backup(target)
    return destination


def import_database(source_path: str) -> dict:
    """Merge the rows of another Aviator SQLite database into the live one."""
    try:
        with connection(source_path, read_only=True) as source:
            tables = {
                row["name"]
                for row in source.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
            }
            if TABLE not in tables:
                raise InvalidDatabase(f"missing table '{TABLE}'")

            columns = {
                row["name"] for row in source.execute(f"PRAGMA table_info({TABLE})")
            }
            required = {"multiplier", "result_date", "result_time"}
            if not required.issubset(columns):
                raise InvalidDatabase("missing expected columns")

            has_created_at = "created_at" in columns
            select = (
                f"SELECT multiplier, result_date, result_time, created_at FROM {TABLE}"
                if has_created_at
                else f"SELECT multiplier, result_date, result_time FROM {TABLE}"
            )
            rows = source.execute(select).fetchall()
    except sqlite3.DatabaseError as exc:
        raise InvalidDatabase("file is not a SQLite database") from exc

    imported = 0
    skipped = 0
    with connection(DB_PATH) as target:
        for row in rows:
            multiplier = round(float(row["multiplier"]), 2)
            result_date = str(row["result_date"]).strip()
            result_time = str(row["result_time"]).strip()
            if not result_date or not result_time:
                skipped += 1
                continue

            duplicate = target.execute(
                f"""
                SELECT 1 FROM {TABLE}
                WHERE multiplier = ? AND result_date = ? AND result_time = ?
                """,
                (multiplier, result_date, result_time),
            ).fetchone()
            if duplicate:
                skipped += 1
                continue

            if has_created_at and row["created_at"]:
                target.execute(
                    f"INSERT INTO {TABLE} (multiplier, result_date, result_time, created_at)"
                    " VALUES (?, ?, ?, ?)",
                    (multiplier, result_date, result_time, str(row["created_at"])),
                )
            else:
                target.execute(
                    f"INSERT INTO {TABLE} (multiplier, result_date, result_time) VALUES (?, ?, ?)",
                    (multiplier, result_date, result_time),
                )
            imported += 1

    return {"imported": imported, "skipped": skipped, "total": len(rows)}
