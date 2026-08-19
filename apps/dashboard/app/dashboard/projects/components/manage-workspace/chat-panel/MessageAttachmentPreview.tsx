"use client";

import * as React from "react";
import { FileText, Download, ExternalLink, Image as ImageIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import type { ChatAttachment } from "../types";

interface MessageAttachmentPreviewProps {
  attachments: ChatAttachment[];
}

export function MessageAttachmentPreview({ attachments }: MessageAttachmentPreviewProps) {
  const [selectedImage, setSelectedImage] = React.useState<ChatAttachment | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      {/* Image Attachments */}
      {attachments
        .filter((a) => a.type === "image" && a.url)
        .map((img) => (
          <div key={img.id} className="relative group overflow-hidden rounded-xl border border-border/60 bg-muted/30">
            <button
              type="button"
              onClick={() => setSelectedImage(img)}
              className="block w-full text-left cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
            >
              <img
                src={img.url}
                alt={img.name}
                className="max-h-64 w-full object-cover rounded-xl"
              />
            </button>
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="xs"
                variant="secondary"
                className="h-7 text-[10px] gap-1 bg-background/90 backdrop-blur-xs shadow-xs"
                onClick={() => setSelectedImage(img)}
              >
                <ExternalLink className="size-3" />
                View Full
              </Button>
            </div>
          </div>
        ))}

      {/* File Attachments */}
      {attachments
        .filter((a) => a.type === "file" || a.type === "link")
        .map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/60 bg-background/60 shadow-2xs backdrop-blur-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground leading-tight">
                  {file.name}
                </p>
                {file.size && (
                  <p className="text-[10px] text-muted-foreground">{file.size}</p>
                )}
              </div>
            </div>

            <Button
              size="icon-xs"
              variant="ghost"
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
              title="Download File"
              onClick={() => {
                if (file.url) window.open(file.url, "_blank");
              }}
            >
              <Download className="size-3.5" />
            </Button>
          </div>
        ))}

      {/* Image Lightbox Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-3xl p-2 bg-card/95 backdrop-blur-md">
            <DialogHeader className="px-3 pt-2">
              <DialogTitle className="text-sm font-semibold">{selectedImage.name}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-2">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
