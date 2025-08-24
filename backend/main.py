from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Dict, List, Optional, Tuple
import os, shutil

from docufy_ocr import __version__ as docuocr_version, DocuOCR

app = FastAPI(title="DocuOCR Text Extraction API", version="1.0.0")

def _make_ocr(dpi: Optional[int] = None, lang: Optional[str] = None) -> DocuOCR:
    kwargs = {}
    if dpi is not None: kwargs["dpi"] = dpi
    if lang is not None: kwargs["lang"] = lang
    return DocuOCR(**kwargs) if kwargs else DocuOCR()

class ExtractResponse(BaseModel):
    filename: str
    text: str
    words: List[Dict[str, Any]]  
    metadata: Dict[str, Any]

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
    """
    Accepts a single **PDF** and runs DocuOCR.process_pdf().
    Returns raw text and word boxes per page.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    tmp_path = _save_to_temp(file)
    background_tasks.add_task(_cleanup, [tmp_path])

    try:
        ocr = _make_ocr(dpi=dpi, lang=lang)
        text, words = ocr.process_pdf(tmp_path)
        return ExtractResponse(
            filename=file.filename,
            text=text,
            words=words,
            metadata={"docuocr_version": docuocr_version, "dpi": ocr.dpi, "lang": ocr.lang},
        )
    except Exception as e:
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
    tmp_paths: List[Path] = []
    try:
        for f in files:
            tmp_paths.append(_save_to_temp(f))
        background_tasks.add_task(_cleanup, tmp_paths)

        results = []
        for f, p in zip(files, tmp_paths):
            try:
                ocr = _make_ocr(dpi=dpi, lang=lang)
                text, words = ocr.process_pdf(p)
                results.append(
                    {
                        "filename": f.filename,
                        "text": text,
                        "words": words,
                        "metadata": {"docuocr_version": docuocr_version, "dpi": ocr.dpi, "lang": ocr.lang},
                        "error": None,
                    }
                )
            except Exception as e:
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
        _cleanup(tmp_paths)
        raise HTTPException(status_code=500, detail=f"Batch OCR failed: {e}")
