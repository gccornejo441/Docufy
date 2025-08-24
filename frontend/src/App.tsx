import React from "react";
import { useOcr } from "./hooks/useOcr";
import Controls from "./components/Controls";
import Dropzone from "./components/Dropzone";
import Results from "./components/Results";
import Toaster from "./components/Toaster";
import { API_BASE } from "./lib/api";
import DocumentViewerDialog from "./components/DocumentViewerDialog";

export default function App() {
  const ocr = useOcr({ dpi: 360, lang: "eng" });
  const [toastOpen, setToastOpen] = React.useState(false);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const showError = Boolean(ocr.error);

  const fileUrl = React.useMemo(
    () => (ocr.file ? URL.createObjectURL(ocr.file) : null),
    [ocr.file]
  );

  React.useEffect(() => {
    if (showError) setToastOpen(true);
  }, [showError]);

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

      {/* NEW: Document viewer dialog */}
      <DocumentViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} title="Document Viewer">
        {fileUrl ? (
          // Drop your interactive PDF component in here
          // <PdfRegionSelector
          //   fileUrl={fileUrl}
          //   onExtract={async ({ pageNumber, rectPdfPoints }) => {
          //     const form = new FormData();
          //     form.append("file", ocr.file!);
          //     form.append("pageNumber", String(pageNumber));
          //     form.append("x1", String(rectPdfPoints.x1));
          //     form.append("y1", String(rectPdfPoints.y1));
          //     form.append("x2", String(rectPdfPoints.x2));
          //     form.append("y2", String(rectPdfPoints.y2));
          //     form.append("ocr_lang", ocr.lang);
          //     const res = await fetch(`${API_BASE || ""}/extract-pdf-region`, {
          //       method: "POST",
          //       body: form,
          //     });
          //     const data = await res.json();
          //     console.log("Extracted:", data);
          //   }}
          // />
          <div className="h-full grid place-items-center text-[var(--gray-11)]">
            Add your PdfRegionSelector here
          </div>
        ) : null}
      </DocumentViewerDialog>
    </div>
  );
}
