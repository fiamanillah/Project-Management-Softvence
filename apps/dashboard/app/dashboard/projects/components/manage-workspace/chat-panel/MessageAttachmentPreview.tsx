"use client";

import * as React from "react";
import {
  Download,
  ExternalLink,
  ZoomIn,
  Eye,
  ChevronLeft,
  ChevronRight,
  Images,
  FolderArchive,
  Layers,
  FileText,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import { toast } from "sonner";
import { formatBytes, getFileTypeConfig } from "./attachment-utils";
import type { ChatAttachment } from "../types";

interface MessageAttachmentPreviewProps {
  attachments: ChatAttachment[];
  className?: string;
  canDelete?: boolean;
  onDeleteAttachment?: (attachmentId: string) => void;
}

const MAX_VISIBLE_IMAGES = 4;
const MAX_VISIBLE_FILES = 2;

export function MessageAttachmentPreview({
  attachments,
  className,
  canDelete = false,
  onDeleteAttachment,
}: MessageAttachmentPreviewProps) {
  // Gallery Dialog state
  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"all" | "images" | "documents">("all");

  // Lightbox Carousel state (index in imageAttachments)
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [copiedDocId, setCopiedDocId] = React.useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const imageAttachments = attachments.filter((a) => a.type === "image" && a.url);
  const fileAttachments = attachments.filter(
    (a) => a.type === "file" || a.type === "link" || (!a.type && !a.url?.startsWith("data:image"))
  );

  const totalBytes = attachments.reduce((sum, a) => sum + (a.fileSizeBytes || 0), 0);

  // Single file download helper
  const handleDownload = (file: ChatAttachment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!file.url) return;

    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name || "download";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk download all attachments
  const handleDownloadAll = () => {
    attachments.forEach((file, index) => {
      setTimeout(() => {
        handleDownload(file);
      }, index * 200);
    });
    toast.success(`Downloading ${attachments.length} attachment${attachments.length > 1 ? "s" : ""}`);
  };

  // Copy document filename
  const handleCopyName = (doc: ChatAttachment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(doc.name);
    setCopiedDocId(doc.id);
    toast.success("Filename copied to clipboard");
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  // Lightbox navigation
  const activeLightboxImage = lightboxIndex !== null ? imageAttachments[lightboxIndex] : null;

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex === null || imageAttachments.length <= 1) return;
    setLightboxIndex((lightboxIndex - 1 + imageAttachments.length) % imageAttachments.length);
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex === null || imageAttachments.length <= 1) return;
    setLightboxIndex((lightboxIndex + 1) % imageAttachments.length);
  };

  // Keyboard navigation for Lightbox
  React.useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevImage();
      } else if (e.key === "ArrowRight") {
        handleNextImage();
      } else if (e.key === "Escape") {
        setLightboxIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, imageAttachments.length]);

  // Compaction Slicing
  const hasExtraImages = imageAttachments.length > MAX_VISIBLE_IMAGES;
  const visibleImages = hasExtraImages
    ? imageAttachments.slice(0, MAX_VISIBLE_IMAGES)
    : imageAttachments;
  const extraImagesCount = imageAttachments.length - (MAX_VISIBLE_IMAGES - 1);

  const hasExtraFiles = fileAttachments.length > MAX_VISIBLE_FILES;
  const visibleFiles = hasExtraFiles
    ? fileAttachments.slice(0, MAX_VISIBLE_FILES)
    : fileAttachments;
  const extraFilesCount = fileAttachments.length - MAX_VISIBLE_FILES;

  return (
    <div className={cn("flex flex-col gap-2 mt-1.5 w-full min-w-0 select-none", className)}>
      {/* 1. Telegram-Style Compact Image Mosaic */}
      {imageAttachments.length > 0 && (
        <div
          className={cn(
            "grid gap-1.5 w-full min-w-0 rounded-2xl overflow-hidden",
            imageAttachments.length === 1
              ? "grid-cols-1 max-w-sm"
              : imageAttachments.length === 2
              ? "grid-cols-2 max-w-md"
              : "grid-cols-2 max-w-md"
          )}
        >
          {visibleImages.map((img, idx) => {
            const isLastCompactedSlot = hasExtraImages && idx === MAX_VISIBLE_IMAGES - 1;

            if (isLastCompactedSlot) {
              return (
                <div
                  key={img.id}
                  onClick={() => {
                    setActiveTab("images");
                    setGalleryOpen(true);
                  }}
                  className="relative group overflow-hidden rounded-xl border border-border/80 aspect-4/3 cursor-pointer shadow-2xs hover:shadow-md transition-all flex items-center justify-center bg-black"
                  title={`View all ${imageAttachments.length} images`}
                >
                  {/* Background Image Thumbnail */}
                  <img
                    src={img.url}
                    alt={img.name}
                    className="size-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-300 filter blur-2xs"
                    loading="lazy"
                  />

                  {/* Frosted Dark Overlay with +N Badge */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-0.5 group-hover:bg-black/70 transition-colors">
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
                      +{extraImagesCount}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-white/90 uppercase tracking-wider">
                      <Images className="size-3" />
                      <span>Photos</span>
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={img.id}
                className="relative group overflow-hidden rounded-xl border border-border/70 bg-muted/20 shadow-2xs transition-all hover:shadow-md hover:border-primary/40 aspect-4/3 flex items-center justify-center bg-black/5 dark:bg-white/5"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="size-full block text-left cursor-pointer overflow-hidden relative"
                  title={`Click to view ${img.name}`}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Dark Hover Scrim with Quick View */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-white bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-md">
                      <ZoomIn className="size-3.5" />
                      <span>View</span>
                    </span>
                  </div>

                  {/* Bottom info strip on thumbnail */}
                  <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-2 pt-3 flex items-end justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-medium text-white truncate max-w-[70%]">
                      {img.name}
                    </span>
                    {img.size && (
                      <span className="text-[9px] font-mono text-white/80 shrink-0">
                        {img.size}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Compact Document Cards + '+N More Files' Button */}
      {fileAttachments.length > 0 && (
        <div className="flex flex-col gap-1.5 w-full max-w-md min-w-0">
          {visibleFiles.map((file) => {
            const config = getFileTypeConfig(file.name, file.mimeType);
            const IconComponent = config.icon;

            return (
              <div
                key={file.id}
                onClick={() => {
                  if (file.url) window.open(file.url, "_blank");
                }}
                className={cn(
                  "group/file-card flex items-center justify-between gap-2.5 p-2 rounded-xl border border-border/70 bg-card/90 shadow-2xs backdrop-blur-xs transition-all hover:bg-muted/40 cursor-pointer",
                  config.borderHoverClass
                )}
              >
                {/* Left: Type Icon + Badged Metadata */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg shrink-0 shadow-2xs transition-transform group-hover/file-card:scale-105",
                      config.iconBgClass
                    )}
                  >
                    <IconComponent className={cn("size-4", config.iconColorClass)} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p
                        className="truncate text-xs font-bold text-foreground leading-tight group-hover/file-card:text-primary transition-colors"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[8px] font-mono font-bold px-1.5 py-0 rounded shrink-0 hidden xs:inline-flex",
                          config.badgeClass
                        )}
                      >
                        {config.badgeLabel}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-medium">
                      {file.size && <span>{file.size}</span>}
                      {file.version && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[9px] text-primary">{file.version}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="size-6.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background shadow-2xs shrink-0 cursor-pointer"
                    title="Open Document in New Tab"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (file.url) window.open(file.url, "_blank");
                    }}
                  >
                    <ExternalLink className="size-3" />
                  </Button>

                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="size-6.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background shadow-2xs shrink-0 cursor-pointer"
                    title="Download File"
                    onClick={(e) => handleDownload(file, e)}
                  >
                    <Download className="size-3" />
                  </Button>

                  {canDelete && onDeleteAttachment && file.id && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="size-6.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shadow-2xs shrink-0 cursor-pointer"
                      title="Delete Attachment"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete attachment "${file.name}"?`)) {
                          onDeleteAttachment(file.id!);
                        }
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* '+N More Files' Button if files exceed threshold */}
          {hasExtraFiles && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("documents");
                setGalleryOpen(true);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-dashed border-border/80 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center gap-2">
                <FolderArchive className="size-3.5 text-primary group-hover:scale-110 transition-transform" />
                <span>+{extraFilesCount} more documents</span>
              </div>
              <span className="text-[10px] font-bold text-primary hover:underline">
                View all ({fileAttachments.length}) →
              </span>
            </button>
          )}
        </div>
      )}

      {/* 3. Attachment Gallery & Manager Dialog */}
      {galleryOpen && (
        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent className="min-w-[340px] xs:min-w-[460px] sm:min-w-[640px] md:min-w-[768px] lg:min-w-[880px] xl:min-w-[980px] w-[95vw] sm:w-[90vw] md:w-[84vw] lg:w-[76vw] p-0 overflow-hidden bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl">
            {/* Header: Title + Category Tabs + Bulk Download */}
            <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-border/60 bg-muted/25 pr-12 sm:pr-14">
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Layers className="size-4.5 text-primary shrink-0" />
                  <span className="truncate">Message Attachments</span>
                  <Badge variant="secondary" className="text-xs font-mono font-bold shrink-0">
                    {attachments.length}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalBytes > 0 && `Total size: ${formatBytes(totalBytes)}`}
                </p>
              </div>

              {/* Header Action & Filter Tabs */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* Category Pill Filter */}
                <div className="flex items-center rounded-lg bg-muted/80 p-0.5 border border-border/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer",
                      activeTab === "all"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All ({attachments.length})
                  </button>

                  {imageAttachments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("images")}
                      className={cn(
                        "px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer flex items-center gap-1",
                        activeTab === "images"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>Images</span>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                        {imageAttachments.length}
                      </Badge>
                    </button>
                  )}

                  {fileAttachments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("documents")}
                      className={cn(
                        "px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer flex items-center gap-1",
                        activeTab === "documents"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>Documents</span>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                        {fileAttachments.length}
                      </Badge>
                    </button>
                  )}
                </div>

                {/* Bulk Download Action */}
                <Button
                  size="xs"
                  variant="outline"
                  className="h-7 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
                  onClick={handleDownloadAll}
                >
                  <Download className="size-3.5" />
                  <span>Download All</span>
                </Button>
              </div>
            </DialogHeader>

            {/* Dialog Content Area */}
            <ScrollArea className="max-h-[70vh] p-4 sm:p-6">
              <div className="space-y-6">
                {/* Images Section (visible in "all" and "images" tabs) */}
                {(activeTab === "all" || activeTab === "images") && imageAttachments.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-border/40">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Images className="size-3.5 text-sky-500" />
                        <span>Images & Mockups ({imageAttachments.length})</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {imageAttachments.map((img, idx) => (
                        <div
                          key={img.id}
                          className="group relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xs hover:shadow-md transition-all aspect-4/3 flex flex-col justify-end"
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                            onClick={() => setLightboxIndex(idx)}
                          />

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
                            <Button
                              size="icon-xs"
                              variant="secondary"
                              className="size-7 rounded-full bg-background/90 text-foreground shadow-md cursor-pointer"
                              title="View Full Resolution"
                              onClick={() => setLightboxIndex(idx)}
                            >
                              <Eye className="size-3.5" />
                            </Button>

                            <Button
                              size="icon-xs"
                              variant="secondary"
                              className="size-7 rounded-full bg-background/90 text-foreground shadow-md cursor-pointer"
                              title="Download Image"
                              onClick={(e) => handleDownload(img, e)}
                            >
                              <Download className="size-3.5" />
                            </Button>
                          </div>

                          {/* Bottom info strip */}
                          <div className="relative z-10 bg-linear-to-t from-black/85 via-black/50 to-transparent p-2 pt-4 flex items-end justify-between gap-1">
                            <span className="text-[10px] font-medium text-white truncate max-w-[70%]">
                              {img.name}
                            </span>
                            {img.size && (
                              <span className="text-[9px] font-mono text-white/80 shrink-0">
                                {img.size}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents Section (visible in "all" and "documents" tabs) */}
                {(activeTab === "all" || activeTab === "documents") && fileAttachments.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-border/40">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FileText className="size-3.5 text-amber-500" />
                        <span>Documents & Deliverables ({fileAttachments.length})</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {fileAttachments.map((file) => {
                        const config = getFileTypeConfig(file.name, file.mimeType);
                        const IconComponent = config.icon;
                        const isCopied = copiedDocId === file.id;

                        return (
                          <div
                            key={file.id}
                            className={cn(
                              "flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card shadow-2xs transition-all hover:bg-muted/40",
                              config.borderHoverClass
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={cn(
                                  "flex size-10 items-center justify-center rounded-xl shrink-0 shadow-2xs",
                                  config.iconBgClass
                                )}
                              >
                                <IconComponent className={cn("size-5", config.iconColorClass)} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <p
                                    className="truncate text-xs font-bold text-foreground leading-tight"
                                    title={file.name}
                                  >
                                    {file.name}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant="outline"
                                    className={cn("text-[9px] font-mono px-1.5 py-0 rounded", config.badgeClass)}
                                  >
                                    {config.badgeLabel}
                                  </Badge>
                                  {file.size && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {file.size}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Copy filename"
                                onClick={(e) => handleCopyName(file, e)}
                              >
                                {isCopied ? (
                                  <Check className="size-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </Button>

                              <Button
                                size="icon-xs"
                                variant="ghost"
                                className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Open in New Tab"
                                onClick={() => {
                                  if (file.url) window.open(file.url, "_blank");
                                }}
                              >
                                <ExternalLink className="size-3.5" />
                              </Button>

                              <Button
                                size="icon-xs"
                                variant="outline"
                                className="size-7 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground cursor-pointer shadow-2xs"
                                title="Download File"
                                onClick={(e) => handleDownload(file, e)}
                              >
                                <Download className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* 4. Fullscreen Interactive Lightbox Image Carousel */}
      {activeLightboxImage && (
        <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
          <DialogContent className="min-w-[340px] xs:min-w-[480px] sm:min-w-[680px] md:min-w-[820px] lg:min-w-[960px] xl:min-w-[1060px] w-[96vw] sm:w-[92vw] md:w-[86vw] lg:w-[80vw] p-0 overflow-hidden bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl">
            {/* Header Strip */}
            <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30 pr-12 sm:pr-14">
              <div className="min-w-0 pr-4">
                <DialogTitle className="text-sm font-bold text-foreground truncate">
                  {activeLightboxImage.name}
                </DialogTitle>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <span>
                    Photo {lightboxIndex! + 1} of {imageAttachments.length}
                  </span>
                  {activeLightboxImage.size && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{activeLightboxImage.size}</span>
                    </>
                  )}
                  {activeLightboxImage.extension && (
                    <>
                      <span>•</span>
                      <span className="uppercase font-mono font-semibold">
                        {activeLightboxImage.extension}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="xs"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 font-semibold cursor-pointer shadow-2xs"
                  onClick={() => handleDownload(activeLightboxImage)}
                >
                  <Download className="size-3.5" />
                  <span>Download</span>
                </Button>
              </div>
            </DialogHeader>

            {/* Carousel Stage with Next/Previous Controls */}
            <div className="relative flex items-center justify-center p-4 sm:p-6 bg-black/15 dark:bg-black/40 min-h-[50vh] max-h-[72vh] overflow-hidden group/stage">
              {/* Previous Button */}
              {imageAttachments.length > 1 && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handlePrevImage}
                  className="absolute left-3 z-20 size-9 rounded-full bg-background/80 hover:bg-background shadow-lg backdrop-blur-xs opacity-80 group-hover/stage:opacity-100 transition-opacity cursor-pointer"
                  title="Previous image (Left Arrow)"
                >
                  <ChevronLeft className="size-5" />
                </Button>
              )}

              {/* Image Display */}
              <img
                src={activeLightboxImage.url}
                alt={activeLightboxImage.name}
                className="max-h-[66vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-border/40 transition-all duration-200"
              />

              {/* Next Button */}
              {imageAttachments.length > 1 && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleNextImage}
                  className="absolute right-3 z-20 size-9 rounded-full bg-background/80 hover:bg-background shadow-lg backdrop-blur-xs opacity-80 group-hover/stage:opacity-100 transition-opacity cursor-pointer"
                  title="Next image (Right Arrow)"
                >
                  <ChevronRight className="size-5" />
                </Button>
              )}
            </div>

            {/* Bottom Carousel Thumbnail Strip (if multiple images) */}
            {imageAttachments.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 p-2.5 border-t border-border/50 bg-muted/20 overflow-x-auto">
                {imageAttachments.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={cn(
                      "size-11 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 opacity-60 hover:opacity-100",
                      idx === lightboxIndex
                        ? "border-primary ring-2 ring-primary/30 opacity-100 scale-105"
                        : "border-transparent"
                    )}
                  >
                    <img src={img.url} alt={img.name} className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
