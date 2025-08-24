import React from "react";
import { useOcr } from "./hooks/useOcr";
import Controls from "./components/Controls";
import Dropzone from "./components/Dropzone";
import Results from "./components/Results";
import Toaster from "./components/Toaster"; // 👈 fixed extra space
import { API_BASE } from "./lib/api";
import DocumentViewerDialog from "./components/DocumentViewerDialog";
import PdfRegionSelector from "./components/PdfRegionSelector/PdfRegionSelector";

export default function App() {
  const ocr = useOcr({ dpi: 360, lang: "eng" });
  const [toastOpen, setToastOpen] = React.useState(false);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const showError = Boolean(ocr.error);

  // Normalize API base (avoid trailing slash issues)
  const apiBase = React.useMemo(() => (API_BASE || "").replace(/\/$/, ""), []);

  // Blob URL for the selected file (for the viewer)
  const fileUrl = React.useMemo(
    () => (ocr.file ? URL.createObjectURL(ocr.file) : null),
    [ocr.file]
  );

  React.useEffect(() => {
    if (showError) setToastOpen(true);
  }, [showError]);

  // Cleanup object URL
  React.useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-[var(--color-background)]">
      <header className="w-full max-w-4xl mb-6">
        <h1 className="text-2xl font-semibold">OCR Demo</h1>
        <p className="text-gray-600">
          Upload a scanned PDF → get text back instantly. Optionally download a
          searchable PDF.
        </p>
      </header>

      <main className="w-full max-w-4xl space-y-6">
        <Controls
          dpi={ocr.dpi}
          setDpi={ocr.setDpi}
          lang={ocr.lang}
          setLang={ocr.setLang}
          onReset={() => {
            ocr.reset();
            setViewerOpen(false);
          }}
          onRun={ocr.runOcr}
          isUploading={ocr.isUploading}
          // enable the new control only when a file is ready
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

      <footer className="mt-8 text-xs text-gray-500">
        API: <code>{API_BASE || window.location.origin}</code>
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
        // optional: description="Select a region to extract text"
        // optional (from the earlier version): highContrast={true}
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
