import React from "react";
import type { ExtractResult } from "../types";


export default function ResultPanel({ error, result, onCopy, children }: { error: string | null; result: ExtractResult | null; onCopy: () => void; children?: React.ReactNode; }) {
    return (
        <aside className="w-[28ch] shrink-0 flex flex-col gap-2">
            <div className="text-sm text-[var(--gray-11)]">Draw a rectangle on the page, then click <b>Extract Selection</b>.</div>


            <div className="rounded border p-2 bg-[var(--color-panel-solid)] min-h-[10rem] whitespace-pre-wrap">
                {error ? (
                    <div className="text-[crimson] text-sm break-words">{error}</div>
                ) : result ? (
                    <>
                        <div className="mb-1 text-xs text-[var(--gray-11)]">Method: <code>{result.method ?? "unknown"}</code></div>
                        <div className="text-sm">{result.text || <em>(no text)</em>}</div>
                    </>
                ) : (
                    <div className="text-sm text-[var(--gray-10)]">No extraction yet.</div>
                )}
            </div>


            <button className="px-3 py-1 rounded border hover:bg-[var(--gray-3)] disabled:opacity-60" disabled={!result?.text} onClick={onCopy}>Copy text</button>


            {children}
        </aside>
    );
}