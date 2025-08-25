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
            fixed inset-0 bg-black/40 backdrop-blur-[2px]
            transition-opacity duration-200
            data-[state=open]:opacity-100 data-[state=closed]:opacity-0
          "
        />
        <Dialog.Content
          className={[
            isFullscreen
              ? "fixed inset-0 p-2 sm:p-4"
              : "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-6xl h-[85vh] p-4",
            "rounded-2xl shadow-2xl border flex flex-col gap-3",
            highContrast
              ? "bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50 border-neutral-200 dark:border-neutral-700"
              : "bg-[var(--color-panel-solid)] supports-[backdrop-filter:blur(2px)]:backdrop-blur-xl supports-[backdrop-filter:blur(2px)]:bg-white/70 dark:supports-[backdrop-filter:blur(2px)]:bg-neutral-900/60 border-white/20 dark:border-white/10 text-[var(--gray-12)]",
            "transition-[opacity,transform] duration-200",
            "data-[state=open]:opacity-100 data-[state=closed]:opacity-0",
            "data-[state=open]:scale-100 data-[state=closed]:scale-95",
          ].join(" ")}
        >
          {/* Header */}
          <div
            className={[
              "sticky top-0 z-10 -mx-4 px-4 pt-3 pb-2 sm:mx-0 sm:px-0 flex items-center gap-3 justify-between",
              highContrast
                ? "bg-white/95 dark:bg-neutral-900/95 backdrop-blur supports-[backdrop-filter:blur(2px)]:backdrop-blur"
                : "bg-gradient-to-b from-transparent to-black/5",
            ].join(" ")}
          >
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold truncate">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                  {description}
                </Dialog.Description>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)] text-sm"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? "⤢" : "⤡"}
              </button>
              <Dialog.Close
                className="px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)] text-sm"
                aria-label="Close"
              >
                Close
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div
            className={[
              "flex-1 min-h-0 overflow-auto rounded",
              highContrast ? "bg-neutral-50 dark:bg-neutral-800" : "bg-[var(--color-panel)]/70",
            ].join(" ")}
          >
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
