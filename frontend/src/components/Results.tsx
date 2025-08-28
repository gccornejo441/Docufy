import { TextArea } from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import React from "react";

type ResultsProps = {
  text: string;
  setText: (v: string) => void;
  canMakeSearchable: boolean;
  onDownload: () => void;
  disabled?: boolean;
  titleWhenDisabled?: string;
};

export default function Results({
  text,
  setText,
  canMakeSearchable,
  onDownload,
  disabled,
  titleWhenDisabled,
}: ResultsProps) {
  const isDisabled = disabled || !canMakeSearchable;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-[var(--gray-12)]">Extracted Text</h2>

        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span
                className={isDisabled ? "inline-flex cursor-not-allowed" : "inline-flex"}
                tabIndex={isDisabled ? 0 : -1}
                aria-disabled={isDisabled}
              >
                <button
                  onClick={onDownload}
                  type="button"
                  disabled={isDisabled}
                  className="px-4 py-2 rounded border border-[var(--mint-a6)]
                             bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]
                             hover:bg-[var(--btn-primary-bg-hover)]
                             disabled:opacity-50 disabled:pointer-events-none
                             focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                >
                  Download Searchable PDF
                </button>
              </span>
            </Tooltip.Trigger>
            {isDisabled && (
              <Tooltip.Portal>
                <Tooltip.Content
                  className="z-[70] rounded-md border border-[var(--gray-a6)]
                             bg-[var(--color-panel)] px-3 py-1 text-xs text-[var(--gray-12)] shadow"
                  sideOffset={6}
                >
                  {titleWhenDisabled || "Endpoint not available yet"}
                  <Tooltip.Arrow className="fill-[var(--gray-a6)]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>

      <TextArea
        rows={18}
        value={text}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
        placeholder="OCR output will appear here…"
        className="w-full border border-[var(--gray-a6)] rounded-lg p-3 font-mono text-sm
                   bg-[var(--surface-1)] text-[var(--gray-12)]
                   placeholder:text-[var(--gray-9)]
                   shadow-[var(--shadow-2)]
                   focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
      />
    </section>
  );
}
