import React, { useRef, useState } from "react";

import { usePdfDocument } from "./hooks/usePdfDocument";
import { usePdfRenderer } from "./hooks/usePdfRenderer";
import { useDragSelection } from "./hooks/useDragSelection";
import { useExtractRegion } from "./hooks/useExtractRegion";

import Toolbar from "./ui/Toolbar";
import PdfCanvas from "./ui/PdfCanvas";
import SelectionOverlay from "./ui/SelectionOverlay";
import ResultPanel from "./ui/ResultPanel";

import type { ViewportSize } from "./types";

export interface PdfRegionSelectorProps {
  fileUrl: string;
  file: File;
  lang: string;
  apiBase?: string;
  initialScale?: number;
  children?: React.ReactNode;
  onResult?: (r: { text: string; method?: "pdf" | "ocr" }) => void;
}

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

  const { pdf, numPages, error: loadError } = usePdfDocument(fileUrl);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(initialScale);

  const { viewportSize, isRendering, renderError } =
    usePdfRenderer(pdf, canvasRef, pageNumber, scale);

  const { rect, setRect, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, canExtract } =
    useDragSelection(overlayRef);

  const { extracting, error: extractError, result, extract } =
    useExtractRegion({ pdf, file, lang, apiBase });

  const error = loadError || renderError || extractError;

  const fitToWidth = async () => {
    if (!pdf || !scrollRef.current) return;
    const page = await pdf.getPage(pageNumber);
    const vp1 = page.getViewport({ scale: 1 });
    const available = scrollRef.current.clientWidth - 16;
    const next = Math.max(0.5, Math.min(4, +(available / vp1.width).toFixed(2)));
    setScale(next);
  };

  const doExtract = async () => {
    if (!rect) return;
    const r = await extract(rect, pageNumber, scale);
    if (r && onResult) onResult(r);
  };

  const hasPdf = !!pdf;

  return (
    <div className="h-full flex gap-3">
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <Toolbar
          hasPdf={hasPdf}
          pageNumber={pageNumber}
          numPages={numPages}
          scale={scale}
          onPrev={() => setPageNumber((p) => Math.max(1, p - 1))}
          onNext={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          onZoomOut={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
          onZoomIn={() => setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)))}
          onFit={fitToWidth}
          onClearSelection={() => setRect(null)}
          canExtract={canExtract}
          extracting={extracting}
          onExtract={doExtract}
        />
        <div className="relative rounded border bg-[var(--color-panel-solid)]"
             style={{ width: "100%", height: "calc(100% - 44px)" }}>
          <div ref={scrollRef} className="absolute inset-0 overflow-auto">
            <div className="min-w-max mx-auto p-2">
              <div className="relative inline-block"
                   style={{ width: viewportSize.w, height: viewportSize.h }}>
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
            <div className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-black/60 text-white">
              Rendering…
            </div>
          )}
        </div>
      </div>
      <ResultPanel
        error={error}
        result={result || null}
        onCopy={() => { if (result?.text) navigator.clipboard.writeText(result.text).catch(() => {}); }}
      >
        {children}
      </ResultPanel>
    </div>
  );
}
