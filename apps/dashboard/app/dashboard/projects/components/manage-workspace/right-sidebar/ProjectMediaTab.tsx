"use client";

import * as React from "react";
import { Image as ImageIcon, ExternalLink, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import type { ProjectMediaItem } from "../types";

interface ProjectMediaTabProps {
  media: ProjectMediaItem[];
}

export function ProjectMediaTab({ media }: ProjectMediaTabProps) {
  const [activeMedia, setActiveMedia] = React.useState<ProjectMediaItem | null>(null);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <ImageIcon className="size-8 text-muted-foreground/40 mb-2" />
        <p className="text-xs font-semibold text-foreground">No media files shared</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Images and UI design mockups shared in chat will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-2">
        {media.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveMedia(item)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted/30 text-left transition-all hover:ring-2 hover:ring-primary/40 cursor-pointer"
          >
            <img
              src={item.url}
              alt={item.title}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white">
              <p className="text-[10px] font-semibold truncate leading-tight">{item.title}</p>
              <p className="text-[9px] text-white/80">{item.uploadedAt}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Dialog */}
      {activeMedia && (
        <Dialog open={!!activeMedia} onOpenChange={() => setActiveMedia(null)}>
          <DialogContent className="max-w-2xl p-3 bg-card/95 backdrop-blur-md">
            <DialogHeader className="px-2 pt-1">
              <DialogTitle className="text-xs font-semibold flex items-center justify-between">
                <span>{activeMedia.title}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Uploaded by {activeMedia.uploaderName} • {activeMedia.uploadedAt}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-2">
              <img
                src={activeMedia.url}
                alt={activeMedia.title}
                className="max-h-[70vh] w-auto rounded-lg object-contain shadow-md"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
