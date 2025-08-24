import { useState } from "react";
import type { RectPx } from "../types";

export function useDragSelection(overlayRef: React.RefObject<HTMLDivElement>) {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [rect, setRect] = useState<RectPx | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!overlayRef.current) return;
    const r = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setDragStart({ x, y });
    setRect({ x, y, w: 0, h: 0 });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart || !overlayRef.current) return;
    const r = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setRect({
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      w: Math.abs(x - dragStart.x),
      h: Math.abs(y - dragStart.y),
    });
  };

  const onMouseUp = () => setDragStart(null);
  const onMouseLeave = () => setDragStart(null);

  const canExtract = !!rect && rect.w > 6 && rect.h > 6;

  return {
    rect,
    setRect,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    canExtract,
  };
}
