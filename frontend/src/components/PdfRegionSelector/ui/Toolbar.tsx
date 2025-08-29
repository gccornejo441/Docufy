import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eraser,
  Wand2,
  Loader2,
  RotateCcw,
  RotateCw,
  RefreshCcw,
} from "lucide-react";

interface ToolbarProps {
  hasPdf: boolean;
  pageNumber: number;
  numPages: number;
  scale: number;
  rotation: 0 | 90 | 180 | 270;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitPage: () => void;
  onFitWidth: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onResetRotation: () => void;
  onClearSelection: () => void;

  canExtract: boolean;
  extracting: boolean;
  onExtract: () => void;

  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export default function Toolbar({
  hasPdf,
  pageNumber,
  numPages,
  scale,
  rotation,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onFitPage,
  onFitWidth,
  onRotateLeft,
  onRotateRight,
  onResetRotation,
  onClearSelection,
  canExtract,
  extracting,
  onExtract,
  onToggleFullscreen,
  isFullscreen,
}: ToolbarProps) {
  const pct = Math.round(scale * 100);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if (typing) return;

      const key = e.key.toLowerCase();
      if (key === "w") {
        e.preventDefault();
        onFitWidth();
      } else if (key === "p") {
        e.preventDefault();
        onFitPage();
      } else if (key === "r" && e.shiftKey) {
        e.preventDefault();
        onRotateLeft();
      } else if (key === "r") {
        e.preventDefault();
        onRotateRight();
      } else if (key === "0") {
        e.preventDefault();
        onResetRotation();
      } else if (key === "f" && onToggleFullscreen) {
        e.preventDefault();
        onToggleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onFitWidth, onFitPage, onRotateLeft, onRotateRight, onResetRotation, onToggleFullscreen]);

  const ctaDisabled = !canExtract || extracting;

