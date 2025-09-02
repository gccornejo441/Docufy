# sharepoint.py
from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse
import io
import os
import logging
import base64
import json
from typing import Dict, List, Any

import httpx
import msal
from fastapi import APIRouter, Header, HTTPException, Query
from starlette.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/connectors/sharepoint", tags=["sharepoint"])

# ---------------------------------------------------------------------------
# Env / .env loading (optional)
# ---------------------------------------------------------------------------
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

# OBO uses your API's delegated Graph permissions via .default
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
            raise HTTPException(status_code=500, detail=f"MSAL init failed: {e}")
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
    result = app.acquire_token_on_behalf_of(user_assertion=api_jwt, scopes=GRAPH_SCOPES)
    if "access_token" in result:
        return result["access_token"]
    err = result.get("error_description") or result.get("error") or "unknown_error"
    logger.error("OBO for Graph failed: %s", err)
    raise HTTPException(status_code=401, detail="Could not acquire Graph token (OBO failed)")


async def _graph_headers(api_jwt: str) -> Dict[str, str]:
    graph_token = await _get_graph_token_from_api_token(api_jwt)
    return {"Authorization": f"Bearer {graph_token}"}


def _shape_item(it: dict, drive_id: str | None = None) -> dict:
    """Normalize Graph driveItem into the lean shape the UI expects."""
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
        "driveId": drive_id or ((it.get("parentReference") or {}).get("driveId")),
    }


# --- JWT debug helpers ------------------------------------------------------

def _b64url_decode(s: str) -> bytes:
    s += "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s.encode())


def _decode_jwt_noverify(token: str) -> dict:
    try:
        h, p, _ = token.split(".")
        return {"header": json.loads(_b64url_decode(h)), "payload": json.loads(_b64url_decode(p))}
    except Exception as e:
        return {"error": str(e), "payload": {}}


# ---------------------------------------------------------------------------
# Capability probes
# ---------------------------------------------------------------------------

def _is_spo_unlicensed_text(txt: str | None) -> bool:
    """Detect classic Graph error when SharePoint Online isn't licensed for the tenant."""
    if not txt:
        return False
    t = txt.lower()
    return (
        "tenant does not have a spo license" in t
        or ("spo" in t and "license" in t)
        or ("sharepoint" in t and "license" in t)
    )

async def _probe_capabilities(headers: Dict[str, str]) -> dict:
    """
    Detect SharePoint licensing via:
      - sites/root (service reachable) OR
      - /me/licenseDetails (plan has SharePoint/OneDrive and provisioningStatus Success)
    Detect OneDrive by /me/drive.
    """
    base = "https://graph.microsoft.com/v1.0"
    spo_licensed = False
    one_drive_available = False

    async with httpx.AsyncClient(timeout=40) as client:
        # A) Check service reachability (root site)
        site = await client.get(f"{base}/sites/root", headers=headers)
        if site.status_code < 400:
            spo_licensed = True
        else:
            txt = site.text
            # Only mark unlicensed if the error explicitly says so.
            if _is_spo_unlicensed_text(txt):
                spo_licensed = False
            else:
                # B) Fall back to license details of the current user
                lic = await client.get(f"{base}/me/licenseDetails", headers=headers)
                if lic.status_code < 400:
                    for d in lic.json().get("value", []):
                        for sp in d.get("servicePlans", []):
                            name = (sp.get("servicePlanName") or "").upper()
                            status = (sp.get("provisioningStatus") or "").upper()
                            # Common plan names: SHAREPOINTSTANDARD, SHAREPOINTENTERPRISE, ONEDRIVEENTERPRISE
                            if ("SHAREPOINT" in name or "ONEDRIVE" in name) and status == "SUCCESS":
                                spo_licensed = True
                                break
                        if spo_licensed:
                            break
                else:
                    # If we can't read license details, assume licensed unless text says otherwise
                    if not _is_spo_unlicensed_text(lic.text):
                        spo_licensed = True

        # OneDrive availability is independent
        me_drive = await client.get(f"{base}/me/drive", headers=headers)
        if me_drive.status_code < 400:
            one_drive_available = True

    return {"spoLicensed": spo_licensed, "oneDriveAvailable": one_drive_available}


