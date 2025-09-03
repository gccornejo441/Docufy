import * as React from "react";

export interface ScreenshotOptions {
  fileNamePrefix?: string;
}

/**
 * Captures a single screenshot of a user-chosen screen/window/tab
 * and returns it as a PNG File.
 */
export async function captureScreenAsFile(
  options?: ScreenshotOptions
): Promise<File> {
  if (
    !("mediaDevices" in navigator) ||
    !navigator.mediaDevices.getDisplayMedia
  ) {
    throw new Error(
      "Screen capture is not supported in this browser or context."
    );
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.playsInline = true;

    const ensureMetadata = new Promise<void>((resolve) => {
      if (video.readyState >= 1) resolve();
      else video.onloadedmetadata = () => resolve();
    });

    await video.play();
    await ensureMetadata;

    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed."))),
        "image/png"
      );
    });

    const prefix = options?.fileNamePrefix ?? "screenshot";
    const timestamp = new Date()
      .toISOString()
      .replace(/[:]/g, "")
      .replace("T", "-")
      .slice(0, 15);

    const fileName = `${prefix}-${timestamp}.png`;

    video.pause();
    video.srcObject = null;

    return new File([blob], fileName, { type: "image/png" });
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

export interface UseScreenshotArgs {
  onCaptured?: (file: File) => void;
  onError?: (error: unknown) => void;
  options?: ScreenshotOptions;
}

export function useScreenshot(args?: UseScreenshotArgs) {
  const [isCapturing, setIsCapturing] = React.useState(false);

  const takeScreenshot = React.useCallback(async () => {
    setIsCapturing(true);
    try {
      const file = await captureScreenAsFile(args?.options);
      args?.onCaptured?.(file);
      return file;
    } catch (e) {
      args?.onError?.(e);
      return undefined;
    } finally {
      setIsCapturing(false);
    }
  }, [args]);

  return { isCapturing, takeScreenshot };
}
