from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import Thread, Event
from typing import Callable, Dict, Optional, Set

import hashlib
import queue
import time

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

# --- Configuration ---
ALLOWED_EXTS = {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff"}

# --- Internal state ---
_WORK_Q: "queue.Queue[Job]" = queue.Queue()
_OBSERVERS: Dict[str, Observer] = {}
_STOP = Event()
_SEEN_HASHES: Set[str] = set()


@dataclass
class Job:
    path: str
    # recipe_ref can be an id (resolved by recipes.py) or a full path to a JSON file
    recipe_ref: str
    sha1: str
    # Optional per-watcher output directory override; if None, global OUT_DIR is used
    out_dir: Optional[str] = None


def _file_is_stable(p: Path, wait_s: float = 1.5, checks: int = 2) -> bool:
    """Wait until file size stops changing to avoid partial reads."""
    last = -1
    stable = 0
    while stable < checks:
        sz = p.stat().st_size
        if sz == last:
            stable += 1
        else:
            stable = 0
            last = sz
        time.sleep(wait_s)
    return True


def _sha1(p: Path, chunk: int = 1024 * 1024) -> str:
    h = hashlib.sha1()
    with p.open("rb") as f:
        for b in iter(lambda: f.read(chunk), b""):
            h.update(b)
    return h.hexdigest()


class _InboxHandler(FileSystemEventHandler):
    def __init__(self, folder: Path, recipe_ref: str, out_dir: Optional[str]):
        self.folder = folder
        self.recipe_ref = recipe_ref
        self.out_dir = out_dir

    def _maybe_enqueue(self, path: str):
        p = Path(path)
        if not p.is_file():
            return
        if p.suffix.lower() not in ALLOWED_EXTS:
            return
        # Ignore temp/partial files
        if p.suffix.lower() in {".tmp", ".part"} or p.name.startswith("~$"):
            return
        if _file_is_stable(p):
            digest = _sha1(p)
            if digest in _SEEN_HASHES:
                return
            _SEEN_HASHES.add(digest)
            _WORK_Q.put(Job(path=str(p), recipe_ref=self.recipe_ref,
                        sha1=digest, out_dir=self.out_dir))

    # watchdog callbacks
    def on_created(self, event):  # type: ignore[override]
        self._maybe_enqueue(event.src_path)

    def on_moved(self, event):  # type: ignore[override]
        self._maybe_enqueue(getattr(event, "dest_path", event.src_path))


def start_watch(folder: str, recipe_ref: str, key: str, out_dir: Optional[str] = None):
    """
    Start watching 'folder' for new files. Each discovered file enqueues a Job with the
    given recipe_ref (id or path) and optional per-watcher out_dir override.
    """
    p = Path(folder)
    p.mkdir(parents=True, exist_ok=True)
    handler = _InboxHandler(p, recipe_ref, out_dir)
    obs = Observer()
    obs.schedule(handler, str(p), recursive=False)
    obs.start()
    _OBSERVERS[key] = obs


def stop_watch(key: str):
    obs = _OBSERVERS.pop(key, None)
    if obs:
        obs.stop()
        obs.join()


def stop_all_watches():
    for k in list(_OBSERVERS.keys()):
        stop_watch(k)


def active_watches() -> Dict[str, str]:
    """
    Returns a map of keys for active observers.
    Keys are of the form "<folder>|<recipe_ref>".
    """
    return {k: k for k in _OBSERVERS.keys()}


def worker_loop(
    process_func: Callable[[Path, str], dict | str],
    out_dir: str | Callable[[], str],
    move_original: bool = True,
):
    """
    Background worker that drains the queue and processes documents.
    - process_func(Path, recipe_ref) -> dict|str    (result is written as JSON)
    - out_dir: global/default output directory, or a callable getter.
    - Each Job may include job.out_dir to override the output directory per watcher.
    """
    while not _STOP.is_set():
        try:
            job: Job = _WORK_Q.get(timeout=0.5)
        except queue.Empty:
            continue

        src = Path(job.path)
        try:
            result = process_func(src, job.recipe_ref)

            out_root = job.out_dir or (
                out_dir() if callable(out_dir) else out_dir)
            out_root_path = Path(out_root)
            out_root_path.mkdir(parents=True, exist_ok=True)

            # Serialize JSON (no external deps)
            payload = result if isinstance(result, str) else __import__("json").dumps(
                result, ensure_ascii=False, indent=2
            )
            (out_root_path / (src.stem + ".json")
             ).write_text(payload, encoding="utf-8")

            if move_original:
                processed_dir = src.parent / "Processed"
                processed_dir.mkdir(exist_ok=True)
                dest = processed_dir / src.name
                i = 1
                while dest.exists():
                    dest = processed_dir / f"{src.stem} ({i}){src.suffix}"
                    i += 1
                src.replace(dest)

        except Exception as e:
            out_root = job.out_dir or (
                out_dir() if callable(out_dir) else out_dir)
            err_dir = Path(out_root) / "Errors"
            err_dir.mkdir(parents=True, exist_ok=True)
            (err_dir / (src.name + ".err.txt")).write_text(str(e), encoding="utf-8")
        finally:
            _WORK_Q.task_done()


def request_shutdown():
    _STOP.set()
    stop_all_watches()
