import mime from "mime-types";
import path from "path";

export function lookupMimeType(fileNameOrPath: string, fallback: string = "application/octet-stream"): string {
  const detected = mime.lookup(fileNameOrPath);
  return detected ? (detected as string) : fallback;
}

export function getExtensionFromMime(mimeType: string): string {
  const ext = mime.extension(mimeType);
  return ext ? `.${ext}` : "";
}

export function sanitizeFileName(originalName: string): string {
  // Extract extension
  const ext = path.extname(originalName).toLowerCase();
  const nameWithoutExt = path.basename(originalName, ext);

  // Replace invalid characters with hyphens
  const cleanName = nameWithoutExt
    .normalize("NFKD")
    .replace(/[^\w.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 100);

  return `${cleanName || "file"}${ext}`;
}