# For Graph sites search (required header)
CONSISTENT = {"ConsistencyLevel": "eventual", "Prefer": "HonorNonIndexedQueriesWarning=true"}


# ---------------------------------------------------------------------------
# SharePoint-only helpers (sites → drives)
# ---------------------------------------------------------------------------

async def _list_site_drives(headers: Dict[str, str], limit_sites: int = 10, limit_drives: int = 5) -> List[dict]:
    """
    Return virtual folders for SharePoint document libraries (drives).
    1) Root site libraries (most tenants have these)
    2) Other sites' libraries via search (requires ConsistencyLevel header)
    """
    base = "https://graph.microsoft.com/v1.0"
    rows: List[dict] = []
    async with httpx.AsyncClient(timeout=40) as client:
        # ---- (A) Root site drives ----
        root = await client.get(f"{base}/sites/root", headers=headers)
        if root.status_code < 400:
            root_id = root.json().get("id")
            root_name = root.json().get("name") or root.json().get("displayName") or "Site"
            if root_id:
                drv = await client.get(f"{base}/sites/{root_id}/drives", headers=headers)
                if drv.status_code < 400:
                    for d in (drv.json().get("value") or [])[:limit_drives]:
                        rows.append(
                            {
                                "id": "root",
                                "name": f"{root_name} / {d.get('name') or 'Documents'}",
                                "size": None,
                                "lastModifiedDateTime": None,
                                "webUrl": d.get("webUrl"),
                                "isFolder": True,
                                "isFile": False,
                                "mimeType": None,
                                "driveId": d.get("id"),
                            }
                        )
                else:
                    logger.warning("root drives failed: %s", drv.text)
        elif _is_spo_unlicensed_text(root.text):
            logger.info("_list_site_drives: SPO unlicensed; returning []")
            return []

        if rows:
            return rows

        # ---- (B) Other sites (best-effort) ----
        sites = await client.get(f"{base}/sites?search=*",
                                 headers={**headers, **CONSISTENT})
        if sites.status_code >= 400:
            if _is_spo_unlicensed_text(sites.text):
                logger.info("SPO unlicensed (sites search); returning []")
                return []
            logger.warning("sites?search failed: %s", sites.text)
            return rows  # empty, but not fatal

        for s in (sites.json().get("value") or [])[:limit_sites]:
            site_id = s.get("id")
            site_name = s.get("name") or s.get("displayName") or "Site"
            if not site_id:
                continue
            drv = await client.get(f"{base}/sites/{site_id}/drives", headers=headers)
            if drv.status_code >= 400:
                logger.warning("drives for site %s failed: %s", site_id, drv.text)
                continue
            for d in (drv.json().get("value") or [])[:limit_drives]:
                rows.append(
                    {
                        "id": "root",
                        "name": f"{site_name} / {d.get('name') or 'Documents'}",
                        "size": None,
                        "lastModifiedDateTime": None,
                        "webUrl": d.get("webUrl"),
                        "isFolder": True,
                        "isFile": False,
                        "mimeType": None,
                        "driveId": d.get("id"),
                    }
                )

    return rows


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/status")
async def status(authorization: str = Header(None)):
    """
    Connectivity/status probe. Tries OBO; returns connected plus SPO/OneDrive capability flags.
    """
    api_jwt = _bearer_from_header(authorization)
    headers = await _graph_headers(api_jwt)
    caps = await _probe_capabilities(headers)
    return {"connected": True, **caps}


