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

export default function SelectionOverlay({
  overlayRef,
  viewportSize,
  rect,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}: Props) {
  return (
    <div
      ref={overlayRef}
      className="absolute left-0 top-0 cursor-crosshair select-none touch-none"
      style={{ width: viewportSize.w, height: viewportSize.h }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      aria-label="Selection overlay"
      role="presentation"
    >
      {rect && (
        <div
          className="selection-box"
          style={{
            position: "absolute",
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            border: "2px solid var(--focus-ring)",
            background: "color-mix(in srgb, var(--focus-ring) 22%, transparent)",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
