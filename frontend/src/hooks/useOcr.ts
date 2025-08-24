import { useCallback, useRef, useState } from "react";
import { extract, makeSearchable } from "../lib/api";
import type { ExtractResponse } from "../lib/types";

type Init = { dpi?: number; lang?: string };

export function useOcr(initial: Init = { dpi: 360, lang: "eng" }) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isUploading, setUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [dpi, setDpi] = useState<number>(initial.dpi ?? 360);
  const [lang, setLang] = useState<string>(initial.lang ?? "eng");
  const [canMakeSearchable, setCanMakeSearchable] = useState<boolean>(true);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const onBrowseClick = useCallback(() => inputRef.current?.click(), []);

  const reset = useCallback(() => {
    setFile(null);
    setText("");
    setError("");
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const runOcr = useCallback(async (): Promise<ExtractResponse | void> => {
    if (!file) return;
    setUploading(true);
    setError("");
    setText("");

    try {
      const data = await extract({ file, dpi, lang });
      setText(data?.text || "");
      return data;
    } catch (err) {
      setError((err as Error).message || String(err));
    } finally {
      setUploading(false);
    }
  }, [file, dpi, lang]);

  const downloadSearchable = useCallback(async () => {
    if (!file) return;
    setError("");

    try {
      const blob = await makeSearchable({ file, dpi, lang });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = (file.name?.replace(/\.[^.]+$/, "") || "document") + "_searchable.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const e = err as Error & { code?: number };
      if (e.code) setCanMakeSearchable(false);
      setError(e.message || String(e));
    }
  }, [file, dpi, lang]);

  return {
    file,
    setFile,
    text,
    setText,
    error,
    setError,
    isUploading,
    dragActive,
    dpi,
    setDpi,
    lang,
    setLang,
    canMakeSearchable,
    inputRef,
    onBrowseClick,
    reset,
    onDragOver,
    onDragLeave,
    onDrop,
    onFileChange,
    runOcr,
    downloadSearchable,
  } as const;
}