@router.post("/connect")
async def connect(authorization: str = Header(None)):
    """
    No-op 'connect' endpoint for UI. Validates OBO exchange and returns success + capabilities.
    """
    api_jwt = _bearer_from_header(authorization)
    headers = await _graph_headers(api_jwt)
    caps = await _probe_capabilities(headers)
    return {"connected": True, **caps, "message": "SharePoint connection validated."}


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
    - If driveId is provided -> list items within that SharePoint document library.
    - If driveId is omitted -> try OneDrive (me/drive). If unavailable, fall back to SharePoint sites' drives.
    """
    api_jwt = _bearer_from_header(authorization)
    headers = await _graph_headers(api_jwt)
    base = "https://graph.microsoft.com/v1.0"

    # Branch 1: Given a driveId (SharePoint library) — straightforward
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
                    logger.info("/children: SPO unlicensed (driveId=%s); returning []", driveId)
                    return []
                logger.warning("/children driveId request failed: %s", res.text)
                raise HTTPException(status_code=res.status_code, detail=res.text)
            items = res.json().get("value", [])
            return [_shape_item(it, drive_id=driveId) for it in items]

    # Branch 2: No driveId — try OneDrive; if not available, list SharePoint site drives
    url = f"{base}/me/drive/root/children" if itemId == "root" else f"{base}/me/drive/items/{itemId}/children"
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get(url, headers=headers)
        if res.status_code in (400, 404) and itemId == "root":
            # OneDrive not provisioned — SharePoint fallback
            try:
                return await _list_site_drives(headers)
            except HTTPException as he:
                if he.status_code >= 400:
                    logger.info("/children: fallback to site drives failed: %s", he.detail)
                return []

        if res.status_code >= 400:
            if _is_spo_unlicensed_text(res.text):
                logger.info("/children: SPO unlicensed on me/drive; returning []")
                return []
            logger.warning("/children me/drive request failed: %s", res.text)
            raise HTTPException(status_code=res.status_code, detail=res.text)

        items = res.json().get("value", [])
        # If OneDrive root is empty, offer sites instead of a blank list
        if itemId == "root" and not items:
            try:
                return await _list_site_drives(headers)
            except HTTPException:
                return []
        return [_shape_item(it) for it in items]


@router.get("/list")
async def list_recent_or_search(
    query: str | None = None,
    authorization: str | None = Header(None),
):
    """
    Search/browse without using Microsoft Search (/search/query).

    If query is provided:
      1) Try OneDrive per-drive search:   GET /me/drive/root/search(q='{q}')
      2) If empty/unavailable, search each SharePoint library drive returned by
         _list_site_drives():             GET /drives/{driveId}/root/search(q='{q}')

    If no query:
      - Try OneDrive 'recent'; if unavailable or empty, fall back to SharePoint site drives.
    """
    api_jwt = _bearer_from_header(authorization)
    headers = await _graph_headers(api_jwt)
    base = "https://graph.microsoft.com/v1.0"

    # ------------------- SEARCH PATH (no Microsoft Search dependency) -------------------
    if query:
        out: List[dict] = []
        async with httpx.AsyncClient(timeout=40) as client:
            # (1) OneDrive search (if provisioned)
            r = await client.get(f"{base}/me/drive/root/search(q='{query}')", headers=headers)
            if r.status_code < 400:
                for it in r.json().get("value", []):
                    out.append(_shape_item(it))

            # (2) If nothing found or OneDrive not available, search SharePoint libraries
            if not out:
                drives = await _list_site_drives(headers, limit_sites=20, limit_drives=10)
                for d in drives:
                    did = d.get("driveId")
                    if not did:
                        continue
                    sr = await client.get(f"{base}/drives/{did}/root/search(q='{query}')", headers=headers)
                    if sr.status_code >= 400:
                        # skip drives we can't search due to permissions/policies
                        continue
                    for it in sr.json().get("value", []):
                        out.append(_shape_item(it, drive_id=did))

        return out

    # ------------------- NO-QUERY PATH (browse) -------------------
    async with httpx.AsyncClient(timeout=40) as client:
        res = await client.get(f"{base}/me/drive/recent", headers=headers)
        if res.status_code in (400, 404):
            # OneDrive not available → SharePoint site libraries
            try:
                return await _list_site_drives(headers)
            except HTTPException as he:
                if he.status_code >= 400:
                    logger.info("/list recent fallback to site drives failed: %s", he.detail)
                return []

        if res.status_code >= 400:
            if _is_spo_unlicensed_text(res.text):
                logger.info("/list recent: SPO unlicensed; returning []")
                return []
            logger.warning("/list recent failed: %s", res.text)
            raise HTTPException(status_code=res.status_code, detail=res.text)

        items = res.json().get("value", [])
        if not items:
            # No recent files; show SharePoint site libraries so the picker isn't empty
            try:
                return await _list_site_drives(headers)
            except HTTPException:
                return []

        # 'recent' returns files (driveItems)
        return [_shape_item(it) for it in items if it.get("file") or it.get("folder")]


@router.get("/download/{item_id}")
async def download_item(
    item_id: str,
    authorization: str = Header(None),
    driveId: str | None = Query(None),
):
    """
    Download file bytes for a specific drive item.
    - If driveId is provided -> /drives/{driveId}/items/{item_id}/content (site library or OneDrive).
    - Else -> /me/drive/items/{item_id}/content (works only for OneDrive items).
    """
    api_jwt = _bearer_from_header(authorization)
    headers = await _graph_headers(api_jwt)

    base = "https://graph.microsoft.com/v1.0"
    url = (
        f"{base}/drives/{driveId}/items/{item_id}/content"
        if driveId
        else f"{base}/me/drive/items/{item_id}/content"
    )

    async with httpx.AsyncClient(follow_redirects=True, timeout=None) as client:
        res = await client.get(url, headers=headers)
        if res.status_code >= 400:
            # If caller forgot driveId for a site item, explain what's needed
            if not driveId and res.status_code in (400, 404):
                raise HTTPException(
                    status_code=400,
                    detail="Download failed. This item is not in your personal OneDrive. Re-try with its driveId.",
                )
            logger.warning("/download failed: %s", res.text)
            raise HTTPException(status_code=res.status_code, detail=res.text)

        content_type = res.headers.get("Content-Type", "application/octet-stream")
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
# Debug endpoint to verify tenant/user context, licensing, and Graph behavior
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
    if (not raw_auth) and os.getenv("DEBUG_ALLOW_TOKEN_QUERY") == "1" and access_token:
        raw_auth = f"Bearer {access_token}"

    api_jwt = _bearer_from_header(raw_auth)
    api_claims = _decode_jwt_noverify(api_jwt).get("payload", {})

    graph_token = await _get_graph_token_from_api_token(api_jwt)
    graph_claims = _decode_jwt_noverify(graph_token).get("payload", {})
    headers = {"Authorization": f"Bearer {graph_token}"}

    base = "https://graph.microsoft.com/v1.0"
    out: Dict[str, Any] = {
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
        out["me"] = {"status": me.status_code, "body": me.json() if me.status_code < 400 else me.text}

        me_drive = await client.get(f"{base}/me/drive", headers=headers)
        out["me_drive"] = {"status": me_drive.status_code, "body": me_drive.json() if me_drive.status_code < 400 else me.text}

        me_drives = await client.get(f"{base}/me/drives", headers=headers)
        out["me_drives"] = {
            "status": me_drives.status_code,
            "body": me_drives.json().get("value", []) if me_drives.status_code < 400 else me_drives.text,
        }

        org = await client.get(f"{base}/organization?$select=id,displayName", headers=headers)
        out["organization"] = {"status": org.status_code, "body": org.json() if org.status_code < 400 else org.text}

        # License/service plans for the signed-in user (helps confirm SharePoint/OneDrive)
        lic = await client.get(f"{base}/me/licenseDetails", headers=headers)
        out["licenseDetails"] = {
            "status": lic.status_code,
            "plans": [
                {
                    "skuPartNumber": d.get("skuPartNumber"),
                    "servicePlans": [
                        {"name": sp.get("servicePlanName"), "status": sp.get("provisioningStatus")}
                        for sp in (d.get("servicePlans") or [])
                    ],
                }
                for d in (lic.json().get("value", []) if lic.status_code < 400 else [])
            ] if lic.status_code < 400 else lic.text,
        }

    return out
