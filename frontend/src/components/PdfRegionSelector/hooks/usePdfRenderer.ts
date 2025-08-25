import { useEffect, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { RenderTask, RenderParameters } from "pdfjs-dist/types/src/display/api";
import type { ViewportSize } from "../types";

export function usePdfRenderer(
  pdf: PDFDocumentProxy | null,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  pageNumber: number,
  scale: number,
  rotation: 0 | 90 | 180 | 270 = 0
) {
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ w: 0, h: 0 });
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    if (!pdf || !canvasRef.current) return;

    (async () => {
      setIsRendering(true);
      setRenderError(null);

      try {
        const _page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        setPage(_page);

        const baseRot = _page.rotate ?? 0;
        const effectiveRotation = ((baseRot + rotation) % 360) as 0 | 90 | 180 | 270;

        const viewport = _page.getViewport({ scale, rotation: effectiveRotation });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("2D context unavailable");

        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr));

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        setViewportSize({ w: viewport.width, h: viewport.height });

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const params: RenderParameters = {
          canvasContext: ctx,
          canvas,                
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
          intent: "display",
        };

        renderTask = _page.render(params);
        await renderTask.promise;
      } catch (e: unknown) {
        if (!cancelled) {
          const name =
            typeof e === "object" && e !== null && "name" in e
              ? String((e as { name?: unknown }).name)
              : "";
          if (name !== "RenderingCancelledException") {
            setRenderError(String(e));
          }
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        /* noop */
      }
    };
  }, [pdf, pageNumber, scale, rotation, canvasRef]);

  return { viewportSize, isRendering, renderError, page };
}
