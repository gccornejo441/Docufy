import { useEffect, useState } from "react";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs"; // ensure the worker is bundled

export function usePdfDocument(fileUrl: string | null) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPdf(null);
    setNumPages(1);
    setError(null);

    if (!fileUrl) return;

    (async () => {
      setLoading(true);
      try {
        const task = getDocument(fileUrl);
        const _pdf = await task.promise;
        if (cancelled) return;
        setPdf(_pdf);
        setNumPages(_pdf.numPages);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return { pdf, numPages, error, loading };
}
