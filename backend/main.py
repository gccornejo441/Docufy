from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Form
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Dict, List, Optional, Tuple
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import logging, sys
import fitz  # PyMuPDF

from docufy_ocr import __version__ as docuocr_version, DocuOCR

# ---------- logging setup ----------
logger = logging.getLogger("docuocr.api")
logger.setLevel(logging.INFO)
if not logger.handlers:
    h = logging.StreamHandler(sys.stdout)
    h.setFormatter(logging.Formatter("%(levelname)s %(asctime)s [%(name)s] %(message)s"))
    logger.addHandler(h)
logger.propagate = False
# -----------------------------------

app = FastAPI(title="DocuOCR Text Extraction API", version="1.0.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _make_ocr(dpi: Optional[int] = None, lang: Optional[str] = None) -> DocuOCR:
    kwargs = {}
    if dpi is not None:
        kwargs["dpi"] = dpi
    if lang is not None:
        kwargs["lang"] = lang
    ocr = DocuOCR(**kwargs) if kwargs else DocuOCR()
    logger.info("OCR init: dpi=%s lang=%s", getattr(ocr, "dpi", None), getattr(ocr, "lang", None))
    return ocr


class ExtractResponse(BaseModel):
    filename: str
    text: str
    words: List[Dict[str, Any]]
    metadata: Dict[str, Any]


class RegionExtractResponse(ExtractResponse):
    page: int
    rect_norm: Dict[str, float]


def _save_to_temp(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "upload").suffix
    tmp = NamedTemporaryFile(delete=False, suffix=suffix)
    with tmp as f:
        shutil.copyfileobj(upload.file, f)
    return Path(tmp.name)


def _cleanup(paths: List[Path]) -> None:
    for p in paths:
        try:
            os.remove(p)
        except Exception:
            pass


@app.get("/health", response_class=PlainTextResponse)
def health() -> str:
    return "ok"


@app.get("/version")
def version() -> Dict[str, str]:
    return {"service": app.version, "docuocr": docuocr_version}


@app.post("/extract", response_model=ExtractResponse)
async def extract_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF file"),
    dpi: Optional[int] = None,
    lang: Optional[str] = None,
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    logger.info("POST /extract file=%s dpi=%s lang=%s", file.filename, dpi, lang)

    tmp_path = _save_to_temp(file)
    background_tasks.add_task(_cleanup, [tmp_path])
    try:
        size = os.path.getsize(tmp_path)
        logger.info("Saved temp PDF: %s (%d bytes)", tmp_path, size)
    except Exception:
        logger.info("Saved temp PDF: %s", tmp_path)

    try:
        ocr = _make_ocr(dpi=dpi, lang=lang)
        text, words = ocr.process_pdf(tmp_path)
        preview = (text or "").strip().replace("\n", " ")[:200]
        logger.info(
            "Extract result: text_len=%d words_pages=%d preview=%r",
            len(text or ""), len(words or []), preview
        )
        return ExtractResponse(
            filename=file.filename,
            text=text,
            words=words,
            metadata={"docuocr_version": docuocr_version, "dpi": ocr.dpi, "lang": ocr.lang},
        )
    except Exception as e:
        logger.exception("OCR failed")
        raise HTTPException(status_code=500, detail=f"OCR failed: {e}")


@app.post("/extract/multi")
async def extract_multiple(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="Multiple PDFs"),
    dpi: Optional[int] = None,
    lang: Optional[str] = None,
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")
    logger.info("POST /extract/multi count=%d dpi=%s lang=%s", len(files), dpi, lang)

    tmp_paths: List[Path] = []
    try:
        for f in files:
            p = _save_to_temp(f)
            tmp_paths.append(p)
            try:
                size = os.path.getsize(p)
                logger.info("Saved temp PDF: %s (%d bytes) file=%s", p, size, f.filename)
            except Exception:
                logger.info("Saved temp PDF: %s file=%s", p, f.filename)

        background_tasks.add_task(_cleanup, tmp_paths)

        results = []
        for f, p in zip(files, tmp_paths):
            try:
                ocr = _make_ocr(dpi=dpi, lang=lang)
                text, words = ocr.process_pdf(p)
                preview = (text or "").strip().replace("\n", " ")[:140]
                logger.info(
                    "Extract item: file=%s text_len=%d words_pages=%d preview=%r",
                    f.filename, len(text or ""), len(words or []), preview
                )
                results.append(
                    {
                        "filename": f.filename,
                        "text": text,
                        "words": words,
                        "metadata": {
                            "docuocr_version": docuocr_version,
                            "dpi": ocr.dpi,
                            "lang": ocr.lang
                        },
                        "error": None,
                    }
                )
            except Exception as e:
                logger.exception("Item OCR failed file=%s", f.filename)
                results.append(
                    {
                        "filename": f.filename,
                        "text": "",
                        "words": [],
                        "metadata": {"docuocr_version": docuocr_version},
                        "error": str(e),
                    }
                )
        return results
    except Exception as e:
        logger.exception("Batch OCR failed")
        _cleanup(tmp_paths)
        raise HTTPException(status_code=500, detail=f"Batch OCR failed: {e}")


# ---------- Debug helpers for /extract/region ----------
def _map_rect_variant(
    x: float, y: float, w: float, h: float, rotation: int, swapped: bool
) -> Tuple[float, float, float, float]:
    rotation = rotation % 360
    corners = [(x, y), (x + w, y), (x, y + h), (x + w, y + h)]

    def clamp01(v: float) -> float:
        return 0.0 if v < 0 else 1.0 if v > 1 else v

    def inv_map(px: float, py: float) -> Tuple[float, float]:
        if rotation == 0:
            return px, py
        if rotation == 90:
            return (py, 1.0 - px) if not swapped else (1.0 - py, px)
        if rotation == 180:
            return (1.0 - px, 1.0 - py)
        if rotation == 270:
            return (1.0 - py, px) if not swapped else (py, 1.0 - px)
        return px, py

    mapped = [inv_map(px, py) for (px, py) in corners]
    xs = [clamp01(mx) for mx, _ in mapped]
    ys = [clamp01(my) for _, my in mapped]
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)
    return x0, y0, max(0.0, x1 - x0), max(0.0, y1 - y0)


