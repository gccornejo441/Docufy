export type ClarityPreset = "auto" | "fast" | "standard" | "detailed" | "tiny";

export const DPI_PRESETS: Record<Exclude<ClarityPreset, "auto">, number> = {
  fast: 240,
  standard: 360,
  detailed: 400,
  tiny: 500,
};

export function presetToDpi(preset: ClarityPreset, fallbackDpi = 360): number | "auto" {
  if (preset === "auto") return "auto";
  return DPI_PRESETS[preset] ?? fallbackDpi;
}
