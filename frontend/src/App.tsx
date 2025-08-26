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

const APP_TITLE = import.meta.env.VITE_APP_TITLE || "Docufy";

export default function App() {
  const ocr = useOcr({ dpi: 360, lang: "eng" });
  const [toastOpen, setToastOpen] = React.useState(false);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const showError = Boolean(ocr.error);

  // Normalize API base
  const apiBase = React.useMemo(() => (API_BASE || "").replace(/\/$/, ""), []);
  const { status, statusCode, latencyMs, lastChecked, check } = useApiHealth(apiBase);

  // Blob URL for the selected file
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

  const statusLabel =
    status === "ok" ? "All systems normal" : status === "checking" ? "Checking…" : "Server unreachable";

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

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-[var(--color-background)]">
      <header className="w-full max-w-4xl mb-6">
        <div className="flex items-center gap-3">
          <img
            src="/docufy.svg"
            alt={`${APP_TITLE} logo`}
            className="h-8 w-8 shrink-0"
          />
          <div>
            <h1 className="text-2xl font-semibold">{APP_TITLE}</h1>
            <p className="text-gray-600">
              Upload a scanned PDF → get text back instantly. Optionally download a
              searchable PDF.
            </p>
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl space-y-6">
        <Controls
          onReset={() => {
            ocr.reset();
            setViewerOpen(false);
          }}
          onRun={ocr.runOcr}
          isUploading={ocr.isUploading}
          isDocReady={!!ocr.file}
          onOpenDoc={() => setViewerOpen(true)}
        />

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

        <Results
          text={ocr.text}
          setText={ocr.setText}
          canMakeSearchable={ocr.canMakeSearchable}
          onDownload={ocr.downloadSearchable}
          disabled={!ocr.file}
          titleWhenDisabled="/make-searchable endpoint not available yet"
        />
      </main>

      {/* Footer: Status pill with live health check */}
      <footer className="mt-8 text-xs text-gray-500">
        <Tooltip.Provider delayDuration={150}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={check}
                className={`inline-flex items-center gap-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)] rounded px-1 ${textClass}`}
                aria-label="Show API details"
                title="Click to re-check now"
              >
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`}
                  aria-hidden="true"
                />
                <span>{statusLabel}</span>
              </button>
            </Tooltip.Trigger>

            <Tooltip.Portal>
              <Tooltip.Content
                side="top"
                align="center"
                className="rounded-md border px-3 py-2 shadow-md
                           bg-white text-neutral-900
                           dark:bg-neutral-900 dark:text-neutral-50
                           border-neutral-200 dark:border-neutral-700
                           text-xs"
              >
                <div className="flex flex-col gap-1">
                  <div>
                    <span className="opacity-70 mr-1">API:</span>
                    <code>{apiBase || window.location.origin}</code>
                  </div>
                  <div className="flex gap-2">
                    <span className="opacity-70">Status:</span>
                    <span>{status.toUpperCase()}</span>
                    {typeof statusCode === "number" && <span>• HTTP {statusCode}</span>}
                  </div>
                  <div className="flex gap-2">
                    <span className="opacity-70">Latency:</span>
                    <span>{latencyMs != null ? `${latencyMs} ms` : "—"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="opacity-70">Last check:</span>
                    <span>
                      {lastChecked ? new Date(lastChecked).toLocaleTimeString() : "—"}
                    </span>
                  </div>
                </div>
                <Tooltip.Arrow className="fill-white dark:fill-neutral-900" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </footer>

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
    </div>
  );
}