  return (
    <Tooltip.Provider delayDuration={150}>
      <div
        aria-label="PDF toolbar"
        className={[
          "sticky top-0 z-10 w-full",
          "grid grid-cols-[1fr_auto] items-center gap-2",
          "rounded-lg border border-[var(--gray-a6)]",
          "bg-[var(--surface-1)] px-2 py-1.5",
        ].join(" ")}
      >
        {/* LEFT: scrollable controls */}
        <div className="min-w-0 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] relative whitespace-nowrap -mx-1 px-1">
          <div className="inline-flex items-center gap-2 align-middle">
            {/* Navigation */}
            <div className="inline-flex items-center gap-1">
              <IconButton tooltip="Previous page" disabled={!hasPdf || pageNumber <= 1} onClick={onPrev}>
                <ChevronLeft className="size-4" />
              </IconButton>

              <div
                className="px-2 py-1 text-[11px] sm:text-xs font-medium rounded-md border border-[var(--gray-a6)]
                           bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-fg)]"
                aria-live="polite"
              >
                Page {Math.max(1, pageNumber)} / {Math.max(1, numPages || 1)}
              </div>

              <IconButton tooltip="Next page" disabled={!hasPdf || pageNumber >= numPages} onClick={onNext}>
                <ChevronRight className="size-4" />
              </IconButton>
            </div>

            <Divider />

            {/* Zoom + Fits */}
            <div className="inline-flex items-center gap-1">
              <IconButton tooltip="Zoom out (−)" onClick={onZoomOut}>
                <ZoomOut className="size-4" />
              </IconButton>

              <div
                className="px-2 py-1 rounded-md border border-[var(--gray-a6)]
                           bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-fg)]
                           text-[11px] sm:text-xs font-medium tabular-nums"
                title={`${pct}%`}
                aria-live="polite"
              >
                {pct}%
              </div>

              <IconButton tooltip="Zoom in (+)" onClick={onZoomIn}>
                <ZoomIn className="size-4" />
              </IconButton>

              <IconButton tooltip="Fit to width (W)" onClick={onFitWidth}>
                <Maximize2 className="size-4" />
              </IconButton>

              <IconButton tooltip="Fit to page (P)" onClick={onFitPage}>
                <Maximize2 className="size-4 rotate-45" />
              </IconButton>
            </div>

            <Divider />

            {/* Orientation */}
            <div className="inline-flex items-center gap-1">
              <IconButton tooltip="Rotate left (Shift+R)" onClick={onRotateLeft}>
                <RotateCcw className="size-4" />
              </IconButton>
              <IconButton tooltip="Rotate right (R)" onClick={onRotateRight}>
                <RotateCw className="size-4" />
              </IconButton>
              <IconButton
                tooltip="Reset rotation"
                onClick={onResetRotation}
                disabled={rotation % 360 === 0}
              >
                <RefreshCcw className="size-4" />
              </IconButton>
            </div>

            {/* Fullscreen */}
            {onToggleFullscreen && (
              <>
                <Divider />
                <div className="inline-flex items-center">
                  <IconButton
                    tooltip={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
                    onClick={onToggleFullscreen}
                    aria-pressed={!!isFullscreen}
                  >
                    <Maximize2 className={isFullscreen ? "size-4 rotate-45" : "size-4"} />
                  </IconButton>
                </div>
              </>
            )}

            <Divider />

            {/* Clear selection */}
            <div className="inline-flex items-center">
              <IconButton tooltip="Clear selection (Esc)" onClick={onClearSelection} disabled={!hasPdf}>
                <Eraser className="size-4" />
              </IconButton>
            </div>
          </div>
        </div>

        {/* RIGHT: CTA (neutral using secondary tokens) */}
        <div className="flex items-center justify-end">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span
                className={ctaDisabled ? "inline-flex cursor-not-allowed" : "inline-flex"}
                tabIndex={ctaDisabled ? 0 : -1}
                aria-disabled={ctaDisabled}
              >
                <button
                  onClick={onExtract}
                  disabled={ctaDisabled}
                  aria-busy={extracting}
                  className={[
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap flex-none rounded-md px-3 py-2 text-sm font-medium",
                    "border border-[var(--gray-a6)]",
                    "bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-bg-hover)] text-[var(--btn-primary-fg)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                    "disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none",
                    "transition-[background,transform] active:translate-y-[0.5px]",
                  ].join(" ")}
                >
                  {extracting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Extracting…</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="size-4" />
                      <span>Extract Selection</span>
                    </>
                  )}
                </button>
              </span>
            </Tooltip.Trigger>

            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={8}
                className="hidden md:block z-[70] rounded-md border border-[var(--gray-a6)]
                           bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--gray-12)] shadow"
              >
                Run OCR for the selected region
                <Tooltip.Arrow className="fill-[var(--gray-a6)]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

function IconButton({
  tooltip,
  className = "",
  children,
  disabled,
  ...btn
}: React.ComponentProps<"button"> & { tooltip: string }) {
  const ButtonEl = (
    <button
      {...btn}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center px-2.5 py-1.5 rounded-md",
        "border border-[var(--gray-a6)]",
        "bg-[var(--btn-settings-bg)] hover:bg-[var(--btn-settings-bg-hover)] text-[var(--btn-settings-fg)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        "disabled:opacity-50 disabled:pointer-events-none",
        "transition-colors",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          className={disabled ? "inline-flex cursor-not-allowed" : "inline-flex"}
          tabIndex={disabled ? 0 : -1}
          aria-disabled={disabled}
        >
          {ButtonEl}
        </span>
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={8}
          className="z-[70] rounded-md border border-[var(--gray-a6)] bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--gray-12)] shadow"
        >
          {tooltip}
          <Tooltip.Arrow className="fill-[var(--gray-a6)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function Divider() {
  return <div aria-hidden className="mx-1 h-6 w-px bg-[var(--gray-a6)]" />;
}
