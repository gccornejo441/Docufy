import { useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { RectPx } from "../types";

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

  const extract = async (
    rect: RectPx,
    pageNumber: number,
    scale: number,
    rotation: 0 | 90 | 180 | 270
  ) => {
    if (!pdf) return;
    setError(null);
    setExtracting(true);
    try {
      const page: PDFPageProxy = await pdf.getPage(pageNumber);
      const baseRot = (page.rotate ?? 0) as 0 | 90 | 180 | 270;
      const effRot = ((baseRot + rotation) % 360) as 0 | 90 | 180 | 270;

      const viewport = page.getViewport({ scale, rotation: effRot });

      const x = rect.x / viewport.width;
      const y = rect.y / viewport.height;
      const w = rect.w / viewport.width;
      const h = rect.h / viewport.height;

      const form = new FormData();
      form.append("file", file);
      form.append("page", String(pageNumber));
      form.append("x", String(x));
      form.append("y", String(y));
      form.append("w", String(w));
      form.append("h", String(h));
      form.append("rotation", String(effRot));
      form.append("lang", lang);
      form.append("debug", "1"); 

      const res = await fetch(`${apiBase}/extract/region`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `HTTP ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`
        );
      }
      const data: { text: string } = await res.json();
      const r: ExtractResult = { text: data.text || "", method: "ocr" };
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
