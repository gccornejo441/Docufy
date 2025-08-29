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
}

export default function Dropzone({
  inputRef,
  dragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onBrowseClick,
  file
}: DropzoneProps) {
  const dropText = file
    ? `Selected: ${file.name} (${prettyBytes(file.size)})`
    : "Drag & Drop PDF here or Click to Upload";

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onBrowseClick();
    }
  };

  return (
    <div
      role="region"
      aria-label="PDF dropzone"
      aria-live="polite"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onClick={onBrowseClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center shadow-sm",
        "bg-[var(--surface-1)]",
        dragActive
          ? "border-[var(--btn-primary-bg)]"
          : "border-[var(--gray-a7)]",
        // Focus ring that matches your theme + visible on any surface
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]",
      ].join(" ")}
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
          onClick={(e) => { e.stopPropagation(); onBrowseClick(); }}
          type="button"
          className={[
            "px-4 py-2 rounded-md font-medium",
            "border border-[var(--gray-a6)]",
            "bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-bg-hover)] text-[var(--btn-primary-fg)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]",
            "transition-[background,transform] active:translate-y-[0.5px]",
          ].join(" ")}
        >
          Choose File
        </button>
      </div>

      {/* Optional subtle highlight on drag */}
      {dragActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl
                     ring-2 ring-[var(--focus-ring)]/40"
        />
      )}
    </div>
  );
}
