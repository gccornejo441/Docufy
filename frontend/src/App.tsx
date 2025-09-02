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

const APP_TITLE = import.meta.env.VITE_APP_TITLE || "Docufy";

export default function App() {
  const ocr = useOcr({ dpi: 360, lang: "eng" });
  const [toastOpen, setToastOpen] = React.useState(false);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [resultsOpen, setResultsOpen] = React.useState(false);
  const [running, setRunning] = React.useState(false);

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
          <img src="/docufy.svg" alt={`${APP_TITLE} logo`} className="h-8 w-8 shrink-0" />
          <div>
            <h1 className="text-2xl font-semibold">{APP_TITLE}</h1>
            <p className="text-[color:var(--gray-11)]">Upload a scanned PDF. We extract the text instantly.</p>
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
            <li aria-current={currentStep === 1 ? "step" : undefined} className="flex items-center gap-2">
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
            <li aria-current={currentStep === 2 ? "step" : undefined} className="flex items-center gap-2">
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
            <li aria-current={currentStep === 3 ? "step" : undefined} className="flex items-center gap-2">
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
    </div>
  );
}
