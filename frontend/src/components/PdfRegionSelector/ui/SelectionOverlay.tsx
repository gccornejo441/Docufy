import React from "react";
import type { RectPx, ViewportSize } from "../types";


interface Props {
    overlayRef: React.RefObject<HTMLDivElement>;
    viewportSize: ViewportSize;
    rect: RectPx | null;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
}


export default function SelectionOverlay({ overlayRef, viewportSize, rect, onMouseDown, onMouseMove, onMouseUp, onMouseLeave }: Props) {
    return (
        <div
            ref={overlayRef}
            className="absolute left-0 top-0 cursor-crosshair"
            style={{ width: viewportSize.w, height: viewportSize.h }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
        >
            {rect && (
                <div
                    style={{
                        position: "absolute",
                        left: rect.x,
                        top: rect.y,
                        width: rect.w,
                        height: rect.h,
                        border: "2px solid var(--mint-9)",
                        background: "color-mix(in srgb, var(--mint-9) 25%, transparent)",
                        pointerEvents: "none",
                    }}
                />
            )}
        </div>
    );
}