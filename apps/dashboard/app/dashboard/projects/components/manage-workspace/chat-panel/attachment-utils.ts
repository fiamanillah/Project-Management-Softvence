import * as React from "react";
import {
  FileText,
  FileSpreadsheet,
  Archive,
  FileCode,
  File,
  Image as ImageIcon,
  Presentation,
  Music,
  Video,
} from "lucide-react";
import type { ChatAttachment } from "../types";

/**
 * Format raw bytes into human readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Extract file extension from filename (without dot, lowercase)
 */
export function getFileExtension(fileName: string): string {
  if (!fileName) return "";
  const parts = fileName.split(".");
  if (parts.length <= 1) return "";
  return parts.pop()?.toLowerCase() || "";
}

/**
 * Check if a file is an image based on MIME type or extension
 */
export function isImageFile(fileNameOrType: string): boolean {
  if (!fileNameOrType) return false;
  const lower = fileNameOrType.toLowerCase();
  if (lower.startsWith("image/")) return true;
  const ext = getFileExtension(lower);
  return ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "avif", "heic"].includes(ext);
}

export interface FileTypeConfig {
  category: "image" | "pdf" | "word" | "excel" | "powerpoint" | "archive" | "code" | "media" | "document";
  badgeLabel: string;
  icon: React.ElementType;
  iconColorClass: string;
  iconBgClass: string;
  badgeClass: string;
  borderHoverClass: string;
}

/**
 * Get rich UI styling, icons and badges for any file type
 */
export function getFileTypeConfig(fileName: string, mimeType?: string): FileTypeConfig {
  const ext = getFileExtension(fileName);
  const mime = mimeType?.toLowerCase() || "";

  // 1. Image
  if (isImageFile(fileName) || mime.startsWith("image/")) {
    return {
      category: "image",
      badgeLabel: ext.toUpperCase() || "IMG",
      icon: ImageIcon,
      iconColorClass: "text-sky-500",
      iconBgClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
      borderHoverClass: "hover:border-sky-500/50",
    };
  }

  // 2. PDF
  if (ext === "pdf" || mime.includes("pdf")) {
    return {
      category: "pdf",
      badgeLabel: "PDF",
      icon: FileText,
      iconColorClass: "text-rose-500",
      iconBgClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
      borderHoverClass: "hover:border-rose-500/50",
    };
  }

  // 3. Word / Document
  if (["doc", "docx", "rtf", "odt", "pages"].includes(ext) || mime.includes("word") || mime.includes("officedocument.wordprocessingml")) {
    return {
      category: "word",
      badgeLabel: ext.toUpperCase() || "DOC",
      icon: FileText,
      iconColorClass: "text-blue-500",
      iconBgClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
      borderHoverClass: "hover:border-blue-500/50",
    };
  }

  // 4. Excel / Spreadsheet / CSV
  if (["xls", "xlsx", "csv", "tsv", "numbers", "ods"].includes(ext) || mime.includes("excel") || mime.includes("spreadsheet") || mime.includes("csv")) {
    return {
      category: "excel",
      badgeLabel: ext.toUpperCase() || "XLS",
      icon: FileSpreadsheet,
      iconColorClass: "text-emerald-500",
      iconBgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      borderHoverClass: "hover:border-emerald-500/50",
    };
  }

  // 5. PowerPoint / Presentation
  if (["ppt", "pptx", "key", "odp"].includes(ext) || mime.includes("presentation") || mime.includes("powerpoint")) {
    return {
      category: "powerpoint",
      badgeLabel: ext.toUpperCase() || "PPT",
      icon: Presentation,
      iconColorClass: "text-amber-500",
      iconBgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      borderHoverClass: "hover:border-amber-500/50",
    };
  }

  // 6. Archive / Zip / Compressed
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext) || mime.includes("zip") || mime.includes("tar") || mime.includes("compressed")) {
    return {
      category: "archive",
      badgeLabel: ext.toUpperCase() || "ZIP",
      icon: Archive,
      iconColorClass: "text-purple-500",
      iconBgClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
      borderHoverClass: "hover:border-purple-500/50",
    };
  }

  // 7. Code / JSON / YAML / Config
  if (["js", "ts", "jsx", "tsx", "json", "html", "css", "py", "sql", "sh", "yml", "yaml", "md"].includes(ext)) {
    return {
      category: "code",
      badgeLabel: ext.toUpperCase() || "CODE",
      icon: FileCode,
      iconColorClass: "text-cyan-500",
      iconBgClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
      badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
      borderHoverClass: "hover:border-cyan-500/50",
    };
  }

  // 8. Media / Audio / Video
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) {
    return {
      category: "media",
      badgeLabel: ext.toUpperCase() || "VIDEO",
      icon: Video,
      iconColorClass: "text-rose-500",
      iconBgClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
      borderHoverClass: "hover:border-rose-500/50",
    };
  }

  if (["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) {
    return {
      category: "media",
      badgeLabel: ext.toUpperCase() || "AUDIO",
      icon: Music,
      iconColorClass: "text-indigo-500",
      iconBgClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
      borderHoverClass: "hover:border-indigo-500/50",
    };
  }

  // Fallback: Generic Document
  return {
    category: "document",
    badgeLabel: ext ? ext.toUpperCase() : "DOC",
    icon: File,
    iconColorClass: "text-muted-foreground",
    iconBgClass: "bg-muted text-muted-foreground",
    badgeClass: "bg-muted/80 text-muted-foreground border-border/60",
    borderHoverClass: "hover:border-border",
  };
}

/**
 * Curated preset samples for quick 1-click test attachments
 */
export const SAMPLE_ATTACHMENTS: {
  id: string;
  name: string;
  type: "image" | "file";
  size: string;
  fileSizeBytes: number;
  url: string;
  extension: string;
  description: string;
}[] = [
  {
    id: "sample-img-1",
    name: "Mobile_Dashboard_UX_v4.png",
    type: "image",
    size: "3.2 MB",
    fileSizeBytes: 3355443,
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80",
    extension: "png",
    description: "High-resolution design mockup",
  },
  {
    id: "sample-img-2",
    name: "Brand_Design_System_Tokens.png",
    type: "image",
    size: "1.8 MB",
    fileSizeBytes: 1887436,
    url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80",
    extension: "png",
    description: "Color tokens & typography guide",
  },
  {
    id: "sample-doc-pdf",
    name: "Project_Requirements_Specification_v2.1.pdf",
    type: "file",
    size: "2.4 MB",
    fileSizeBytes: 2516582,
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    extension: "pdf",
    description: "Full functional requirement document",
  },
  {
    id: "sample-doc-xlsx",
    name: "Sprint_Delivery_Milestones_Budget.xlsx",
    type: "file",
    size: "840 KB",
    fileSizeBytes: 860160,
    url: "https://file-examples.com/wp-content/storage/2017/02/file_example_XLSX_10.xlsx",
    extension: "xlsx",
    description: "Milestone timeline and budget tracking",
  },
  {
    id: "sample-doc-docx",
    name: "Client_Feedback_and_Revision_Notes.docx",
    type: "file",
    size: "1.1 MB",
    fileSizeBytes: 1153433,
    url: "https://file-examples.com/wp-content/storage/2017/02/file-sample_100kB.docx",
    extension: "docx",
    description: "Consolidated client feedback notes",
  },
  {
    id: "sample-doc-zip",
    name: "Exported_Source_Assets_Pack.zip",
    type: "file",
    size: "14.6 MB",
    fileSizeBytes: 15309209,
    url: "https://www.google.com",
    extension: "zip",
    description: "Vector icons and export package",
  },
];
