import React from "react";
import type { ViewportSize } from "../types";

export default function PdfCanvas({
    canvasRef,
    viewportSize,
}: {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    viewportSize: ViewportSize;
}) {
    return (
        <div
            className="relative inline-block"
            style={{ width: viewportSize.w, height: viewportSize.h }}
        >
            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
        </div>
    );
}
