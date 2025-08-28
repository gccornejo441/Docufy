import { useState } from "react";
import type { RectPx } from "../types";

export function useDragSelection(overlayRef: React.RefObject<HTMLDivElement>) {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [rect, setRect] = useState<RectPx | null>(null);

  const clampToOverlay = (x: number, y: number) => {
    const el = overlayRef.current;
    if (!el) return { x, y };
    const r = el.getBoundingClientRect();
    const cx = Math.max(0, Math.min(x - r.left, r.width));
    const cy = Math.max(0, Math.min(y - r.top, r.height));
    return { x: cx, y: cy };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (!overlayRef.current) return;
    e.preventDefault();
    const { x, y } = clampToOverlay(e.clientX, e.clientY);
    setDragStart({ x, y });
    setRect({ x, y, w: 0, h: 0 });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart || !overlayRef.current) return;
    const { x, y } = clampToOverlay(e.clientX, e.clientY);
    setRect({
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      w: Math.abs(x - dragStart.x),
      h: Math.abs(y - dragStart.y),
    });
  };

  const finish = () => {
    setDragStart(null);
    setRect((r) => (r && r.w < 6 && r.h < 6 ? null : r));
  };

  const onMouseUp = () => finish();

  // IMPORTANT: Do NOT clear on mouse leave.
  const onMouseLeave = () => {
    if (dragStart) {
      setDragStart(null);
    }
  };

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
