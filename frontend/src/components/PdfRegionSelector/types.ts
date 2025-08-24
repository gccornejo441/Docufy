export type RectPx = { x: number; y: number; w: number; h: number };
export type ViewportSize = { w: number; h: number };

export type ExtractMethod = "pdf" | "ocr" | "unknown";

export interface ExtractResult {
  text: string;
  method?: ExtractMethod;
}
