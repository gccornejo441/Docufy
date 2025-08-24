import * as Label from "@radix-ui/react-label";

interface ControlsProps {
  dpi: number;
  setDpi: (v: number) => void;
  lang: string;
  setLang: (v: string) => void;
  onReset: () => void;
  onRun: () => void;
  isUploading: boolean;
  isDocReady: boolean;
  onOpenDoc: () => void;
}

export default function Controls({
  dpi,
  setDpi,
  lang,
  setLang,
  onReset,
  onRun,
  isUploading,
  isDocReady,
  onOpenDoc,
}: ControlsProps) {
  return (
    <section className="flex flex-wrap gap-4 items-end">
      <div>
        <Label.Root htmlFor="dpi" className="block text-sm text-[var(--gray-11)] mb-1">
          DPI
        </Label.Root>
        <input
          id="dpi"
          type="number"
          className="w-28 px-3 py-2 rounded border
                     bg-[var(--color-panel-solid)]
                     border-[var(--gray-a7)]
                     text-[var(--gray-12)]
                     placeholder-[var(--gray-10)]
                     focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)]"
          value={dpi}
          onChange={(e) => setDpi(Number(e.target.value) || 0)}
          min={72}
          step={12}
          inputMode="numeric"
        />
      </div>

      <div>
        <Label.Root htmlFor="lang" className="block text-sm text-[var(--gray-11)] mb-1">
          Language
        </Label.Root>
        <input
          id="lang"
          type="text"
          className="w-40 px-3 py-2 rounded border
                     bg-[var(--color-panel-solid)]
                     border-[var(--gray-a7)]
                     text-[var(--gray-12)]
                     placeholder-[var(--gray-10)]
                     focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)]"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          placeholder="eng or eng+spa"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      <div className="ml-auto flex gap-3">
        <button
          type="button"
          onClick={onOpenDoc}
          disabled={!isDocReady}
          className="px-4 py-2 rounded
                 bg-[var(--mint-9)] text-[var(--gray-1)]
                     hover:bg-[var(--mint-10)]
                     disabled:opacity-60 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)]"
        >
          Open Viewer
        </button>

        <button
          className="px-4 py-2 rounded
                     bg-[var(--gray-5)] text-[var(--gray-12)]
                     hover:bg-[var(--gray-6)]
                     focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)]"
          onClick={onReset}
          type="button"
        >
          Reset
        </button>

        <button
          className="px-4 py-2 rounded
                     bg-[var(--mint-9)] text-[var(--gray-1)]
                     hover:bg-[var(--mint-10)]
                     disabled:opacity-60
                     focus:outline-none focus:ring-2 focus:ring-[var(--mint-9)]"
          onClick={onRun}
          disabled={isUploading}
          type="button"
        >
          {isUploading ? "Processing…" : "Run OCR"}
        </button>
      </div>
    </section>
  );
}
