from __future__ import annotations
from pathlib import Path
import json, threading, os

_CONFIG_PATH = Path(os.getenv("DOCUFY_CONFIG", Path(__file__).parent / "config.json")).resolve()
_LOCK = threading.Lock()
_DEFAULTS = {
    "default_watch_folder": "C:\\Docufy\\Inbox",
    "default_recipe_id": "default",
    "out_dir": str((Path(__file__).parent / "out").resolve()),
}

def _load():
    if _CONFIG_PATH.exists():
        with _CONFIG_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
            return {**_DEFAULTS, **data}
    return dict(_DEFAULTS)

def _save(cfg: dict):
    _CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _CONFIG_PATH.open("w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

def get() -> dict:
    with _LOCK:
        return _load()

def update(patch: dict) -> dict:
    with _LOCK:
        cfg = _load()
        for k in ("default_watch_folder", "default_recipe_id", "out_dir"):
            if k in patch and patch[k]:
                cfg[k] = patch[k]
        _save(cfg)
        return cfg

def get_out_dir() -> str:
    return get()["out_dir"]
