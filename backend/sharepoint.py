from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse
import io
import os
import logging
import base64
import json
from typing import Dict

import httpx
import msal
from fastapi import APIRouter, Header, HTTPException, Query
from starlette.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/connectors/sharepoint", tags=["sharepoint"])

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env")
    load_dotenv()
except Exception:
    pass


# ---------------------------------------------------------------------------
# Azure AD / MSAL configuration
# ---------------------------------------------------------------------------

TENANT_ID = (os.getenv("AZURE_AD_TENANT_ID") or "").strip()
CLIENT_ID = (os.getenv("AZURE_AD_CLIENT_ID") or "").strip()
CLIENT_SECRET = (os.getenv("AZURE_AD_CLIENT_SECRET") or "").strip()
AUTHORITY_RAW = (os.getenv("AZURE_AD_AUTHORITY") or "").strip()


def _build_authority() -> str:
    """
    Produce a valid Microsoft Entra ID authority URL with a tenant segment.

    Priority:
      1) If AZURE_AD_AUTHORITY already includes a path (tenant), use as-is.
      2) If AZURE_AD_AUTHORITY is host-only, append TENANT_ID.
      3) Else build https://login.microsoftonline.com/{TENANT_ID}.
    """
    if AUTHORITY_RAW:
        u = urlparse(AUTHORITY_RAW)
        if u.scheme == "https" and u.netloc:
            path = (u.path or "").strip("/")
            if path:
                return AUTHORITY_RAW.rstrip("/")
            if TENANT_ID:
                return f"https://{u.netloc}/{TENANT_ID}"
    if TENANT_ID:
        return f"https://login.microsoftonline.com/{TENANT_ID}"
    raise RuntimeError(
        "Missing tenant. Set AZURE_AD_TENANT_ID or provide a full AZURE_AD_AUTHORITY like "
        "https://login.microsoftonline.com/<tenant-id-or-domain>"
    )


AUTHORITY = _build_authority()

if not (TENANT_ID and CLIENT_ID and CLIENT_SECRET):
    logger.warning(
        "SharePoint OBO config incomplete. Check AZURE_AD_TENANT_ID/CLIENT_ID/CLIENT_SECRET."
    )

# Use the app's own permissions to request a Graph token via OBO
GRAPH_SCOPES = ["https://graph.microsoft.com/.default"]

_MSAL_CLIENT: msal.ConfidentialClientApplication | None = None


def get_msal_client() -> msal.ConfidentialClientApplication:
    """Lazy-initialize a single MSAL ConfidentialClientApplication instance."""
    global _MSAL_CLIENT
    if _MSAL_CLIENT is None:
        try:
            _MSAL_CLIENT = msal.ConfidentialClientApplication(
                client_id=CLIENT_ID,
                client_credential=CLIENT_SECRET,
                authority=AUTHORITY,
            )
            logger.info("MSAL client initialized with authority=%s", AUTHORITY)
        except Exception as e:
            logger.exception(
                "Failed to initialize MSAL client with authority=%r", AUTHORITY
            )
            raise HTTPException(
                status_code=500, detail=f"MSAL init failed: {e}")
    return _MSAL_CLIENT


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _bearer_from_header(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header"
        )
    return authorization.split(" ", 1)[1].strip()


async def _get_graph_token_from_api_token(api_jwt: str) -> str:
    """
    On-Behalf-Of flow:
    Exchange the incoming API access token (issued by your API app registration)
    for a Graph access token using the app's confidential client.
    """
    app = get_msal_client()
    result = app.acquire_token_on_behalf_of(
        user_assertion=api_jwt, scopes=GRAPH_SCOPES
    )
    if "access_token" in result:
        return result["access_token"]
    err = result.get("error_description") or result.get(
        "error") or "unknown_error"
    logger.error("OBO for Graph failed: %s", err)
    raise HTTPException(
        status_code=401, detail="Could not acquire Graph token (OBO failed)"
    )


async def _graph_headers(api_jwt: str) -> Dict[str, str]:
    graph_token = await _get_graph_token_from_api_token(api_jwt)
    return {"Authorization": f"Bearer {graph_token}"}


