from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .recipes import RECIPES_DIR

router = APIRouter(prefix="/recipes", tags=["recipes"])

# ---------------- Presets ----------------


class Preset(TypedDict):
    id: str
    name: str
    summary: str
    use_on: List[str]
    works_best_when: List[str]
    content: Dict[str, Any]


PRESETS: List[Preset] = [
    {
        "id": "invoices_basic",
        "name": "Invoices (basic)",
        "summary": "Extract common invoice fields (number, date, total) and a line-items table.",
        "use_on": [
            "Business invoices (1–3 pages)",
            "Docs that include labels like “Invoice #”, “Date”, “Total”",
        ],
        "works_best_when": [
            "Good scan quality (≥ 300 DPI) and clear headings",
            "Single-column layout; tables with clear gridlines",
        ],
        "content": {
            "name": "Invoices (basic)",
            "language": "eng",
            "preprocess": {"dpi": 360, "deskew": True, "binarize": True},
            "zones": [
                {"id": "invoice_no", "type": "text", "anchor": "Invoice",
                    "offset": [120, 0], "w": 260, "h": 40, "regex": "[A-Z0-9-]+"},
                {"id": "date", "type": "date", "anchor": "Date", "offset": [
                    90, 0], "w": 180, "h": 40, "format": "MM/DD/YYYY"},
                {"id": "total", "type": "amount", "anchor": "Total",
                    "offset": [110, 0], "w": 200, "h": 50},
            ],
            "table": {"region_hint": "bottom-half", "columns": ["Description", "Qty", "Price", "Total"]},
            "hints": {"summary": "Reads invoice header fields and table.", "example": "Acme_Invoice_1234.pdf"},
        },
    },
    {
        "id": "receipts_simple",
        "name": "Receipts (thermal/basic)",
        "summary": "Pull merchant, date, subtotal, tax, and total from store receipts.",
        "use_on": [
            "Small, thermal paper receipts (grocery, fuel, retail)",
            "One-page photos or scans",
        ],
        "works_best_when": [
            "High-resolution photo or scan (≥ 350 DPI) and good contrast",
            "Straightened (deskewed) image",
        ],
        "content": {
            "name": "Receipts (simple)",
            "language": "eng",
            "preprocess": {"dpi": 400, "deskew": True, "binarize": True, "denoise": True},
            "zones": [
                {"id": "merchant", "type": "text", "anchor": "Store",
                    "offset": [80, 0], "w": 400, "h": 60},
                {"id": "date", "type": "date", "anchor": "Date", "offset": [
                    80, 0], "w": 200, "h": 40, "format": "MM/DD/YYYY"},
                {"id": "subtotal", "type": "amount", "anchor": "Subtotal",
                    "offset": [120, 0], "w": 160, "h": 40},
                {"id": "tax", "type": "amount", "anchor": "Tax",
                    "offset": [80, 0], "w": 160, "h": 40},
                {"id": "total", "type": "amount", "anchor": "Total",
                    "offset": [100, 0], "w": 180, "h": 50},
            ],
            "hints": {"summary": "Basic totals + merchant + date from small receipts.", "example": "Gas_Station_Receipt.jpg"},
        },
    },
    {
        "id": "id_card_front_us",
        "name": "ID card (US driver’s license, front)",
        "summary": "Capture ID number, name, and date of birth from the front side.",
        "use_on": ["US driver’s license (front) scans", "Flatbed scans or high-quality photos"],
        "works_best_when": ["≥ 400 DPI, no glare or shadows", "Cropped to the card edges"],
        "content": {
            "name": "ID card (US DL front)",
            "language": "eng",
            "preprocess": {"dpi": 400, "deskew": True, "binarize": True},
            "zones": [
                {"id": "id_number", "type": "text",
                    "regex": "[A-Z0-9]{5,}", "strategy": "regex-search"},
                {"id": "name", "type": "text", "anchor": "Name",
                    "offset": [80, 0], "w": 360, "h": 50},
                {"id": "dob", "type": "date", "anchor": "DOB", "offset": [
                    60, 0], "w": 200, "h": 40, "format": "MM/DD/YYYY"},
            ],
            "hints": {"summary": "Pulls basic identity fields.", "example": "DL_Front.png"},
        },
    },
    {
        "id": "bank_statement_cover",
        "name": "Bank statement (cover page)",
        "summary": "Pick up bank name, statement period, and ending balance from page 1.",
        "use_on": ["Monthly bank statements (PDF)", "First/summary page with ‘Statement Period’"],
        "works_best_when": ["Native PDFs or clean scans", "Standard statement headings present"],
        "content": {
            "name": "Bank statement (cover)",
            "language": "eng",
            "preprocess": {"dpi": 360, "deskew": True},
            "zones": [
                {"id": "bank_name", "type": "text", "anchor": "Bank",
                    "offset": [80, 0], "w": 400, "h": 60},
                {"id": "period", "type": "text", "anchor": "Statement Period",
                    "offset": [160, 0], "w": 340, "h": 40},
                {"id": "ending_balance", "type": "amount",
                    "anchor": "Ending balance", "offset": [180, 0], "w": 220, "h": 40},
            ],
            "hints": {"summary": "Cover-page key fields.", "example": "Statement_July.pdf"},
        },
    },
]