def _save_region_debug_png(
    pdf_path: Path,
    page_num_1based: int,
    rect_norm_view: Tuple[float, float, float, float],
    rotation: int,
    dpi: int,
    swapped: bool,
) -> Path:
    x, y, w, h = rect_norm_view
    with fitz.open(pdf_path) as doc:
        page = doc[page_num_1based - 1]
        xr, yr, wr, hr = _map_rect_variant(x, y, w, h, rotation, swapped=swapped)
        pr = page.rect
        clip = fitz.Rect(
            pr.x0 + xr * pr.width,
            pr.y0 + yr * pr.height,
            pr.x0 + (xr + wr) * pr.width,
            pr.y0 + (yr + hr) * pr.height,
        )
        mat = fitz.Matrix((dpi or 360) / 72.0, (dpi or 360) / 72.0)
        pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
        out = Path(NamedTemporaryFile(delete=False, suffix=("_B.png" if swapped else "_A.png")).name)
        pix.save(out.as_posix())
        logger.info(
            "DEBUG crop %s: %s (%dx%d)", "B(swapped)" if swapped else "A",
            out, pix.width, pix.height
        )
        return out
# ------------------------------------------------------


@app.post("/extract/region", response_model=RegionExtractResponse)
async def extract_region(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF file"),
    page: int = Form(..., description="1-based page number"),
    x: float = Form(..., description="Normalized left (0-1) in rotated view"),
    y: float = Form(..., description="Normalized top (0-1) in rotated view"),
    w: float = Form(..., description="Normalized width (0-1) in rotated view"),
    h: float = Form(..., description="Normalized height (0-1) in rotated view"),
    rotation: int = Form(0, description="Rotation applied in viewer (0,90,180,270)"),
    dpi: Optional[int] = Form(None),
    lang: Optional[str] = Form(None),
    debug: int = Form(0),  # set to 1 to save debug crops A/B
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    logger.info(
        "POST /extract/region file=%s page=%s x=%.4f y=%.4f w=%.4f h=%.4f rotation=%s dpi=%s lang=%s debug=%s",
        file.filename, page, x, y, w, h, rotation, dpi, lang, debug,
    )

    if w <= 0 or h <= 0:
        logger.warning("Rejecting zero-area selection: w=%.6f h=%.6f", w, h)
        raise HTTPException(status_code=400, detail="Selection has zero area.")

    tmp_pdf = _save_to_temp(file)
    background_tasks.add_task(_cleanup, [tmp_pdf])
    try:
        size = os.path.getsize(tmp_pdf)
        logger.info("Saved temp PDF: %s (%d bytes)", tmp_pdf, size)
    except Exception:
        logger.info("Saved temp PDF: %s", tmp_pdf)

    # optional debug: write A/B crops to temp so you can eyeball mapping
    if debug:
        try:
            a = _save_region_debug_png(tmp_pdf, page, (x, y, w, h), rotation, (dpi or 360), swapped=False)
            b = _save_region_debug_png(tmp_pdf, page, (x, y, w, h), rotation, (dpi or 360), swapped=True)
            logger.info("DEBUG crops written: A=%s  B=%s", a, b)
        except Exception:
            logger.exception("Failed creating debug crops")

    try:
        ocr = _make_ocr(dpi=dpi, lang=lang)
        text, words = ocr.process_pdf_region(
            tmp_pdf,
            page_number=page,
            rect_norm_view=(x, y, w, h),
            rotation_view=rotation,
        )
        word_count = len(words or [])
        preview = (text or "").strip().replace("\n", " ")[:200]
        logger.info(
            "Region result: text_len=%d words=%d rotation_used=%d preview=%r",
            len(text or ""), word_count, rotation % 360, preview
        )

        return RegionExtractResponse(
            filename=file.filename,
            text=text,
            words=words,
            metadata={
                "docuocr_version": docuocr_version,
                "dpi": getattr(ocr, "dpi", dpi),
                "lang": getattr(ocr, "lang", lang),
                "rotation_view": rotation % 360,
            },
            page=page,
            rect_norm={"x": x, "y": y, "w": w, "h": h},
        )
    except ValueError as ve:
        logger.warning("Bad request on /extract/region: %s", ve)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Region OCR failed")
        raise HTTPException(status_code=500, detail=f"Region OCR failed: {e}")