def _shape_item(it: dict) -> dict:
    """Normalize Graph driveItem into a lean shape your UI expects."""
    is_file = bool(it.get("file"))
    is_folder = bool(it.get("folder"))
    return {
        "id": it.get("id"),
        "name": it.get("name"),
        "size": it.get("size"),
        "lastModifiedDateTime": it.get("lastModifiedDateTime"),
        "webUrl": it.get("webUrl"),
        "isFile": is_file,
        "isFolder": is_folder and not is_file,
        "mimeType": (it.get("file") or {}).get("mimeType"),
    }


# --- JWT debug helpers ------------------------------------------------------

def _b64url_decode(s: str) -> bytes:
    s += "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s.encode())


def _decode_jwt_noverify(token: str) -> dict:
    try:
        h, p, _ = token.split(".")
        return {
            "header": json.loads(_b64url_decode(h)),
            "payload": json.loads(_b64url_decode(p)),
        }
    except Exception as e:
        return {"error": str(e), "payload": {}}


# ---------------------------------------------------------------------------
# Additional capability helpers
# ---------------------------------------------------------------------------

def _is_spo_unlicensed_text(txt: str | None) -> bool:
    """Detects the classic Graph error when SharePoint Online isn't licensed for the tenant."""
    if not txt:
        return False
    t = txt.lower()
    return (
        "tenant does not have a spo license" in t
        or ("spo" in t and "license" in t)
        or ("sharepoint" in t and "license" in t)
    )


async def _probe_capabilities(headers: Dict[str, str]) -> dict:
    """Lightweight probe to report SPO/OneDrive availability for the UI."""
    base = "https://graph.microsoft.com/v1.0"
    spo_licensed = True
    one_drive_available = False

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get(f"{base}/me/drive", headers=headers)
        if res.status_code < 400:
            one_drive_available = True
        else:
            if _is_spo_unlicensed_text(res.text):
                spo_licensed = False

    return {"spoLicensed": spo_licensed, "oneDriveAvailable": one_drive_available}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/status")
async def status(authorization: str = Header(None)):
    """
    Connectivity/status probe. Tries OBO; returns connected plus SPO/OneDrive capability flags.
    """
    api_jwt = _bearer_from_header(authorization)
    await _get_graph_token_from_api_token(api_jwt)
    headers = await _graph_headers(api_jwt)
    caps = await _probe_capabilities(headers)
    return {"connected": True, **caps}


@router.post("/connect")
async def connect(authorization: str = Header(None)):
    """
    No-op 'connect' endpoint for UI. Validates OBO exchange and returns success + capabilities.
    """
    api_jwt = _bearer_from_header(authorization)
    await _get_graph_token_from_api_token(api_jwt)
    headers = await _graph_headers(api_jwt)
    caps = await _probe_capabilities(headers)
    return {
        "connected": True,
        **caps,
        "message": "SharePoint connection validated.",
    }


@router.post("/disconnect")
async def disconnect():
    """
    No server-side state to clear for OBO in this design; provided for UI symmetry.
    """
    return {
        "connected": False,
        "message": "Disconnected (client-side tokens/active account should be cleared in the front-end).",
    }


