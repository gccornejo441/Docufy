import * as Dialog from "@radix-ui/react-dialog";
import { useState, type ReactNode } from "react";

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  children: ReactNode;
  description?: string;
  highContrast?: boolean;
  initialFullscreen?: boolean;
  fullscreen?: boolean;
  onFullscreenChange?: (v: boolean) => void;
}

export default function DocumentViewerDialog({
  open,
  onOpenChange,
  title = "Document Viewer",
  children,
  description,
  highContrast = true,
  initialFullscreen = false,
  fullscreen,
  onFullscreenChange,
}: DocumentViewerDialogProps) {
  const [internalFS, setInternalFS] = useState(initialFullscreen);
  const isFullscreen = fullscreen ?? internalFS;

  const toggleFullscreen = () => {
    const next = !isFullscreen;
    if (onFullscreenChange) onFullscreenChange(next);
    else setInternalFS(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="
            fixed inset-0 transition-opacity duration-200
            data-[state=open]:opacity-100 data-[state=closed]:opacity-0
            bg-[var(--gray-a8)] backdrop-blur-[2px]
          "
        />
        <Dialog.Content
          className={[
            isFullscreen
              ? "fixed inset-0 p-2 sm:p-4"
              : "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-6xl h-[85vh] p-4",
            "rounded-2xl shadow-2xl border flex flex-col gap-3",
            highContrast
              ? "bg-[var(--surface-1)] text-[var(--gray-12)] border-[var(--gray-a6)]"
              : "bg-[var(--color-panel)]/80 supports-[backdrop-filter]:bg-[var(--color-panel)]/60 backdrop-blur text-[var(--gray-12)] border-[var(--gray-a6)]",
            "transition-[opacity,transform] duration-200",
            "data-[state=open]:opacity-100 data-[state=closed]:opacity-0",
            "data-[state=open]:scale-100 data-[state=closed]:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
            "focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface-1)]",
          ].join(" ")}
        >
          <div
            className={[
              "sticky top-0 z-10 -mx-4 px-4 pt-3 pb-2 sm:mx-0 sm:px-0 flex items-center gap-3 justify-between",
              highContrast
                ? "bg-[var(--surface-1)]"
                : "bg-[var(--color-panel)]/70 supports-[backdrop-filter]:backdrop-blur",
            ].join(" ")}
          >
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold truncate">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-xs text-[var(--gray-10)] truncate">
                  {description}
                </Dialog.Description>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="px-2 py-1 rounded border border-[var(--gray-a6)] bg-[var(--gray-2)] hover:bg-[var(--gray-3)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--surface-1)] text-sm"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? "⤢" : "⤡"}
              </button>
              <Dialog.Close
                className="px-3 py-1 rounded border border-[var(--gray-a6)] bg-[var(--gray-2)] hover:bg-[var(--gray-3)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--surface-1)] text-sm"
                aria-label="Close"
              >
                Close
              </Dialog.Close>
            </div>
          </div>

          <div
            className={[
              "flex-1 min-h-0 overflow-auto rounded",
              highContrast ? "bg-[var(--surface-1)]" : "bg-[var(--color-panel)]/70",
            ].join(" ")}
          >
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}