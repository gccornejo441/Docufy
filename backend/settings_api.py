from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from pathlib import Path
from . import settings

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsModel(BaseModel):
    default_watch_folder: str
    default_recipe_id: str
    out_dir: str


@router.get("", response_model=SettingsModel)
def get_settings():
    return settings.get()


class UpdateSettingsModel(BaseModel):
    default_watch_folder: str | None = Field(None)
    default_recipe_id: str | None = Field(None)
    out_dir: str | None = Field(None)


@router.put("", response_model=SettingsModel)
def put_settings(req: UpdateSettingsModel):
    patch = req.model_dump(exclude_none=True)
    # Basic validation: must be absolute paths (Windows or POSIX)
    for key in ("default_watch_folder", "out_dir"):
        if key in patch:
            p = Path(patch[key])
            if not p.is_absolute():
                raise HTTPException(
                    status_code=400, detail=f"{key} must be an absolute path")
    cfg = settings.update(patch)
    return cfg
