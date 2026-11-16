"""AVIATOR NEON TRACKER — manual Aviator multiplier log.

No predictions, no automatic collection, no betting: only what the user types in,
stored in SQLite and exportable as a real ``.db`` file.
"""

from __future__ import annotations

import os
import tempfile
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import backend.db as db

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
MAX_IMPORT_BYTES = 64 * 1024 * 1024

app = FastAPI(title="Aviator Neon Tracker", version="1.0.0")


class ResultIn(BaseModel):
    multiplier: float | str
    result_date: str
    result_time: str


def _clean_multiplier(raw) -> float:
    if isinstance(raw, str):
        raw = raw.strip().lower().removesuffix("x").replace(",", ".")
    try:
        value = float(raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="invalid_multiplier")
    if value <= 0 or value > 100000:
        raise HTTPException(status_code=400, detail="invalid_multiplier")
    return round(value, 2)


def _clean_date(raw: str) -> str:
    try:
        return datetime.strptime(raw.strip(), "%Y-%m-%d").strftime("%Y-%m-%d")
    except (AttributeError, ValueError):
        raise HTTPException(status_code=400, detail="invalid_date")


def _clean_time(raw: str) -> str:
    try:
        return datetime.strptime(raw.strip(), "%H:%M:%S").strftime("%H:%M:%S")
    except (AttributeError, ValueError):
        raise HTTPException(status_code=400, detail="invalid_time")


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "results": db.count_results()}


@app.get("/api/results")
def get_results() -> list[dict]:
    return db.list_results()


@app.post("/api/results", status_code=201)
def create_result(payload: ResultIn) -> dict:
    return db.add_result(
        _clean_multiplier(payload.multiplier),
        _clean_date(payload.result_date),
        _clean_time(payload.result_time),
    )


@app.delete("/api/results/{result_id}")
def remove_result(result_id: int) -> dict:
    if not db.delete_result(result_id):
        raise HTTPException(status_code=404, detail="not_found")
    return {"deleted": result_id}


@app.get("/api/export")
def export_results() -> FileResponse:
    db.init_db()
    handle, path = tempfile.mkstemp(suffix=".db")
    os.close(handle)
    db.export_database(path)
    filename = f"aviator_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    return FileResponse(
        path,
        media_type="application/vnd.sqlite3",
        filename=filename,
        background=_CleanupBackground(path),
    )


@app.post("/api/import")
async def import_results(file: UploadFile = File(...)) -> dict:
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="empty_file")
    if len(contents) > MAX_IMPORT_BYTES:
        raise HTTPException(status_code=400, detail="file_too_large")

    handle, path = tempfile.mkstemp(suffix=".db")
    try:
        with os.fdopen(handle, "wb") as sink:
            sink.write(contents)
        try:
            return db.import_database(path)
        except db.InvalidDatabase as exc:
            raise HTTPException(status_code=400, detail=f"invalid_database: {exc}")
    finally:
        os.unlink(path)


class _CleanupBackground:
    """Delete the temporary export file once the response has been sent."""

    def __init__(self, path: str) -> None:
        self.path = path

    async def __call__(self) -> None:
        try:
            os.unlink(self.path)
        except OSError:
            pass


app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")
