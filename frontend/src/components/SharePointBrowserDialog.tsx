import React from "react";
import {
    Search,
    Folder,
    FileText,
    ChevronRight,
    ChevronLeft,
    ExternalLink,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    Bug,
} from "lucide-react";
import DocumentViewerDialog from "./DocumentViewerDialog";
import Button from "./ui/Button";

type SpItem = {
    id: string;
    name: string;
    size?: number;
    lastModifiedDateTime?: string;
    webUrl?: string;
    isFile: boolean;
    isFolder?: boolean;
    driveId?: string; // present for “drive rows” returned by /list fallback
};

type Crumb = { id: string; name: string; driveId?: string };

type Caps = { spoLicensed: boolean; oneDriveAvailable: boolean };

type WhoAmI = {
    apiToken?: { tid?: string; aud?: string; upn?: string; iss?: string };
    graphToken?: { tid?: string; scp?: string; roles?: string[]; appId?: string };
    me?: { status: number; body: unknown };
    me_drive?: { status: number; body: unknown };
    me_drives?: { status: number; body: unknown };
    organization?: { status: number; body: unknown };
};

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    apiBase: string;
    getApiToken: () => Promise<string>;
    onPick: (file: File, meta: SpItem) => void;
};

function fmtSize(n?: number) {
    if (n == null) return "—";
    if (n < 1024) return `${n} B`;
    const k = 1024;
    const units = ["KB", "MB", "GB", "TB"];
    let i = -1;
    let v = n;
    do {
        v /= k;
        i++;
    } while (v >= k && i < units.length - 1);
    return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

function fmtDate(d?: string) {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleString();
    } catch {
        return d;
    }
}

