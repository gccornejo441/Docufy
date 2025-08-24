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
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-[var(--gray-12)]">Extracted Text</h2>

        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={onDownload}
                type="button"
                disabled={disabled || !canMakeSearchable}
                className="px-4 py-2 rounded
                           bg-[var(--mint-9)] text-[var(--gray-1)]
                           hover:bg-[var(--mint-10)]
                           disabled:opacity-50
                           focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)]"
              >
                Download Searchable PDF
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="rounded bg-[var(--gray-12)] text-[var(--gray-1)] px-3 py-1 text-xs shadow-[var(--shadow-3)]"
                sideOffset={6}
              >
                {canMakeSearchable ? "" : (titleWhenDisabled || "Endpoint not available yet")}
                <Tooltip.Arrow className="fill-[var(--gray-12)]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>

      <TextArea
        rows={18}
        value={text}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
        placeholder="OCR output will appear here…"
        className="w-full border border-[var(--gray-a7)] rounded-lg p-3 font-mono text-sm
                   bg-[var(--color-panel-solid)] text-[var(--gray-12)]
                   shadow-[var(--shadow-2)]
                   focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)]"
      />
    </section>
  );
}
