from fastapi import APIRouter, UploadFile, File, Header, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, AnyHttpUrl
from pathlib import Path
from typing import Optional, Dict, Any
from uuid import uuid4
import tempfile, os, httpx, json, logging, asyncio

from docufy_ocr import __version__ as docuocr_version, DocuOCR

router = APIRouter(tags=["webhook"])

JOBS: Dict[str, Dict[str, Any]] = {}

logger = logging.getLogger("docuocr.webhook")
API_KEY = os.getenv("DOCUFY_API_KEY")             
OUTBOUND_SECRET = os.getenv("DOCUFY_OUTBOUND_SECRET", "")  

class OcrWebhookJson(BaseModel):
    fileUrl: Optional[AnyHttpUrl] = None
    callbackUrl: Optional[AnyHttpUrl] = None
    language: Optional[str] = None
    dpi: Optional[int] = None
    correlationId: Optional[str] = None 

def _require_api_key(inbound: Optional[str]):
    if API_KEY and inbound != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

def _make_ocr(dpi: Optional[int], lang: Optional[str]) -> DocuOCR:
    kwargs = {}
    if dpi is not None: kwargs["dpi"] = dpi
    if lang is not None: kwargs["lang"] = lang
    return DocuOCR(**kwargs) if kwargs else DocuOCR()

async def _download_to_tmp(url: str) -> str:
    fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(url, follow_redirects=True)
        r.raise_for_status()
        with open(tmp_path, "wb") as f:
            f.write(r.content)
    return tmp_path

async def _maybe_callback(callback_url: Optional[str], body: Dict[str, Any]):
    if not callback_url:
        return
    headers = {"Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            await client.post(str(callback_url), json=body, headers=headers)
    except Exception as e:
        logger.warning("callback failed: %s", e)

@router.post("/webhook/ocr", status_code=202)
async def webhook_ocr(
    background: BackgroundTasks,
    payload: Optional[OcrWebhookJson] = None,
    file: Optional[UploadFile] = File(default=None),
    x_docufy_key: Optional[str] = Header(default=None, alias="X-Docufy-Key"),
):
    """
    Accepts EITHER:
      - JSON with { fileUrl, callbackUrl?, dpi?, language?, correlationId? }
      - multipart/form-data with a 'file' plus optional fields (use JSON for options)
    Returns 202 with jobId and a Location for polling.
    """
    _require_api_key(x_docufy_key)

    tmp_path = None
    dpi = None
    lang = None
    callback = None
    correlation = None

    if file is not None:
        suffix = os.path.splitext(file.filename or "upload.bin")[1]
        fd, tmp_path = tempfile.mkstemp(suffix=suffix)
        with os.fdopen(fd, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)
    elif payload and payload.fileUrl:
        tmp_path = await _download_to_tmp(str(payload.fileUrl))
        dpi = payload.dpi
        lang = payload.language
        callback = str(payload.callbackUrl) if payload.callbackUrl else None
        correlation = payload.correlationId
    else:
        raise HTTPException(status_code=400, detail="Provide a 'file' or 'fileUrl'.")

    job_id = str(uuid4())
    JOBS[job_id] = {
        "status": "Queued",
        "fileId": f"f_{job_id}",
        "result": None,
        "error": None,
        "metadata": {"docuocr_version": docuocr_version, "dpi": dpi, "lang": lang},
    }

    async def run_job():
        JOBS[job_id]["status"] = "Running"
        try:
            ocr = _make_ocr(dpi, lang)
            text, words = ocr.process_pdf(Path(tmp_path))
            JOBS[job_id]["status"] = "Completed"
            JOBS[job_id]["result"] = {"text": text, "words": words}
            body = {
                "eventType": "ocr.completed",
                "jobId": job_id,
                "fileId": JOBS[job_id]["fileId"],
                "correlationId": correlation,
                "result": JOBS[job_id]["result"],
                "metadata": JOBS[job_id]["metadata"],
            }
            await _maybe_callback(callback, body)
        except Exception as e:
            logger.exception("OCR job failed")
            JOBS[job_id]["status"] = "Failed"
            JOBS[job_id]["error"] = {"message": str(e), "code": "OCR_ERROR"}
            body = {
                "eventType": "ocr.failed",
                "jobId": job_id,
                "fileId": JOBS[job_id]["fileId"],
                "correlationId": correlation,
                "error": JOBS[job_id]["error"],
            }
            await _maybe_callback(callback, body)
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    # run asynchronously
    background.add_task(run_job)

    return JSONResponse(
        {"jobId": job_id, "status": "Queued", "location": f"/webhook/jobs/{job_id}"},
        headers={"Location": f"/webhook/jobs/{job_id}"},
    )

@router.get("/webhook/jobs/{job_id}")
async def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Not found")
    return {"jobId": job_id, **job}
