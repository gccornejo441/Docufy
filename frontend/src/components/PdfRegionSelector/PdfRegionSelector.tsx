import React, { useRef, useState, useCallback, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import { usePdfDocument } from "./hooks/usePdfDocument";
import { usePdfRenderer } from "./hooks/usePdfRenderer";
import { useDragSelection } from "./hooks/useDragSelection";
import { useExtractRegion } from "./hooks/useExtractRegion";

import Toolbar from "./ui/Toolbar";
import PdfCanvas from "./ui/PdfCanvas";
import SelectionOverlay from "./ui/SelectionOverlay";
import ResultPanel from "./ui/ResultPanel";

import type { ViewportSize } from "./types";
import { useTheme } from "../../provider/useTheme";

export interface PdfRegionSelectorProps {
  fileUrl: string;
  file: File;
  lang: string;
  apiBase?: string;
  initialScale?: number;
  children?: React.ReactNode;
  onResult?: (r: { text: string; method?: "pdf" | "ocr" }) => void;
}

type FitMode = "page" | "width" | null;

const EPS = 0.02;
const SAFE_INSET = 1;

export default function PdfRegionSelector({
  fileUrl,
  file,
  lang,
  apiBase = "",
  initialScale = 1.5,
  children,
  onResult,
}: PdfRegionSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const overlayRef = useRef<HTMLDivElement>(null!);
  const scrollRef = useRef<HTMLDivElement>(null!);
  const frameRef = useRef<HTMLDivElement>(null!);

  const { pdf, numPages, error: loadError } = usePdfDocument(fileUrl);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(initialScale);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [fitMode, setFitMode] = useState<FitMode>("page");

  const { viewportSize, isRendering, renderError } =
    usePdfRenderer(pdf, canvasRef, pageNumber, scale, rotation);

  const { rect, setRect, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, canExtract } =
    useDragSelection(overlayRef);

  const { extracting, error: extractError, result, extract } =
    useExtractRegion({ pdf, file, lang, apiBase });

  const error = loadError || renderError || extractError;

  const didFirstFit = useRef(false);
  const [visible, setVisible] = useState(false);
  const [mobileResultsOpen, setMobileResultsOpen] = useState(false);

  const { theme } = useTheme();

  const getAvailableBox = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return { w: 0, h: 0 };
    return {
      w: Math.max(1, el.clientWidth - SAFE_INSET),
      h: Math.max(1, el.clientHeight - SAFE_INSET),
    };
  }, []);

  const computeFitPageScale = useCallback(async () => {
    if (!pdf) return scale;
    const page = await pdf.getPage(pageNumber);
    const baseRot = page.rotate ?? 0;
    const vp1 = page.getViewport({ scale: 1, rotation: (baseRot + rotation) % 360 });
    const { w: availW, h: availH } = getAvailableBox();
    const raw = Math.min(availW / vp1.width, availH / vp1.height);
    return Math.min(4, Math.max(0.25, Math.round(raw * 100) / 100));
  }, [pdf, pageNumber, rotation, getAvailableBox, scale]);

  const computeFitWidthScale = useCallback(async () => {
    if (!pdf) return scale;
    const page = await pdf.getPage(pageNumber);
    const baseRot = page.rotate ?? 0;
    const vp1 = page.getViewport({ scale: 1, rotation: (baseRot + rotation) % 360 });
    const { w: availW } = getAvailableBox();
    const raw = availW / vp1.width;
    return Math.min(4, Math.max(0.25, Math.round(raw * 100) / 100));
  }, [pdf, pageNumber, rotation, getAvailableBox, scale]);

  const computeScaleForMode = useCallback(
    async (mode: Exclude<FitMode, null>) =>
      mode === "page" ? computeFitPageScale() : computeFitWidthScale(),
    [computeFitPageScale, computeFitWidthScale]
  );

  const fitToPage = useCallback(async () => {
    setFitMode("page");
    const next = await computeFitPageScale();
    setScale(next);
    setRect(null);
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [computeFitPageScale, setRect]);

  const fitToWidth = useCallback(async () => {
    setFitMode("width");
    const next = await computeFitWidthScale();
    setScale(next);
    setRect(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [computeFitWidthScale, setRect]);

  const zoomOut = useCallback(() => {
    setFitMode(null);
    setScale((s) => Math.max(0.5, Math.round((s - 0.25) * 100) / 100));
  }, []);
  const zoomIn = useCallback(() => {
    setFitMode(null);
    setScale((s) => Math.min(4, Math.round((s + 0.25) * 100) / 100));
  }, []);

  const rotateRight = useCallback(() => {
    setRotation((r) => (((r + 90) % 360) as 0 | 90 | 180 | 270));
  }, []);
  const rotateLeft = useCallback(() => {
    setRotation((r) => (((r + 270) % 360) as 0 | 90 | 180 | 270));
  }, []);
  const resetRotation = useCallback(() => setRotation(0), []);

  useEffect(() => {
    if (!pdf || didFirstFit.current) return;
    let cancelled = false;
    requestAnimationFrame(async () => {
      if (cancelled) return;
      const mode = fitMode ?? "page";
      const next = await computeScaleForMode(mode);
      setScale(next);
      didFirstFit.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, fitMode, computeScaleForMode]);

  useEffect(() => {
    if (didFirstFit.current && !isRendering) setVisible(true);
  }, [isRendering]);

  useEffect(() => {
    if (!pdf || fitMode == null || isRendering) return;
    (async () => {
      const next = await computeScaleForMode(fitMode);
      setScale((prev) => (Math.abs(prev - next) >= EPS ? next : prev));
      setRect(null);
      scrollRef.current?.scrollTo({ top: 0, left: 0 });
    })();
  }, [rotation, pdf, fitMode, computeScaleForMode, isRendering, setRect]);

  useEffect(() => {
    if (!pdf || fitMode == null) return;
    let cleanup: (() => void) | undefined;
    const recompute = async () => {
      const next = await computeScaleForMode(fitMode);
      setScale((prev) => (Math.abs(prev - next) >= EPS ? next : prev));
    };

    void recompute();

    if (typeof window !== "undefined" && theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => void recompute();
      mql.addEventListener("change", onChange);
      cleanup = () => mql.removeEventListener("change", onChange);
    }
    return cleanup;
  }, [theme, pdf, fitMode, computeScaleForMode]);

  useEffect(() => {
    if (!pdf || !didFirstFit.current || fitMode == null || !scrollRef.current) return;
    let scheduled = false;
    const prevBox = { w: 0, h: 0 };
    const measure = () => getAvailableBox();
    const onResize = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(async () => {
        scheduled = false;
        const { w, h } = measure();
        if (Math.abs(w - prevBox.w) < 1 && Math.abs(h - prevBox.h) < 1) return;
        prevBox.w = w;
        prevBox.h = h;
        if (isRendering) return;
        const next = await computeScaleForMode(fitMode);
        setScale((prev) => (Math.abs(prev - next) >= EPS ? next : prev));
      });
    };
    const init = measure();
    prevBox.w = init.w;
    prevBox.h = init.h;
    const ro = new ResizeObserver(onResize);
    ro.observe(scrollRef.current!);
    return () => ro.disconnect();
  }, [pdf, fitMode, computeScaleForMode, getAvailableBox, isRendering]);

  const doExtract = useCallback(async () => {
    if (!rect) return;
    const r = await extract(rect, pageNumber, scale, rotation);
    if (r && onResult) onResult(r);
  }, [rect, extract, pageNumber, scale, rotation, onResult]);

  return (
    <div className="h-full flex flex-col">
      {/* Sticky header bar: flat corners, subtle separation */}
      <div
        className={[
          "sticky top-0 z-20 mb-2",
          "backdrop-blur supports-[backdrop-filter]:backdrop-blur-md",
          "bg-[var(--surface-1)]"
        ].join(" ")}
      >
        <Toolbar
          hasPdf={!!pdf}
          pageNumber={pageNumber}
          numPages={numPages}
          scale={scale}
          rotation={rotation}
          onPrev={() => setPageNumber((p) => Math.max(1, p - 1))}
          onNext={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          onZoomOut={zoomOut}
          onZoomIn={zoomIn}
          onFitPage={fitToPage}
          onFitWidth={fitToWidth}
          onRotateLeft={rotateLeft}
          onRotateRight={rotateRight}
          onResetRotation={resetRotation}
          onClearSelection={() => setRect(null)}
          canExtract={canExtract}
          extracting={extracting}
          onExtract={doExtract}
        />
      </div>

      <div className="flex-1 grid gap-3 min-[957px]:grid-cols-[1fr_minmax(280px,36%)]">
        <div className="flex-1 min-w-0 flex flex-col">
          <div
            className="relative rounded-lg border border-[var(--gray-a6)] bg-[var(--surface-1)] shadow-sm flex-1"
            style={{ width: "100%" }}
          >
            <div
              ref={scrollRef}
              className="absolute inset-0 overflow-auto overscroll-contain"
              style={{ scrollbarGutter: "stable both-edges" }}
            >
              <div
                ref={frameRef}
                className={[
                  "min-h-full min-w-full p-4 grid place-items-center",
                  "transition-opacity duration-150",
                  visible ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                <div className="relative" style={{ width: viewportSize.w, height: viewportSize.h }}>
                  <PdfCanvas canvasRef={canvasRef} viewportSize={viewportSize as ViewportSize} />
                  <SelectionOverlay
                    overlayRef={overlayRef}
                    viewportSize={viewportSize}
                    rect={rect}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseLeave}
                  />
                </div>
              </div>
            </div>
            {isRendering && (
              <div className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded-md bg-[var(--gray-a12)] text-[var(--gray-1)]">
                Rendering…
              </div>
            )}
          </div>
        </div>

        <div className="hidden min-[957px]:block">
          <ResultPanel
            error={error}
            result={result || null}
            onCopy={() => {
              if (result?.text) navigator.clipboard.writeText(result.text).catch(() => { });
            }}
          >
            {children}
          </ResultPanel>
        </div>
      </div>

      {/* Floating “Results” button on mobile */}
      <button
        type="button"
        onClick={() => setMobileResultsOpen(true)}
        className={[
          "fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-20",
          "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold shadow-lg",
          "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] ring-1 ring-[var(--indigo-a6)]",
          "hover:bg-[var(--btn-primary-bg-hover)] active:translate-y-[0.5px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]",
          "min-[957px]:hidden",
        ].join(" ")}
        aria-label="Open results"
      >
        Results
        {result?.text && (
          <span className="ml-0.5 rounded-full px-1 text-[10px] leading-4 bg-[var(--gray-a3)] text-[var(--indigo-11)]">
            new
          </span>
        )}
      </button>

      {/* Mobile results drawer */}
      <Dialog.Root open={mobileResultsOpen} onOpenChange={setMobileResultsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="min-[957px]:hidden fixed inset-0 z-30 bg-[var(--gray-a8)] backdrop-blur-[2px]" />
          <Dialog.Content
            className={[
              "min-[957px]:hidden fixed inset-x-0 bottom-0 z-40",
              "h-[72vh] max-h-[85vh] rounded-t-2xl border border-[var(--gray-a6)]",
              "bg-[var(--surface-1)] text-[var(--gray-12)] shadow-2xl flex flex-col",
            ].join(" ")}
          >
            <div className="flex-1 min-h-0 overflow-auto">
              <ResultPanel
                error={error}
                result={result || null}
                onCopy={() => {
                  if (result?.text) navigator.clipboard.writeText(result.text).catch(() => { });
                }}
              >
                {children}
              </ResultPanel>
            </div>
            <Dialog.Close
              className="m-2 rounded-md bg-[var(--gray-4)] hover:bg-[var(--gray-5)] px-3 py-1 text-sm text-[var(--gray-12)]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]
                         focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]"
            >
              Close
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