export default function SharePointBrowserDialog({
    open,
    onOpenChange,
    apiBase,
    getApiToken,
    onPick,
}: Props) {
    const [items, setItems] = React.useState<SpItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [crumbs, setCrumbs] = React.useState<Crumb[]>([
        { id: "root", name: "My files" },
    ]);
    const [selected, setSelected] = React.useState<SpItem | null>(null);
    const [q, setQ] = React.useState("");
    const [caps, setCaps] = React.useState<Caps | null>(null);

    // Diagnostics (DEV helper)
    const [diagOpen, setDiagOpen] = React.useState(false);
    const [diagRunning, setDiagRunning] = React.useState(false);
    const [diag, setDiag] = React.useState<WhoAmI | null>(null);
    const [diagErr, setDiagErr] = React.useState<string | null>(null);

    const current = crumbs[crumbs.length - 1];
    const currentFolderId = current?.id || "root";
    const currentDriveId = current?.driveId;

    const disabledForTenant = caps?.spoLicensed === false;

    const loadCaps = React.useCallback(async () => {
        try {
            const token = await getApiToken();
            const res = await fetch(`${apiBase}/api/connectors/sharepoint/status`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: "include",
            });
            if (res.ok) {
                const json = (await res.json()) as {
                    spoLicensed?: boolean;
                    oneDriveAvailable?: boolean;
                };
                setCaps({
                    spoLicensed: !!json.spoLicensed,
                    oneDriveAvailable: !!json.oneDriveAvailable,
                });
            }
        } catch {
            // Non-fatal: leave caps null
        }
    }, [apiBase, getApiToken]);

    const fetchChildren = React.useCallback(
        async (folderId: string, driveId?: string) => {
            setLoading(true);
            setError(null);
            setSelected(null);
            try {
                const token = await getApiToken();
                const u = new URL(`${apiBase}/api/connectors/sharepoint/children`);
                u.searchParams.set("itemId", folderId);
                if (driveId) u.searchParams.set("driveId", String(driveId));

                const res = await fetch(u.toString(), {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                });

                if (!res.ok) {
                    // Fallback to /list for first-load scenarios (e.g., no OneDrive root, no "recent")
                    const alt = await fetch(`${apiBase}/api/connectors/sharepoint/list`, {
                        headers: { Authorization: `Bearer ${token}` },
                        credentials: "include",
                    });
                    if (!alt.ok) throw new Error(await alt.text());
                    const json = (await alt.json()) as SpItem[];
                    setItems(json);
                } else {
                    const json = (await res.json()) as SpItem[];
                    setItems(json);
                }
            } catch {
                setError("Failed to load items.");
            } finally {
                setLoading(false);
            }
        },
        [apiBase, getApiToken]
    );

    const search = React.useCallback(
        async (query: string) => {
            setLoading(true);
            setError(null);
            setSelected(null);
            try {
                const token = await getApiToken();
                const u = new URL(`${apiBase}/api/connectors/sharepoint/list`);
                if (query.trim()) u.searchParams.set("query", query.trim());

                const res = await fetch(u.toString(), {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include",
                });
                if (!res.ok) throw new Error(await res.text());
                const json = (await res.json()) as SpItem[];
                setItems(json);
            } catch {
                setError("Search failed.");
            } finally {
                setLoading(false);
            }
        },
        [apiBase, getApiToken]
    );

    const openFolder = (it: SpItem) => {
        if (!it.isFolder) return;
        // If this is a “drive row” (from /list fallback), it will have driveId;
        // pushing id='root' with driveId navigates to that drive's root.
        const nextDriveId = it.driveId ?? currentDriveId;
        const nextId = it.driveId ? "root" : it.id;
        setCrumbs((c) => [
            ...c,
            { id: nextId, name: it.name || "Folder", driveId: nextDriveId },
        ]);
    };

    const goUp = () => {
        if (crumbs.length > 1) {
            setCrumbs((c) => c.slice(0, -1));
        }
    };

    const refresh = () => fetchChildren(currentFolderId, currentDriveId);

    React.useEffect(() => {
        if (!open) return;
        // load capability flags once per open
        loadCaps();
    }, [open, loadCaps]);

    React.useEffect(() => {
        if (!open) return;
        fetchChildren(currentFolderId, currentDriveId);
    }, [open, currentFolderId, currentDriveId, fetchChildren]);

    const onSubmitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (q.trim()) search(q);
        else fetchChildren(currentFolderId, currentDriveId);
    };

    const doImport = React.useCallback(async () => {
        if (!selected || !selected.isFile) return;
        const token = await getApiToken();
        const res = await fetch(
            `${apiBase}/api/connectors/sharepoint/download/${encodeURIComponent(
                selected.id
            )}`,
            { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
        );
        if (!res.ok) {
            setError(`Download failed (HTTP ${res.status})`);
            return;
        }
        const blob = await res.blob();
        const file = new File([blob], selected.name || "document", {
            type: blob.type || "application/octet-stream",
        });
        onPick(file, selected);
        onOpenChange(false);
    }, [apiBase, getApiToken, onOpenChange, onPick, selected]);

    const runDiagnostics = React.useCallback(async () => {
        try {
            setDiagErr(null);
            setDiagRunning(true);
            const token = await getApiToken();
            const res = await fetch(
                `${apiBase}/api/connectors/sharepoint/debug/whoami`,
                { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
            );
            if (!res.ok) {
                setDiag(null);
                setDiagErr(`Diagnostics HTTP ${res.status}`);
            } else {
                const json = (await res.json()) as WhoAmI;
                setDiag(json);
            }
        } catch (e) {
            setDiag(null);
            setDiagErr("Diagnostics failed.");
        } finally {
            setDiagRunning(false);
        }
    }, [apiBase, getApiToken]);

    const diagHint = React.useMemo(() => {
        if (!diag) return null;
        const apiTid = diag.apiToken?.tid;
        const graphTid = diag.graphToken?.tid;
        const aud = diag.apiToken?.aud;
        const meDriveStatus = diag.me_drive?.status;
        const sameTenant = apiTid && graphTid ? apiTid === graphTid : undefined;

        if (sameTenant === false) {
            return "Your API token and Graph token are from different tenants. Check your MSAL authority and which account you selected.";
        }
        if (typeof meDriveStatus === "number" && (meDriveStatus === 400 || meDriveStatus === 404)) {
            return "Graph /me/drive is failing. If your account is licensed, ensure OneDrive is provisioned (open OneDrive once) and your backend has Graph delegated permissions with admin consent.";
        }
        if (aud && !aud.startsWith("api://")) {
            return "Your SPA acquired a token for the wrong audience. It should be the Application ID URI of your backend API.";
        }
        return "Tokens look consistent. If browsing still shows no items, the folder may simply be empty or your tenant restricts OneDrive.";
    }, [diag]);

    const emptyState = (() => {
        if (disabledForTenant) {
            return (
                <>
                    SharePoint/OneDrive isn’t enabled for this tenant. Ask your admin to assign a SharePoint Online license.
                    {" "}
                    <a
                        className="underline"
                        href="https://www.microsoft365.com/onedrive"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Open OneDrive
                    </a>
                    {" "}to provision if needed.
                </>
            );
        }
        if (caps && caps.oneDriveAvailable === false) {
            return (
                <>
                    Your OneDrive hasn’t been provisioned yet. Open OneDrive in a browser once to initialize it.
                    {" "}
                    <a
                        className="underline"
                        href="https://www.microsoft365.com/onedrive"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Open OneDrive
                    </a>
                    .
                </>
            );
        }
        return <>This folder is empty.</>;
    })();

    return (
        <DocumentViewerDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Import from SharePoint"
        >
            <div className="flex flex-col gap-3">
                {/* Capability banner */}
                {caps?.spoLicensed === false && (
                    <div
                        role="status"
                        className="text-sm text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded px-2 py-2 flex items-start gap-2"
                    >
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <div>
                            SharePoint/OneDrive isn’t enabled for this tenant. You can’t browse or import until a SharePoint Online license is assigned.
                        </div>
                    </div>
                )}

                {/* DEV: Troubleshooting panel */}
                {(import.meta as any).env?.DEV && (
                    <div className="rounded-md border border-[color:var(--gray-a6)] bg-[var(--surface-1)] p-2">
                        <button
                            type="button"
                            onClick={() => setDiagOpen((v) => !v)}
                            className="flex items-center gap-2 text-sm font-medium"
                        >
                            <Bug className="h-4 w-4" />
                            Troubleshoot (developer)
                        </button>
                        {diagOpen && (
                            <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Button variant="secondary" onClick={runDiagnostics} disabled={diagRunning}>
                                        {diagRunning ? "Running…" : "Run diagnostics"}
                                    </Button>
                                    {diagErr && <span className="text-red-600 text-sm">{diagErr}</span>}
                                </div>
                                {diag && (
                                    <div className="text-xs grid gap-1">
                                        {diagHint && (
                                            <div className="text-[color:var(--gray-12)] bg-[var(--indigo-3)] rounded px-2 py-1">
                                                {diagHint}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2 rounded bg-[var(--gray-2)]">
                                                <div className="font-semibold mb-1">API token</div>
                                                <div>tid: {diag.apiToken?.tid || "—"}</div>
                                                <div>aud: {diag.apiToken?.aud || "—"}</div>
                                                <div>upn: {diag.apiToken?.upn || "—"}</div>
                                            </div>
                                            <div className="p-2 rounded bg-[var(--gray-2)]">
                                                <div className="font-semibold mb-1">Graph token</div>
                                                <div>tid: {diag.graphToken?.tid || "—"}</div>
                                                <div>scp: {diag.graphToken?.scp || "—"}</div>
                                                <div>appId: {diag.graphToken?.appId || "—"}</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="p-2 rounded bg-[var(--gray-2)]">
                                                <div className="font-semibold">/me</div>
                                                <div>Status: {(diag.me?.status as number) ?? "—"}</div>
                                            </div>
                                            <div className="p-2 rounded bg-[var(--gray-2)]">
                                                <div className="font-semibold">/me/drive</div>
                                                <div>Status: {(diag.me_drive?.status as number) ?? "—"}</div>
                                            </div>
                                            <div className="p-2 rounded bg-[var(--gray-2)]">
                                                <div className="font-semibold">/me/drives</div>
                                                <div>Status: {(diag.me_drives?.status as number) ?? "—"}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={goUp}
                        disabled={crumbs.length <= 1 || disabledForTenant}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Up
                    </Button>

                    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
                        {crumbs.map((c, i) => (
                            <React.Fragment key={`${c.id}-${c.driveId ?? "default"}`}>
                                <button
                                    type="button"
                                    className="px-1 py-0.5 rounded hover:bg-[var(--gray-3)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50"
                                    onClick={() => setCrumbs(crumbs.slice(0, i + 1))}
                                    disabled={disabledForTenant}
                                >
                                    {c.name}
                                </button>
                                {i < crumbs.length - 1 && (
                                    <ChevronRight
                                        className="h-4 w-4 text-[color:var(--gray-10)]"
                                        aria-hidden
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            type="button"
                            onClick={refresh}
                            className="p-2 rounded hover:bg-[var(--gray-3)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50"
                            title="Refresh"
                            aria-label="Refresh"
                            disabled={disabledForTenant}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <form onSubmit={onSubmitSearch} className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--gray-10)]" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search files…"
                            aria-label="Search files"
                            disabled={disabledForTenant}
                            className="w-full pl-8 pr-3 py-2 rounded-md border
                         bg-[var(--surface-1)] text-[color:var(--gray-12)]
                         border-[color:var(--gray-a6)]
                         focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]
                         focus:ring-offset-2 focus:ring-offset-[var(--surface-1)]
                         disabled:opacity-50"
                        />
                    </div>
                    <Button type="submit" variant="primary" disabled={disabledForTenant}>
                        Search
                    </Button>
                </form>

                {error && (
                    <div
                        role="alert"
                        className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded px-2 py-1"
                    >
                        {error}
                    </div>
                )}

                <div
                    role="table"
                    aria-rowcount={items.length}
                    className="rounded-lg border border-[color:var(--gray-a6)] overflow-hidden"
                >
                    <div className="grid grid-cols-[minmax(220px,1fr)_160px_100px_40px] gap-2 px-3 py-2 bg-[var(--gray-3)] text-xs font-medium">
                        <div role="columnheader">Name</div>
                        <div role="columnheader">Modified</div>
                        <div role="columnheader">Size</div>
                        <div role="columnheader" className="text-right">
                            Open
                        </div>
                    </div>

                    <div className="max-h-[50vh] overflow-auto">
                        {loading ? (
                            <div className="px-3 py-6 text-sm text-[color:var(--gray-11)]">
                                Loading…
                            </div>
                        ) : items.length === 0 ? (
                            <div className="px-3 py-6 text-sm text-[color:var(--gray-11)]">
                                {emptyState}
                            </div>
                        ) : (
                            items.map((it) => {
                                const isSel = selected?.id === it.id;
                                const rowDisabled = disabledForTenant;
                                return (
                                    <button
                                        key={`${it.id}-${it.driveId ?? "default"}`}
                                        onDoubleClick={() =>
                                            rowDisabled
                                                ? undefined
                                                : it.isFolder
                                                    ? openFolder(it)
                                                    : setSelected(it)
                                        }
                                        onClick={() => (rowDisabled ? undefined : setSelected(it))}
                                        className={[
                                            "w-full grid grid-cols-[minmax(220px,1fr)_160px_100px_40px] gap-2 px-3 py-2 text-left",
                                            "hover:bg-[var(--gray-2)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]",
                                            isSel ? "bg-[var(--indigo-3)]" : "",
                                            rowDisabled ? "opacity-60 pointer-events-none" : "",
                                        ].join(" ")}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {it.isFile ? (
                                                <FileText className="h-4 w-4" />
                                            ) : (
                                                <Folder className="h-4 w-4" />
                                            )}
                                            <span className="truncate">{it.name}</span>
                                            {isSel && (
                                                <CheckCircle2 className="h-4 w-4 text-[var(--indigo-9)]" />
                                            )}
                                        </div>
                                        <div className="text-sm text-[color:var(--gray-11)]">
                                            {fmtDate(it.lastModifiedDateTime)}
                                        </div>
                                        <div className="text-sm text-[color:var(--gray-11)]">
                                            {it.isFile ? fmtSize(it.size) : "—"}
                                        </div>
                                        <div className="flex items-center justify-end">
                                            {it.webUrl && (
                                                <a
                                                    href={it.webUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1 rounded hover:bg-[var(--gray-3)]"
                                                    aria-label="Open in SharePoint"
                                                    title="Open in SharePoint"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={doImport}
                        disabled={!selected || !selected.isFile || disabledForTenant}
                        aria-disabled={!selected || !selected.isFile || disabledForTenant}
                        title={
                            disabledForTenant
                                ? "SharePoint/OneDrive not enabled"
                                : !selected
                                    ? "Select a file"
                                    : selected.isFile
                                        ? "Import file"
                                        : "Select a file"
                        }
                    >
                        Import
                    </Button>
                </div>
            </div>
        </DocumentViewerDialog>
    );
}
