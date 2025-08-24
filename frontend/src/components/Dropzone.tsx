import React from "react";
import { prettyBytes } from "../lib/prettyBytes";

interface DropzoneProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  dragActive: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBrowseClick: () => void;
  file: File | null;
  onRun: () => void;
  disabled?: boolean;
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
  onRun,
  disabled,
}: DropzoneProps) {
  const dropText = file
    ? `Selected: ${file.name} (${prettyBytes(file.size)})`
    : "Drag & Drop PDF here or Click to Upload";

  return (
    <div
      role="region"
      aria-label="PDF dropzone"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-2xl border-2 border-dashed p-10 text-center shadow-sm
        bg-[var(--color-panel-solid)]
        ${dragActive ? "border-[var(--mint-8)]" : "border-[var(--gray-a7)]"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={onFileChange}
        className="hidden"
      />

      <div className="text-[var(--gray-11)] mb-3">PDF</div>
      <p className="text-[var(--gray-12)] mb-4">{dropText}</p>

      <div className="flex gap-3 justify-center">
        <button
          onClick={onBrowseClick}
          type="button"
          className="px-4 py-2 rounded bg-[var(--gray-5)] text-[var(--gray-12)]
                     hover:bg-[var(--gray-6)] focus:outline-none
                     focus:ring-2 focus:ring-[var(--mint-9)]"
        >
          Choose File
        </button>

        <button
          onClick={onRun}
          type="button"
          disabled={disabled}
          className="px-4 py-2 rounded
                     bg-[var(--mint-9)] text-[var(--gray-1)]
                     hover:bg-[var(--mint-10)]
                     disabled:opacity-60
                     focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)]"
        >
          Run OCR
        </button>
      </div>
    </div>
  );
}
