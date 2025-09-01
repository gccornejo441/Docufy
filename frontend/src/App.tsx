import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useOcr } from "./hooks/useOcr";
import useApiHealth from "./hooks/useApiHealth";
import Controls from "./components/Controls";
import Dropzone from "./components/Dropzone";
import Results from "./components/Results";
import Toaster from "./components/Toaster";
import { API_BASE } from "./lib/api";
import DocumentViewerDialog from "./components/DocumentViewerDialog";
import PdfRegionSelector from "./components/PdfRegionSelector/PdfRegionSelector";
import Button from "./components/ui/Button";

import ConnectionsDialog from "./components/ConnectionsDialog";
import { useSharePointAuth } from "./auth/useSharePointAuth";
import SharePointBrowserDialog from "./components/SharePointBrowserDialog";

const APP_TITLE = import.meta.env.VITE_APP_TITLE || "Docufy";

export default function App() {
  const ocr = useOcr({ dpi: 360, lang: "eng" });
  const [toastOpen, setToastOpen] = React.useState(false);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [resultsOpen, setResultsOpen] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  // Connections
  const [connectionsOpen, setConnectionsOpen] = React.useState(false);
  const [connectedSP, setConnectedSP] = React.useState(false);

  // SharePoint import dialog
  const [spOpen, setSpOpen] = React.useState(false);
  const [spUrl, setSpUrl] = React.useState("");
  const [spBusy, setSpBusy] = React.useState(false);
  const [spError, setSpError] = React.useState<string | null>(null);

  const [spBrowserOpen, setSpBrowserOpen] = React.useState(false);

  const { ensureSignedIn, getApiToken } = useSharePointAuth();
  const showError = Boolean(ocr.error);

  const apiBase = React.useMemo(() => (API_BASE || "").replace(/\/$/, ""), []);
  const { status, statusCode, latencyMs, lastChecked, check } = useApiHealth(apiBase);

  const fileUrl = React.useMemo(
    () => (ocr.file ? URL.createObjectURL(ocr.file) : null),
    [ocr.file]
  );

  React.useEffect(() => {
    if (showError) setToastOpen(true);
  }, [showError]);

  React.useEffect(() => {
    document.title = APP_TITLE;
  }, []);

  React.useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const hasText = Boolean(ocr.text && ocr.text.trim().length);
  const currentStep = !ocr.file ? 1 : hasText ? 3 : 2;

  const prevHasText = React.useRef(false);
  React.useEffect(() => {
    if (!prevHasText.current && hasText) {
      setResultsOpen(true);
    }
    prevHasText.current = hasText;
  }, [hasText]);

  const statusLabel =
    status === "ok"
      ? "All systems normal"
      : status === "checking"
        ? "Checking…"
        : "Server unreachable";

  const dotClass =
    status === "ok"
      ? "bg-[var(--mint-9)]"
      : status === "checking"
        ? "bg-amber-500"
        : "bg-red-500";

  const textClass =
    status === "ok"
      ? "text-[var(--mint-10)]"
      : status === "checking"
        ? "text-amber-400"
        : "text-red-400";

  const handleRun = React.useCallback(async () => {
    try {
      setRunning(true);
      await ocr.runOcr();
    } finally {
      setRunning(false);
    }
  }, [ocr]);

  const openConnections = React.useCallback(async () => {
    setConnectionsOpen(true);
    try {
      const ok = await ensureSignedIn();
      if (!ok) return;
      const token = await getApiToken();
      const res = await fetch(`${apiBase}/api/connectors/sharepoint/status`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setConnectedSP(Boolean(json?.connected));
      }
    } catch {
      // ignore
    }
  }, [apiBase, ensureSignedIn, getApiToken]);


  const connectSharePoint = React.useCallback(async () => {
    const token = await getApiToken();
    const res = await fetch(`${apiBase}/api/connectors/sharepoint/connect`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (!res.ok) throw new Error("Connect failed");
    setConnectedSP(true);
  }, [apiBase, getApiToken]);

  const disconnectSharePoint = React.useCallback(async () => {
    const token = await getApiToken();
    const res = await fetch(`${apiBase}/api/connectors/sharepoint/disconnect`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (!res.ok) throw new Error("Disconnect failed");
    setConnectedSP(false);
  }, [apiBase, getApiToken]);

  const handleSharePointImport = React.useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setSpError(null);
      if (!spUrl.trim()) {
        setSpError("Paste a SharePoint or OneDrive link.");
        return;
      }
      try {
        setSpBusy(true);
        await ensureSignedIn();
        const apiToken = await getApiToken();
        const resp = await fetch(`${apiBase || ""}/api/import/sharepoint`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          credentials: "include",
          body: JSON.stringify({ shareUrl: spUrl.trim() }),
        });
        if (!resp.ok) throw new Error(`Import failed (HTTP ${resp.status})`);
        const blob = await resp.blob();
        const type = blob.type || "application/pdf";
        const fallbackName = (() => {
          try {
            const u = new URL(spUrl);
            const last = u.pathname.split("/").filter(Boolean).pop() || "import.pdf";
            return last.toLowerCase().endsWith(".pdf") ? last : `${last}.pdf`;
          } catch {
            return "import.pdf";
          }
        })();
        const file = new File([blob], fallbackName, { type });
        ocr.setFile?.(file);
        setSpOpen(false);
      } catch (err) {
        setSpError("Could not import file. Check the link, your permissions, or server logs.");
        console.error(err);
      } finally {
        setSpBusy(false);
      }
    },
    [apiBase, getApiToken, ocr, ensureSignedIn, spUrl]
  );

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-[var(--color-background)] text-[color:var(--gray-12)]">
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2
               focus:bg-[var(--surface-1)] focus:text-[color:var(--gray-12)]
               focus:rounded focus:px-3 focus:py-2
               focus:outline-none focus-visible:ring-2
               focus-visible:ring-[var(--focus-ring)]
               focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="w-full max-w-4xl mb-6">
        <div className="flex items-center gap-3">
          <img
            src="/docufy.svg"
            alt={`${APP_TITLE} logo`}
            className="h-8 w-8 shrink-0"
          />
          <div>
            <h1 className="text-2xl font-semibold">{APP_TITLE}</h1>
            <p className="text-[color:var(--gray-11)]">
              Upload a scanned PDF. We extract the text instantly.
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        id="main"
        tabIndex={-1}
        aria-busy={ocr.isUploading || running}
        className="w-full max-w-4xl space-y-6"
      >
        <Controls
          showActions={!!ocr.file}
          onReset={() => {
            ocr.reset();
            setViewerOpen(false);
            setResultsOpen(false);
          }}
          onRun={handleRun}
          isUploading={ocr.isUploading || running}
          isDocReady={!!ocr.file}
          onOpenDoc={() => setViewerOpen(true)}
          onImportFromSharePoint={async () => {
            const ok = await ensureSignedIn();
            if (!ok) return;
            if (!connectedSP) {
              openConnections();
            } else {
              setSpBrowserOpen(true);
            }
          }}
        />

        {/* Primary CTA: Dropzone */}
        <Dropzone
          inputRef={ocr.inputRef}
          dragActive={ocr.dragActive}
          onDragOver={ocr.onDragOver}
          onDragLeave={ocr.onDragLeave}
          onDrop={ocr.onDrop}
          onFileChange={ocr.onFileChange}
          onBrowseClick={ocr.onBrowseClick}
          file={ocr.file}
        />

        <nav
          aria-label="Processing steps"
          className="w-full mb-1 text-sm text-[color:var(--gray-11)]"
        >
          <ol className="flex items-center gap-3">
            {/* Step 1 */}
            <li
              aria-current={currentStep === 1 ? "step" : undefined}
              className="flex items-center gap-2"
            >
              <span
                className={[
                  "h-6 w-6 rounded-full grid place-items-center border",
                  currentStep >= 1
                    ? "bg-[var(--indigo-9)] text-white border-[var(--indigo-9)]"
                    : "bg-transparent text-[color:var(--gray-11)] border-[color:var(--gray-8)]",
                ].join(" ")}
              >
                1
              </span>
              <span className={currentStep === 1 ? "font-medium text-[color:var(--gray-12)]" : ""}>
                Add PDF
              </span>
            </li>

            <span aria-hidden="true">→</span>

            {/* Step 2 */}
            <li
              aria-current={currentStep === 2 ? "step" : undefined}
              className="flex items-center gap-2"
            >
              <span
                className={[
                  "h-6 w-6 rounded-full grid place-items-center border",
                  currentStep >= 2
                    ? "bg-[var(--indigo-9)] text-white border-[var(--indigo-9)]"
                    : "bg-transparent text-[color:var(--gray-11)] border-[color:var(--gray-8)]",
                ].join(" ")}
              >
                2
              </span>
              <span className={currentStep === 2 ? "font-medium text-[color:var(--gray-12)]" : ""}>
                Run OCR
              </span>
            </li>

            <span aria-hidden="true">→</span>

            {/* Step 3 */}
            <li
              aria-current={currentStep === 3 ? "step" : undefined}
              className="flex items-center gap-2"
            >
              <span
                className={[
                  "h-6 w-6 rounded-full grid place-items-center border",
                  currentStep >= 3
                    ? "bg-[var(--indigo-9)] text-white border-[var(--indigo-9)]"
                    : "bg-transparent text-[color:var(--gray-11)] border-[color:var(--gray-8)]",
                ].join(" ")}
              >
                3
              </span>
              <span className={currentStep === 3 ? "font-medium text-[color:var(--gray-12)]" : ""}>
                Review &amp; Export
              </span>
            </li>
          </ol>
        </nav>

        {/* View Results button */}
        <div className="w-full flex justify-end">
          <Button
            variant="primary"
            onClick={() => setResultsOpen(true)}
            disabled={!hasText}
            aria-disabled={!hasText}
            title={!hasText ? "Run OCR first" : "View extracted text"}
          >
            View Results
          </Button>
          <span className="sr-only" role="status" aria-live="polite">
            {hasText ? "OCR complete. Results are ready." : ""}
          </span>
        </div>
      </main>

      {/* Footer: Status pill with live health check */}
      <footer className="mt-8 text-sm text-[color:var(--gray-11)]">
        <Tooltip.Provider delayDuration={150}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={check}
                className={`inline-flex items-center gap-2 underline-offset-4 hover:underline
                      rounded px-2 py-1
                      focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-[var(--focus-ring)]
                      focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]
                      ${textClass}`}
                aria-label="Show API details"
                aria-describedby="api-status"
                title="Click to re-check now"
              >
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`}
                  aria-hidden="true"
                />
                <span id="api-status" role="status" aria-live="polite">
                  {statusLabel}
                  {typeof statusCode === "number" ? ` — HTTP ${statusCode}` : ""}
                </span>
              </button>
            </Tooltip.Trigger>

            <Tooltip.Portal>
              <Tooltip.Content
                side="top"
                align="center"
                className="rounded-md border px-3 py-2 shadow-md
                     bg-[var(--surface-1)] text-[color:var(--gray-12)]
                     border-[color:var(--gray-7)] text-xs"
              >
                <div className="flex flex-col gap-1">
                  <div>
                    <span className="opacity-70 mr-1">API:</span>
                    <code>{apiBase || window.location.origin}</code>
                  </div>
                  <div className="flex gap-2">
                    <span className="opacity-70">Status:</span>
                    <span className="font-medium">{status.toUpperCase()}</span>
                    {typeof statusCode === "number" && <span>• HTTP {statusCode}</span>}
                  </div>
                  <div className="flex gap-2">
                    <span className="opacity-70">Latency:</span>
                    <span>{latencyMs != null ? `${latencyMs} ms` : "—"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="opacity-70">Last check:</span>
                    <span>{lastChecked ? new Date(lastChecked).toLocaleTimeString() : "—"}</span>
                  </div>
                </div>
                <Tooltip.Arrow className="fill-[var(--surface-1)]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </footer>

      {/* Toast */}
      <Toaster
        open={toastOpen}
        onOpenChange={setToastOpen}
        title="Something went wrong"
        description={ocr.error}
      />

      {/* Document viewer dialog */}
      <DocumentViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        title="Document Viewer"
      >
        {fileUrl && ocr.file ? (
          <PdfRegionSelector
            fileUrl={fileUrl}
            file={ocr.file}
            lang={ocr.lang}
            apiBase={apiBase}
          />
        ) : null}
      </DocumentViewerDialog>

      {/* Results dialog */}
      <DocumentViewerDialog
        open={resultsOpen}
        onOpenChange={setResultsOpen}
        title="Extracted Text"
      >
        <Results
          text={ocr.text}
          setText={ocr.setText}
          canMakeSearchable={ocr.canMakeSearchable}
          onDownload={ocr.downloadSearchable}
          disabled={!ocr.file}
          titleWhenDisabled="/make-searchable endpoint not available yet"
        />
      </DocumentViewerDialog>

      {/* Connections dialog */}
      <ConnectionsDialog
        open={connectionsOpen}
        onOpenChange={setConnectionsOpen}
        connected={{ sharepoint: connectedSP }}
        onConnectSharePoint={connectSharePoint}
        onDisconnectSharePoint={disconnectSharePoint}
      />

      {/* Import from SharePoint dialog */}
      <DocumentViewerDialog
        open={spOpen}
        onOpenChange={setSpOpen}
        title="Import from SharePoint"
      >
        <form
          onSubmit={handleSharePointImport}
          className="flex flex-col gap-3"
          aria-describedby="sp-help"
        >
          <label htmlFor="sp-url" className="text-sm font-medium">
            Share link
          </label>
          <input
            id="sp-url"
            type="url"
            required
            placeholder="Paste a SharePoint or OneDrive link…"
            value={spUrl}
            onChange={(e) => setSpUrl(e.target.value)}
            className="w-full rounded-md border px-3 py-2
                       bg-[var(--surface-1)] text-[color:var(--gray-12)]
                       border-[color:var(--gray-a6)]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]
                       focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]"
          />
          <p id="sp-help" className="text-xs text-[color:var(--gray-11)]">
            We’ll fetch this file server-side using your organization’s permissions.
          </p>

          {spError && (
            <div
              role="alert"
              className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded px-2 py-1"
            >
              {spError}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSpOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={spBusy}>
              {spBusy ? "Importing…" : "Import"}
            </Button>
          </div>

          <span className="sr-only" role="status" aria-live="polite">
            {spBusy ? "Importing from SharePoint…" : ""}
          </span>
        </form>
      </DocumentViewerDialog>

      <SharePointBrowserDialog
        open={spBrowserOpen}
        onOpenChange={setSpBrowserOpen}
        apiBase={apiBase}
        getApiToken={getApiToken}
        onPick={(file /*, meta*/) => {
          ocr.setFile?.(file);
          setResultsOpen(false);
        }}
      />

    </div>
  );
}
