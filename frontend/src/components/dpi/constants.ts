export const DEFAULT_DPI = 300;
export const MIN_DPI = 72;
export const MAX_DPI = 600;
export const DPI_STORAGE_KEY = "docuocr:dpi";

export type PresetKey = "fast" | "balanced" | "detailed" | "ultra" | "custom";
export const PRESETS: Record<Exclude<PresetKey, "custom">, number> = {
  fast: 150,
  balanced: 300,
  detailed: 400,
  ultra: 600,
};

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
