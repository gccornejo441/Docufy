// src/lib/api.ts
import type { ExtractResponse } from "./types";

/** Vite env is typed via vite-env.d.ts; no `any` cast needed */
export const API_BASE: string = import.meta.env?.VITE_API_BASE ?? "";

/** Typed HTTP error you can catch in hooks (has `.code` like your current logic expects) */
export class HttpError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "HttpError";
    this.code = code;
  }
}

type ErrorJson = { detail?: string };

async function parseJsonMaybe<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function extract(params: {
  file: File;
  dpi?: number;
  lang?: string;
}): Promise<ExtractResponse> {
  const { file, dpi, lang } = params;
  const fd = new FormData();
  fd.append("file", file);
  if (dpi != null) fd.append("dpi", String(dpi));
  if (lang) fd.append("lang", lang);

  const res = await fetch(`${API_BASE}/extract`, { method: "POST", body: fd });
  if (!res.ok) {
    const j = await parseJsonMaybe<ErrorJson>(res);
    throw new HttpError(j?.detail || `Extract failed (${res.status})`, res.status);
  }
  const data = (await res.json()) as ExtractResponse;
  return data;
}

export async function makeSearchable(params: {
  file: File;
  dpi?: number;
  lang?: string;
}): Promise<Blob> {
  const { file, dpi, lang } = params;
  const fd = new FormData();
  fd.append("file", file);
  if (dpi != null) fd.append("dpi", String(dpi));
  if (lang) fd.append("lang", lang);

  const res = await fetch(`${API_BASE}/make-searchable`, { method: "POST", body: fd });
  if (!res.ok) {
    const j = await parseJsonMaybe<ErrorJson>(res);
    throw new HttpError(j?.detail || `Searchable PDF not available (${res.status})`, res.status);
  }
  return res.blob();
}
