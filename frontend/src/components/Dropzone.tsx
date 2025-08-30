import React from "react";
import { prettyBytes } from "../lib/prettyBytes";
import { FileText } from "lucide-react";

interface DropzoneProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  dragActive: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBrowseClick: () => void;
  file: File | null;
  maxSizeBytes?: number;
  accept?: string;
  helperText?: string;
  onUseSample?: () => void;
  onClearFile?: () => void;
}

export default function Dropzone({
  inputRef,
  dragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onBrowseClick,
  file,
  maxSizeBytes = 25 * 1024 * 1024,
  accept = "application/pdf",
  helperText,
}: DropzoneProps) {
  const inputId = React.useId();
  const helpId = React.useId();
  const statusId = React.useId();

  const selectedText = file
    ? `Selected: ${file.name} (${prettyBytes(file.size)})`
    : "No file selected";
  const instructionText = "Drag & drop your files here or";
  const maxMb = Math.round(maxSizeBytes / (1024 * 1024));

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onBrowseClick();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const f = it.kind === "file" ? it.getAsFile() : null;
      if (f && f.type === "application/pdf") {
        const dt = new DataTransfer();
        dt.items.add(f);
        if (inputRef.current) {
          (inputRef.current as HTMLInputElement).files = dt.files;
          inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
        }
        break;
      }
    }
  };

  return (
    <section aria-label="PDF uploader" className="w-full">
      <div
        role="button"
        aria-describedby={`${helpId} ${statusId}`}
        aria-label="PDF dropzone"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onClick={onBrowseClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPaste={handlePaste}
        data-drag-active={dragActive ? "true" : "false"}
        className={[
          "group relative cursor-pointer rounded-2xl border-2 border-dashed p-6 md:p-7 text-center shadow-sm",
          "transition-colors",
          "border-[color:var(--focus-ring-a-strong)] bg-[color:var(--focus-ring-a-soft)]",
          dragActive ? "ring-2 ring-[var(--focus-ring)]" : "",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]",
        ].join(" ")}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onFileChange}
          className="sr-only"
        />

        <div className="flex flex-col items-center gap-4">
          <FileText className="h-10 w-10 text-[var(--focus-ring)]" />

          <p className="text-sm text-[color:var(--gray-11)]">
            <span className="text-[color:var(--gray-12)]">{instructionText}</span>{" "}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBrowseClick();
              }}
              className="underline underline-offset-2 text-[color:var(--gray-12)]"
              title="Choose files"
            >
              choose files
            </button>
          </p>

          <p
            id={helpId}
            className="
              text-xs opacity-85
              text-[color:var(--gray-12)]
              dark:text-[color:var(--btn-primary-fg)]
              group-data-[drag-active=true]:text-[color:var(--btn-primary-fg)]
            "
          >
            {helperText ?? `${maxMb} MB max file size.`}
          </p>
        </div>

        <p
          id={statusId}
          className="mt-4 text-sm text-[color:var(--gray-11)]"
          aria-live="polite"
        >
          {selectedText}
        </p>
      </div>
    </section>
  );
}
