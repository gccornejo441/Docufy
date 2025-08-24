// src/App.tsx
import React from "react";
import { useOcr } from "./hooks/useOcr";
import Controls from "./components/Controls";
import Dropzone from "./components/Dropzone";
import Results from "./components/Results";
import Toaster from "./components/Toaster";
import { API_BASE } from "./lib/api";

export default function App() {
  const ocr = useOcr({ dpi: 360, lang: "eng" });
  const [toastOpen, setToastOpen] = React.useState(false);
  const showError = Boolean(ocr.error);

  React.useEffect(() => {
    if (showError) setToastOpen(true);
  }, [showError]);

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
          onReset={ocr.reset}
          onRun={ocr.runOcr}
          isUploading={ocr.isUploading}
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
          onRun={ocr.runOcr}
          disabled={!ocr.file || ocr.isUploading}
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
        API:{" "}
        <code>
          {API_BASE || window.location.origin}
        </code>
      </footer>

      <Toaster
        open={toastOpen}
        onOpenChange={setToastOpen}
        title="Something went wrong"
        description={ocr.error}
      />
    </div>
  );
}
