"use client";

import * as React from "react";
import { Image as ImageIcon, ExternalLink, Download, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";
import type { ProjectMediaItem } from "../types";

interface ProjectMediaTabProps {
  media: ProjectMediaItem[];
}

export function ProjectMediaTab({ media }: ProjectMediaTabProps) {
  const [activeMedia, setActiveMedia] = React.useState<ProjectMediaItem | null>(null);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 mb-2">
          <ImageIcon className="size-6 text-muted-foreground/60" />
        </div>
        <p className="text-xs font-semibold text-foreground">No media files shared</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
          Images and UI design mockups shared in chat will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
          <ImageIcon className="size-3 text-primary" /> Media & Mockups ({media.length})
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {media.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveMedia(item)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted/30 text-left transition-all hover:ring-2 hover:ring-primary/40 hover:shadow-xs cursor-pointer"
          >
            <img
              src={item.url}
              alt={item.title}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] font-semibold truncate leading-tight">{item.title}</p>
                <ZoomIn className="size-3 shrink-0 opacity-80" />
              </div>
              <p className="text-[9px] text-white/80">{item.uploadedAt}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Dialog */}
      {activeMedia && (
        <Dialog open={!!activeMedia} onOpenChange={() => setActiveMedia(null)}>
          <DialogContent className="max-w-2xl p-4 bg-card/95 backdrop-blur-md rounded-2xl border border-border/80 shadow-2xl">
            <DialogHeader className="px-1 pt-1 pb-2">
              <DialogTitle className="text-xs font-semibold flex items-center justify-between">
                <span className="truncate">{activeMedia.title}</span>
                <span className="text-[10px] text-muted-foreground font-normal shrink-0 ml-2">
                  Uploaded by {activeMedia.uploaderName} • {activeMedia.uploadedAt}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-2 bg-muted/30 rounded-xl overflow-hidden">
              <img
                src={activeMedia.url}
                alt={activeMedia.title}
                className="max-h-[70vh] w-auto rounded-lg object-contain shadow-md"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 rounded-xl cursor-pointer"
                onClick={() => {
                  window.open(activeMedia.url, "_blank");
                }}
              >
                <ExternalLink className="size-3" />
                Open Original
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 rounded-xl cursor-pointer"
                onClick={() => {
                  toast.success(`Downloaded ${activeMedia.title}`);
                }}
              >
                <Download className="size-3" />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