@router.get("/children")
async def list_children(
    itemId: str = Query("root"),
    driveId: str | None = Query(None),
    authorization: str | None = Header(None),
):
    """
    List the children of a folder.
    - If driveId is omitted -> uses the signed-in user's OneDrive (me/drive)
    - itemId='root' lists the root. Otherwise lists children of that item id.
    Fallbacks:
      * If me/drive root is not available, list drives (me/drives)
      * If the tenant lacks SharePoint Online (SPO) licensing, return [] gracefully
    """
    api_jwt = _bearer_from_header(authorization)
    headers = await _graph_headers(api_jwt)

    base = "https://graph.microsoft.com/v1.0"
    if driveId:
        url = (
            f"{base}/drives/{driveId}/root/children"
            if itemId == "root"
            else f"{base}/drives/{driveId}/items/{itemId}/children"
        )
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.get(url, headers=headers)
            if res.status_code >= 400:
                if _is_spo_unlicensed_text(res.text):
                    logger.info(
                        "/children: SPO unlicensed detected when using driveId=%s; returning []",
                        driveId,
                    )
                    return []
                logger.warning(
                    "/children driveId request failed: %s", res.text)
                raise HTTPException(
                    status_code=res.status_code, detail=res.text)
            items = res.json().get("value", [])
            return [
                {
                    "id": it.get("id"),
                    "name": it.get("name"),
                    "size": it.get("size"),
                    "lastModifiedDateTime": it.get("lastModifiedDateTime"),
                    "webUrl": it.get("webUrl"),
                    "isFolder": bool(it.get("folder")),
                    "isFile": bool(it.get("file")),
                    "mimeType": (it.get("file") or {}).get("mimeType"),
                    "driveId": driveId,
                }
                for it in items
            ]

    # No driveId: try the user's personal drive first
    url = (
        f"{base}/me/drive/root/children"
        if itemId == "root"
        else f"{base}/me/drive/items/{itemId}/children"
    )
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get(url, headers=headers)
        if res.status_code in (400, 404) and itemId == "root":
            # Fallback to listing drives when personal OneDrive isn't available
            drives = await client.get(f"{base}/me/drives", headers=headers)
            if drives.status_code >= 400:
                if _is_spo_unlicensed_text(drives.text):
                    logger.info(
                        "/children: SPO unlicensed on me/drives; returning []")
                    return []
                logger.warning(
                    "/children me/drives fallback failed: %s", drives.text)
                raise HTTPException(
                    status_code=drives.status_code, detail=drives.text)
            vals = drives.json().get("value", [])
            # Return "virtual folders" representing drives
            return [
                {
                    "id": "root",  # clicking this + driveId opens that drive's root
                    "name": d.get("name") or "Drive",
                    "size": None,
                    "lastModifiedDateTime": None,
                    "webUrl": None,
                    "isFolder": True,
                    "isFile": False,
                    "mimeType": None,
                    "driveId": d.get("id"),
                }
                for d in vals
            ]

        if res.status_code >= 400:
            if _is_spo_unlicensed_text(res.text):
                logger.info(
                    "/children: SPO unlicensed on me/drive; returning []")
                return []
            logger.warning("/children me/drive request failed: %s", res.text)
            raise HTTPException(status_code=res.status_code, detail=res.text)

    items = res.json().get("value", [])
    return [
        {
            "id": it.get("id"),
            "name": it.get("name"),
            "size": it.get("size"),
            "lastModifiedDateTime": it.get("lastModifiedDateTime"),
            "webUrl": it.get("webUrl"),
            "isFolder": bool(it.get("folder")),
            "isFile": bool(it.get("file")),
            "mimeType": (it.get("file") or {}).get("mimeType"),
            "driveId": None,
        }
        for it in items
    ]


@router.get("/list")
async def list_recent_or_search(
    query: str | None = None, authorization: str | None = Header(None)
):
    api_jwt = _bearer_from_header(authorization)
    headers = await _graph_headers(api_jwt)
    base = "https://graph.microsoft.com/v1.0"

    async with httpx.AsyncClient(timeout=30) as client:
        if query:
            url = f"{base}/me/drive/root/search(q='{query}')"
            res = await client.get(url, headers=headers)
            if res.status_code >= 400:
                if _is_spo_unlicensed_text(res.text):
                    logger.info("/list search: SPO unlicensed; returning []")
                    return []
                logger.warning("/list search failed: %s", res.text)
                raise HTTPException(
                    status_code=res.status_code, detail=res.text)
            items = res.json().get("value", [])
            return [
                {
                    "id": it.get("id"),
                    "name": it.get("name"),
                    "size": it.get("size"),
                    "lastModifiedDateTime": it.get("lastModifiedDateTime"),
                    "webUrl": it.get("webUrl"),
                    "mimeType": (it.get("file") or {}).get("mimeType"),
                    "isFile": bool(it.get("file")),
                    "isFolder": bool(it.get("folder")),
                    "driveId": None,
                }
                for it in items
                if it.get("file") or it.get("folder")
            ]

        # No query: try "recent", fall back to drives if needed
        res = await client.get(f"{base}/me/drive/recent", headers=headers)
        if res.status_code in (400, 404):
            drives = await client.get(f"{base}/me/drives", headers=headers)
            if drives.status_code >= 400:
                if _is_spo_unlicensed_text(drives.text):
                    logger.info(
                        "/list recent fallback to drives: SPO unlicensed; returning []"
                    )
                    return []
                logger.warning(
                    "/list me/drives fallback failed: %s", drives.text)
                raise HTTPException(
                    status_code=drives.status_code, detail=drives.text)
            vals = drives.json().get("value", [])
            return [
                {
                    "id": "root",
                    "name": d.get("name") or "Drive",
                    "isFile": False,
                    "isFolder": True,
                    "driveId": d.get("id"),
                }
                for d in vals
            ]

        if res.status_code >= 400:
            if _is_spo_unlicensed_text(res.text):
                logger.info("/list recent: SPO unlicensed; returning []")
                return []
            logger.warning("/list recent failed: %s", res.text)
            raise HTTPException(status_code=res.status_code, detail=res.text)

        items = res.json().get("value", [])
        # "recent" returns files only
        return [
            {
                "id": it.get("id"),
                "name": it.get("name"),
                "size": it.get("size"),
                "lastModifiedDateTime": it.get("lastModifiedDateTime"),
                "webUrl": it.get("webUrl"),
                "mimeType": (it.get("file") or {}).get("mimeType"),
                "isFile": bool(it.get("file")),
                "isFolder": False,
                "driveId": None,
            }
            for it in items
            if it.get("file")
        ]


