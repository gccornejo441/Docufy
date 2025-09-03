from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .watch import start_watch, stop_watch, active_watches

router = APIRouter(prefix="/watch", tags=["watch"])


class StartWatchRequest(BaseModel):
    folder: str = Field(..., description="Absolute server-side path to watch")
    # Either provide a recipe id (resolved via recipes dir) or a full path to a recipe file
    recipe_id: str | None = Field(
        None, description="Recipe id (e.g., invoices_v2)")
    recipe_path: str | None = Field(
        None, description="Full path to recipe JSON")
    # Optional per-watcher output directory override
    out_dir: str | None = Field(
        None, description="Override output dir for this watcher")


class StopWatchRequest(BaseModel):
    key: str = Field(...,
                     description="Key returned by /watch/start or shown in /watch/status")


@router.post("/start")
def start(req: StartWatchRequest):
    if not (req.recipe_id or req.recipe_path):
        raise HTTPException(
            status_code=400, detail="Provide recipe_id or recipe_path")

    recipe_ref = req.recipe_path or req.recipe_id  # prefer explicit path if supplied
    key = f"{req.folder}|{recipe_ref}"

    if key in active_watches().keys():
        return {"status": "already_watching", "key": key}
    try:
        start_watch(req.folder, recipe_ref, key, out_dir=req.out_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "watching", "key": key}


@router.post("/stop")
def stop(req: StopWatchRequest):
    if req.key not in active_watches().keys():
        return {"status": "not_active"}
    stop_watch(req.key)
    return {"status": "stopped", "key": req.key}


@router.get("/status")
def status():
    # return array of keys like: ["C:\\Scans\\Invoices|invoices_v2", "..."]
    return {"active": list(active_watches().keys())}
