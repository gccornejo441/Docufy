import { PDFDocument } from "pdf-lib";
import type { PDFImage } from "pdf-lib";

/**
 * Wrap a PNG/JPEG (or other image) File into a single-page PDF File.
 */
async function imageFileToPdf(file: File): Promise<File> {
  const pdf = await PDFDocument.create();

  const mime = (file.type || "").toLowerCase();
  let img: PDFImage;

  if (mime === "image/png") {
    const bytes = await file.arrayBuffer();
    img = await pdf.embedPng(bytes);
  } else if (mime === "image/jpeg" || mime === "image/jpg") {
    const bytes = await file.arrayBuffer();
    img = await pdf.embedJpg(bytes);
  } else if (mime.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    ctx.drawImage(bitmap, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/png"
      )
    );
    const pngBytes = await pngBlob.arrayBuffer();
    img = await pdf.embedPng(pngBytes);
  } else {
    // Not an image: just return original (caller may decide how to handle)
    return file;
  }

  const { width, height } = img.scale(1);
  const page = pdf.addPage([width, height]);
  page.drawImage(img, { x: 0, y: 0, width, height });

  // pdf-lib returns Uint8Array<ArrayBufferLike>. Copy into a fresh Uint8Array
  // so its backing buffer is a plain ArrayBuffer acceptable to Blob/File.
  const pdfBytes = await pdf.save();
  const copy = new Uint8Array(pdfBytes.length);
  copy.set(pdfBytes);

  const base = file.name.replace(/\.[^.]+$/, "");
  const name = `${base || "image"}.pdf`;
  return new File([copy], name, { type: "application/pdf" });
}

/**
 * If file is already a PDF, return it as-is.
 * If it's an image, convert to a 1-page PDF.
 * Otherwise return as-is.
 */
export async function ensurePdf(file: File): Promise<File> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return file;
  if (file.type.startsWith("image/")) return imageFileToPdf(file);
  return file;
}
