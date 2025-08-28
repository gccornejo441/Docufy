import { useEffect, useState } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import { useDpi } from "./useDpi";
import { MIN_DPI, MAX_DPI, PRESETS } from "./constants";
import type { PresetKey } from "./constants";

type Props = {
    value?: number;
    onChange?: (dpi: number) => void;
    storageKey?: string;
    className?: string;
};

export default function DpiSettings({ value, onChange, storageKey, className }: Props) {
    const { dpi, setDpi, preset, selectPreset, reset, speedFactor, sizeFactor } =
        useDpi({ value, onChange, storageKey });

    const [uiPreset, setUiPreset] = useState<PresetKey>(preset);

    useEffect(() => {
        if (uiPreset !== "custom") setUiPreset(preset);
    }, [preset, uiPreset]);

    const handlePresetChange = (val: string) => {
        if (!val) return;
        const key = val as PresetKey;
        setUiPreset(key);
        if (key !== "custom") selectPreset(key);
    };

    return (
        <div className={className}>
            <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium">Clarity</label>
                <Tooltip.Provider delayDuration={200}>
                    <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                            <button
                                className="p-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--mint-9)]"
                                aria-label="About clarity presets"
                            >
                                <Info className="w-4 h-4 opacity-70" />
                            </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                            <Tooltip.Content
                                className="max-w-[260px] text-xs leading-5 rounded-md px-3 py-2 shadow-md
                           bg-white text-neutral-900 border border-neutral-200
                           dark:bg-neutral-900 dark:text-neutral-50 dark:border-neutral-700"
                                side="top"
                                align="start"
                            >
                                Presets balance speed and quality. “Custom” lets you pick any DPI.
                                Higher DPI increases detail but can slow processing and create larger files.
                                <Tooltip.Arrow className="fill-neutral-200 dark:fill-neutral-700" />
                            </Tooltip.Content>
                        </Tooltip.Portal>
                    </Tooltip.Root>
                </Tooltip.Provider>
            </div>

            <ToggleGroup.Root
                type="single"
                value={uiPreset}
                onValueChange={handlePresetChange}
                className="inline-flex flex-wrap gap-2"
                aria-label="Choose clarity preset"
            >
                {([
                    ["fast", "Fast", PRESETS.fast],
                    ["balanced", "Balanced", PRESETS.balanced],
                    ["detailed", "Detailed", PRESETS.detailed],
                    ["ultra", "Ultra", PRESETS.ultra],
                    ["custom", "Custom", 0],
                ] as const).map(([key, label]) => (
                    <ToggleGroup.Item
                        key={key}
                        value={key}
                        className={
                            "px-3 py-1.5 rounded-md text-sm border " +
                            "data-[state=on]:bg-[var(--gray-3)] dark:data-[state=on]:bg-neutral-800 " +
                            "border-neutral-200 dark:border-neutral-700 " +
                            "outline-none focus-visible:ring-2 focus-visible:ring-[var(--mint-9)]"
                        }
                    >
                        {label}
                    </ToggleGroup.Item>
                ))}
            </ToggleGroup.Root>

            {uiPreset === "custom" && (
                <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min={MIN_DPI}
                            max={MAX_DPI}
                            step={2}
                            value={dpi}
                            onChange={(e) => setDpi(Number(e.target.value))}
                            className="w-full accent-[var(--mint-9)]"
                            aria-label="Custom DPI"
                            list="dpi-marks"
                        />
                        <input
                            type="number"
                            min={MIN_DPI}
                            max={MAX_DPI}
                            step={1}
                            value={dpi}
                            onChange={(e) => setDpi(Number(e.target.value))}
                            className="w-20 px-2 py-1 rounded-md border bg-white/70 dark:bg-neutral-900/70
                         border-neutral-200 dark:border-neutral-700"
                            aria-label="Custom DPI value"
                        />
                    </div>

                    <datalist id="dpi-marks">
                        <option value={PRESETS.fast} label="Fast" />
                        <option value={PRESETS.balanced} label="Balanced" />
                        <option value={PRESETS.detailed} label="Detailed" />
                        <option value={PRESETS.ultra} label="Ultra" />
                    </datalist>
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-[var(--gray-10)] mt-2">
                <span>
                    DPI: <strong>{dpi}</strong>{" "}
                    {uiPreset !== "custom" ? (
                        <em className="opacity-75">({uiPreset})</em>
                    ) : (
                        <em className="opacity-75">(custom)</em>
                    )}
                </span>
                <span>
                    Speed ~{speedFactor.toFixed(1)}× | Size ~{sizeFactor.toFixed(1)}×
                </span>
            </div>

            <div className="flex items-center justify-end mt-2">
                <button className="text-xs underline hover:opacity-80" onClick={reset}>
                    Reset to Balanced (300)
                </button>
            </div>
        </div>
    );
}
