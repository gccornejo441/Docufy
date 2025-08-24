import * as React from "react";
import * as RToolbar from "@radix-ui/react-toolbar";
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
} from "lucide-react";

interface ToolbarProps {
  hasPdf: boolean;
  pageNumber: number;
  numPages: number;
  scale: number;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onClearSelection: () => void;
  canExtract: boolean;
  extracting: boolean;
  onExtract: () => void;
}

export default function Toolbar({
  hasPdf,
  pageNumber,
  numPages,
  scale,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onFit,
  onClearSelection,
  canExtract,
  extracting,
  onExtract,
}: ToolbarProps) {
  const pct = Math.round(scale * 100);

  return (
    <Tooltip.Provider delayDuration={200}>
      <RToolbar.Root
        aria-label="PDF toolbar"
        className={[
          // 2-column grid: scrollable controls | fixed CTA
          "sticky top-0 z-10 w-full",
          "grid grid-cols-[1fr_auto] items-center gap-2",
          "rounded-2xl border border-[var(--gray-a6)]",
          "bg-[var(--color-panel)]/80 supports-[backdrop-filter]:bg-[var(--color-panel)]/60 backdrop-blur",
          "px-2 py-1.5 shadow-sm",
        ].join(" ")}
      >
        {/* LEFT: horizontally scrollable rail with all controls */}
        <div
          className={[
            "min-w-0",                         // allow shrinking
            "overflow-x-auto overflow-y-hidden", // enable horizontal scroll on small widths
            "[-webkit-overflow-scrolling:touch]", // smooth on iOS
            "relative", 
            // Let content be a single non-wrapping row
            "whitespace-nowrap",
            // Optional edge padding so scroll feels natural
            "-mx-1 px-1",
          ].join(" ")}
        >
          <div className="inline-flex items-center gap-2 align-middle">
            {/* Navigation group */}
            <div className="inline-flex items-center gap-1">
              <IconButton
                tooltip="Previous page"
                disabled={!hasPdf || pageNumber <= 1}
                onClick={onPrev}
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous page</span>
              </IconButton>

              <div
                className={[
                  "px-2 py-1",
                  "text-[11px] sm:text-xs font-medium text-[var(--gray-12)]",
                  "rounded-full border border-[var(--gray-a6)]",
                  "bg-[var(--gray-2)]/60 text-center",
                ].join(" ")}
                aria-live="polite"
              >
                Page {Math.max(1, pageNumber)} / {Math.max(1, numPages || 1)}
              </div>

              <IconButton
                tooltip="Next page"
                disabled={!hasPdf || pageNumber >= numPages}
                onClick={onNext}
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Next page</span>
              </IconButton>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-[var(--gray-a6)]" />

            {/* Zoom group */}
            <div className="inline-flex items-center gap-1">
              <IconButton tooltip="Zoom out (−)" onClick={onZoomOut}>
                <ZoomOut className="size-4" />
                <span className="sr-only">Zoom out</span>
              </IconButton>

              <div
                className={[
                  "px-2 py-1",
                  "rounded-full border border-[var(--gray-a6)]",
                  "bg-[var(--gray-2)]/60 text-center",
                  "text-[11px] sm:text-xs font-medium text-[var(--gray-12)] tabular-nums",
                ].join(" ")}
                title={`${pct}%`}
                aria-live="polite"
              >
                {pct}%
              </div>

              <IconButton tooltip="Zoom in (+)" onClick={onZoomIn}>
                <ZoomIn className="size-4" />
                <span className="sr-only">Zoom in</span>
              </IconButton>

              <IconButton tooltip="Fit to width (F)" onClick={onFit}>
                <Maximize2 className="size-4" />
                <span className="sr-only">Fit to width</span>
              </IconButton>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-[var(--gray-a6)]" />

            {/* Clear selection */}
            <div className="inline-flex items-center">
              <IconButton
                tooltip="Clear selection (Esc)"
                onClick={onClearSelection}
                disabled={!hasPdf}
              >
                <Eraser className="size-4" />
                <span className="sr-only">Clear selection</span>
              </IconButton>
            </div>
          </div>
        </div>

        {/* RIGHT: always-visible CTA (never wraps, never shrinks away) */}
        <div className="flex items-center justify-end">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={onExtract}
                disabled={!canExtract || extracting}
                aria-busy={extracting}
                className={[
                  "inline-flex items-center justify-center gap-2",
                  "whitespace-nowrap flex-none", // never wrap, never shrink
                  "rounded-xl px-3 py-2 text-sm font-semibold shadow-md",
                  "bg-[var(--mint-9)] text-[var(--gray-1)] hover:bg-[var(--mint-10)]",
                  "ring-1 ring-inset ring-[var(--mint-a6)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mint-11)]",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  "transition-[background,box-shadow,transform] active:translate-y-[0.5px]",
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
            </Tooltip.Trigger>
            <Tooltip.Content
              sideOffset={8}
              className="hidden md:block rounded-md border border-[var(--gray-a6)] bg-[var(--color-panel)] px-2 py-1 text-xs text-[var(--gray-12)] shadow"
            >
              Run OCR for the selected region
              <Tooltip.Arrow className="fill-[var(--gray-a6)]" />
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      </RToolbar.Root>
    </Tooltip.Provider>
  );
}

/** Reusable icon button with Radix Tooltip baked in */
function IconButton({
  tooltip,
  className = "",
  children,
  ...btn
}: React.ComponentProps<"button"> & { tooltip: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          {...btn}
          className={[
            "inline-flex items-center justify-center",
            "rounded-xl border border-[var(--gray-a6)]",
            "bg-[var(--gray-2)]/60 hover:bg-[var(--gray-3)] active:bg-[var(--gray-4)]",
            "px-2.5 py-1.5",
            "text-[var(--gray-12)] shadow-[0_1px_0_0_var(--gray-a3)_inset]",
            "disabled:opacity-50 disabled:pointer-events-none",
            "transition-colors",
            className,
          ].join(" ")}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content
        sideOffset={8}
        className="rounded-md border border-[var(--gray-a6)] bg-[var(--color-panel)] px-2 py-1 text-xs text-[var(--gray-12)] shadow"
      >
        {tooltip}
        <Tooltip.Arrow className="fill-[var(--gray-a6)]" />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
