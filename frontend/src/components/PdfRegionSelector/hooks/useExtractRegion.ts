// src/components/PdfRegionSelector/hooks/useExtractRegion.ts
import { useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { RectPx } from "../types";

type ViewportWithPdfPoint = {
  convertToPdfPoint: (x: number, y: number) => [number, number];
  width: number;
  height: number;
};

type ExtractResult = {
  text: string;
  method?: "pdf" | "ocr";
};

export function useExtractRegion(options: {
  pdf: PDFDocumentProxy | null;
  file: File;
  lang: string;
  apiBase?: string;
}) {
  const { pdf, file, lang, apiBase = "" } = options;
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);

  const extract = async (rect: RectPx, pageNumber: number, scale: number) => {
    if (!pdf) return;
    setError(null);
    setExtracting(true);
    try {
      const page: PDFPageProxy = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale }) as unknown as ViewportWithPdfPoint;

      const [x1Pdf, y1Pdf] = viewport.convertToPdfPoint(rect.x, rect.y);
      const [x2Pdf, y2Pdf] = viewport.convertToPdfPoint(rect.x + rect.w, rect.y + rect.h);

      const form = new FormData();
      form.append("file", file);
      form.append("pageNumber", String(pageNumber));
      form.append("x1", String(Math.min(x1Pdf, x2Pdf)));
      form.append("y1", String(Math.min(y1Pdf, y2Pdf)));
      form.append("x2", String(Math.max(x1Pdf, x2Pdf)));
      form.append("y2", String(Math.max(y1Pdf, y2Pdf)));
      form.append("ocr_lang", lang);

      const res = await fetch(`${apiBase}/extract-pdf-region`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`);
      }
      const data: { text: string; method?: "pdf" | "ocr"; error?: string } = await res.json();
      if (data.error) throw new Error(data.error);
      const r: ExtractResult = { text: data.text || "", method: data.method };
      setResult(r);
      return r;
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setError(err);
    } finally {
      setExtracting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { extracting, error, result, extract, reset };
}