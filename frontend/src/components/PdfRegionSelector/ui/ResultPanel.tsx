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
            <div className="text-sm text-neutral-700 dark:text-neutral-300">
                Draw a rectangle on the page, then click{" "}
                <b className="font-semibold">Extract Selection</b>.
            </div>

            {/* Results area */}
            <div
                className={[
                    "flex-1 rounded border p-3 overflow-auto whitespace-pre-wrap",
                    "bg-neutral-50 dark:bg-neutral-900",
                    "border-neutral-300 dark:border-neutral-700",
                ].join(" ")}
            >
                {error ? (
                    <div className="text-sm text-red-600 dark:text-red-400 break-words">
                        {error}
                    </div>
                ) : result ? (
                    <>
                        <div className="mb-1 text-xs text-neutral-600 dark:text-neutral-400">
                            Method:{" "}
                            <code className="px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800">
                                {result.method ?? "unknown"}
                            </code>
                        </div>
                        <div className="text-sm text-neutral-900 dark:text-neutral-100">
                            {result.text || <em>(no text)</em>}
                        </div>
                    </>
                ) : (
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        No extraction yet.
                    </div>
                )}
            </div>

            {/* Copy button */}
            <button
                className={[
                    "inline-flex items-center justify-center gap-2",
                    "rounded-md px-3 py-2 text-sm font-semibold shadow-sm",
                    "bg-[var(--mint-9)] text-neutral-900 dark:text-neutral-900 hover:bg-[var(--mint-10)]",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--mint-11)]",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "transition-all",
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
