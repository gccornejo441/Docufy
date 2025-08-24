import { useEffect, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { ViewportSize } from "../types";

export function usePdfRenderer(
  pdf: PDFDocumentProxy | null,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  pageNumber: number,
  scale: number
) {
  const [viewportSize, setViewportSize] = useState<ViewportSize>({
    w: 0,
    h: 0,
  });
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!pdf) return;

    (async () => {
      setIsRendering(true);
      setRenderError(null);
      try {
        const _page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        setPage(_page);

        const viewport = _page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        setViewportSize({ w: viewport.width, h: viewport.height });

        const renderTask = _page.render({
          canvasContext: ctx,
          canvas, // required for type correctness
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0], // HiDPI scaling
        });
        await renderTask.promise;
      } catch (e) {
        if (!cancelled) setRenderError(String(e));
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, scale, canvasRef]);

  return { viewportSize, isRendering, renderError, page };
}