# --------------- Models -----------------


class RecipeIndexItem(BaseModel):
    id: str
    name: Optional[str] = None
    path: str
    updated_at: Optional[str] = None


class RecipeIndexResponse(BaseModel):
    items: List[RecipeIndexItem]


class CreateRecipeRequest(BaseModel):
    id: str = Field(..., description="Filename (without .json)")
    content: Dict[str, Any]


class UpdateRecipeRequest(BaseModel):
    content: Dict[str, Any]


ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def _path_for(id: str) -> Path:
    if not ID_RE.match(id):
        raise HTTPException(
            status_code=400, detail="Invalid id. Use letters, numbers, ., _, - (≤64).")
    return (RECIPES_DIR / f"{id}.json").resolve()


def _read_json(p: Path) -> Dict[str, Any]:
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid JSON in {p.name}: {e}")

# --------------- Presets FIRST (to avoid being caught by /{id}) -------------


@router.get("/presets")
def list_presets():
    return {"presets": PRESETS}


@router.post("/presets/{preset_id}")
def create_from_preset(preset_id: str, req: CreateRecipeRequest):
    preset = next((p for p in PRESETS if p["id"] == preset_id), None)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    RECIPES_DIR.mkdir(parents=True, exist_ok=True)
    p = _path_for(req.id)
    if p.exists():
        raise HTTPException(status_code=409, detail="Recipe id already exists")
    p.write_text(json.dumps(
        preset["content"], ensure_ascii=False, indent=2), encoding="utf-8")
    return {"status": "created", "id": req.id}

# ---------------- CRUD --------------------


@router.get("", response_model=RecipeIndexResponse)
def list_recipes():
    RECIPES_DIR.mkdir(parents=True, exist_ok=True)
    items: List[RecipeIndexItem] = []
    for p in sorted(RECIPES_DIR.glob("*.json")):
        name = None
        try:
            name = _read_json(p).get("name")
        except Exception:
            name = None
        mtime = datetime.fromtimestamp(
            p.stat().st_mtime).isoformat(timespec="seconds")
        items.append(RecipeIndexItem(id=p.stem, name=name,
                     path=str(p), updated_at=mtime))
    return RecipeIndexResponse(items=items)


@router.post("")
def create_recipe(req: CreateRecipeRequest):
    RECIPES_DIR.mkdir(parents=True, exist_ok=True)
    p = _path_for(req.id)
    if p.exists():
        raise HTTPException(status_code=409, detail="Recipe id already exists")
    p.write_text(json.dumps(req.content, ensure_ascii=False,
                 indent=2), encoding="utf-8")
    return {"status": "created", "id": req.id}


@router.get("/{id}")
def read_recipe(id: str):
    p = _path_for(id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return _read_json(p)


@router.put("/{id}")
def update_recipe(id: str, req: UpdateRecipeRequest):
    RECIPES_DIR.mkdir(parents=True, exist_ok=True)
    p = _path_for(id)
    p.write_text(json.dumps(req.content, ensure_ascii=False,
                 indent=2), encoding="utf-8")
    return {"status": "updated", "id": id}


@router.delete("/{id}")
def delete_recipe(id: str):
    p = _path_for(id)
    if not p.exists():
        return {"status": "not_found"}
    p.unlink()
    return {"status": "deleted", "id": id}
