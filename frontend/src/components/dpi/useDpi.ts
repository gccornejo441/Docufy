import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DPI,
  MIN_DPI,
  MAX_DPI,
  DPI_STORAGE_KEY,
  PRESETS,
  clamp,
} from "./constants";
import type { PresetKey } from "./constants";

type UseDpiOptions = {
  value?: number;
  onChange?: (next: number) => void;
  storageKey?: string;
};

export function useDpi(options: UseDpiOptions = {}) {
  const { value, onChange, storageKey = DPI_STORAGE_KEY } = options;
  const controlled =
    typeof value === "number" && typeof onChange === "function";

  const [internal, setInternal] = useState<number>(() => {
    if (controlled) return clamp(value!, MIN_DPI, MAX_DPI);
    const saved = Number(localStorage.getItem(storageKey));
    return Number.isFinite(saved)
      ? clamp(saved, MIN_DPI, MAX_DPI)
      : DEFAULT_DPI;
  });

  useEffect(() => {
    if (controlled) setInternal(clamp(value!, MIN_DPI, MAX_DPI));
  }, [controlled, value]);

  const setDpi = (next: number) => {
    const v = clamp(Math.round(next), MIN_DPI, MAX_DPI);
    onChange?.(v);
    if (!controlled) {
      setInternal(v);
      try {
        localStorage.setItem(storageKey, String(v));
      } catch {
        // ignore
      }
    }
  };

  const preset: PresetKey = useMemo(() => {
    if (internal === PRESETS.fast) return "fast";
    if (internal === PRESETS.balanced) return "balanced";
    if (internal === PRESETS.detailed) return "detailed";
    if (internal === PRESETS.ultra) return "ultra";
    return "custom";
  }, [internal]);

  const selectPreset = (key: PresetKey) => {
    if (key === "custom") return;
    setDpi(PRESETS[key]);
  };

  const reset = () => setDpi(DEFAULT_DPI);

  const speedFactor = Math.max(0.25, Math.min(2.5, internal / DEFAULT_DPI));
  const sizeFactor = speedFactor;

  return {
    dpi: internal,
    setDpi,
    preset,
    selectPreset,
    reset,
    speedFactor,
    sizeFactor,
    controlled,
  };
}
