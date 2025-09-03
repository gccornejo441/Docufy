from __future__ import annotations

from pathlib import Path
import json
import os

# Default recipes directory: backend/recipes
RECIPES_DIR = Path(os.getenv("DOCUFY_RECIPES_DIR", Path(
    __file__).parent / "recipes")).resolve()

# Optional: allow additional base directories for recipe files (semicolon-separated)
# Example: DOCUFY_RECIPES_ALLOW=C:\Shared\Recipes;\\fileserver\docufy\recipes
ALLOWED_BASES = [RECIPES_DIR] + [
    Path(p).resolve() for p in os.getenv("DOCUFY_RECIPES_ALLOW", "").split(";") if p.strip()
]


def _is_allowed(p: Path) -> bool:
    p = p.resolve()
    # Python 3.9 compatibility: emulate is_relative_to
    for base in ALLOWED_BASES:
        try:
            # Python 3.9+:
            if p.is_relative_to(base):  # type: ignore[attr-defined]
                return True
        except Exception:
            # Fallback
            if str(p).startswith(str(base)):
                return True
    return False


def resolve_recipe_path(recipe_ref: str) -> Path:
    """
    Resolve a recipe reference to a real file path.
    - If recipe_ref looks like a path (contains separators or ends with .json),
      treat it as a path (absolute or relative to CWD) and validate against allowed bases.
    - Otherwise, treat it as an id and look under RECIPES_DIR/{id}.json
    """
    p = Path(recipe_ref)

    looks_like_path = any(sep in recipe_ref for sep in (
        "/", "\\")) or p.suffix.lower() == ".json"
    if looks_like_path:
        p = p if p.is_absolute() else (Path.cwd() / p)
        if not _is_allowed(p):
            raise ValueError("Recipe path not allowed by server configuration")
        return p.resolve()

    # id mode
    return (RECIPES_DIR / f"{recipe_ref}.json").resolve()


def get_recipe(recipe_ref: str) -> dict | None:
    """
    Load a recipe JSON as dict, or return None if not found.
    """
    p = resolve_recipe_path(recipe_ref)
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))
