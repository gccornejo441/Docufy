import React from "react";
import type { ExtractResult } from "../types";

export default function ResultPanel({
    error,
    result,
    onCopy,
    children,
}: {
    error: string | null;
    result: ExtractResult | null;
    onCopy: () => void;
    children?: React.ReactNode;
}) {
    return (
        <aside className="flex flex-col gap-3 h-full">
            {/* Instruction */}
            <div className="text-sm text-[var(--gray-11)]">
                Draw a rectangle on the page, then click{" "}
                <b className="font-semibold">Extract Selection</b>.
            </div>

            {/* Results area */}
            <div
                className={[
                    "flex-1 rounded-xl border p-3 overflow-auto whitespace-pre-wrap",
                    "border-[var(--gray-a6)] bg-[var(--surface-1)] shadow-sm",
                ].join(" ")}
                aria-live="polite"
            >
                {error ? (
                    <div className="text-sm text-[var(--tomato-11)] break-words">{error}</div>
                ) : result ? (
                    <>
                        <div className="mb-1 text-xs text-[var(--gray-10)]">
                            Method:{" "}
                            <code className="px-1 py-0.5 rounded-md bg-[var(--gray-4)] text-[var(--gray-12)]">
                                {result.method ?? "unknown"}
                            </code>
                        </div>
                        <div className="text-sm text-[var(--gray-12)]">
                            {result.text || <em>(no text)</em>}
                        </div>
                    </>
                ) : (
                    <div className="text-sm text-[var(--gray-10)]">No extraction yet.</div>
                )}
            </div>

            {/* Copy button */}
            <button
                className={[
                    "inline-flex items-center justify-center gap-2",
                    "rounded-md px-3 py-2 text-sm font-medium",
                    "border border-[var(--gray-a6)]",
                    "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "transition-[background,transform] active:translate-y-[0.5px]",
                ].join(" ")}
                disabled={!result?.text}
                onClick={onCopy}
            >
                Copy text
            </button>

            {children}
        </aside>
    );
}