@router.get("/download/{item_id}")
async def download_item(
    item_id: str,
    authorization: str = Header(None),
):
    """
    Download file bytes for a specific drive item id (me/drive/items/{id}/content).
    """
    api_jwt = _bearer_from_header(authorization)
    headers = await _graph_headers(api_jwt)

    url = f"https://graph.microsoft.com/v1.0/me/drive/items/{item_id}/content"
    async with httpx.AsyncClient(follow_redirects=True, timeout=None) as client:
        res = await client.get(url, headers=headers)
        if res.status_code >= 400:
            logger.warning("/download failed: %s", res.text)
            raise HTTPException(status_code=res.status_code, detail=res.text)

        content_type = res.headers.get(
            "Content-Type", "application/octet-stream")
        disp = res.headers.get("Content-Disposition", "")

        filename = "file"
        if "filename=" in disp:
            filename = disp.split("filename=", 1)[1].strip('"; ')
        elif "application/pdf" in content_type:
            filename = "document.pdf"

        return StreamingResponse(
            io.BytesIO(res.content),
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
# ---------------------------------------------------------------------------
# Debug endpoint to verify tenant/user context and Graph behavior
# ---------------------------------------------------------------------------
@router.get("/debug/whoami")
async def debug_whoami(
    authorization: str | None = Header(None),
    access_token: str | None = Query(None),
):
    """
    Returns decoded claims for the API token and Graph token, and probes Graph.

    DEV-ONLY: if DEBUG_ALLOW_TOKEN_QUERY=1 and Authorization is missing,
              the token can be passed as ?access_token=...
    """
    raw_auth = authorization
    # Dev-only override when header isn't easy to add
    if (not raw_auth) and os.getenv("DEBUG_ALLOW_TOKEN_QUERY") == "1" and access_token:
        raw_auth = f"Bearer {access_token}"

    # API access token (for your backend API)
    api_jwt = _bearer_from_header(raw_auth)
    api_claims = _decode_jwt_noverify(api_jwt).get("payload", {})

    # Acquire a Graph token via OBO and decode it
    graph_token = await _get_graph_token_from_api_token(api_jwt)
    graph_claims = _decode_jwt_noverify(graph_token).get("payload", {})
    headers = {"Authorization": f"Bearer {graph_token}"}

    base = "https://graph.microsoft.com/v1.0"
    out = {
        "apiToken": {
            "tid": api_claims.get("tid"),
            "upn": api_claims.get("upn") or api_claims.get("preferred_username"),
            "aud": api_claims.get("aud"),
            "iss": api_claims.get("iss"),
        },
        "graphToken": {
            "tid": graph_claims.get("tid"),
            "scp": graph_claims.get("scp"),
            "roles": graph_claims.get("roles"),
            "appId": graph_claims.get("appid"),
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        me = await client.get(f"{base}/me", headers=headers)
        out["me"] = {
            "status": me.status_code,
            "body": me.json() if me.status_code < 400 else me.text,
        }

        me_drive = await client.get(f"{base}/me/drive", headers=headers)
        out["me_drive"] = {
            "status": me_drive.status_code,
            "body": me_drive.json() if me_drive.status_code < 400 else me.text,
        }

        me_drives = await client.get(f"{base}/me/drives", headers=headers)
        out["me_drives"] = {
            "status": me_drives.status_code,
            "body": me_drives.json().get("value", [])
            if me_drives.status_code < 400
            else me_drives.text,
        }

        org = await client.get(
            f"{base}/organization?$select=id,displayName", headers=headers
        )
        out["organization"] = {
            "status": org.status_code,
            "body": org.json() if org.status_code < 400 else org.text,
        }

    return out
