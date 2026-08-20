"use client";

import * as React from "react";
import { FileText, Download, FileSpreadsheet, FileCode, FileArchive, File, HardDrive } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import { toast } from "sonner";
import type { ProjectFileItem } from "../types";

interface ProjectFilesTabProps {
  files: ProjectFileItem[];
}

export function ProjectFilesTab({ files }: ProjectFilesTabProps) {
  const getFileIcon = (ext: string) => {
    const e = ext.toLowerCase();
    if (e === "pdf" || e === "docx") return <FileText className="size-4 text-blue-500" />;
    if (e === "csv" || e === "xlsx") return <FileSpreadsheet className="size-4 text-emerald-500" />;
    if (e === "json" || e === "ts" || e === "js") return <FileCode className="size-4 text-amber-500" />;
    if (e === "zip" || e === "tar") return <FileArchive className="size-4 text-purple-500" />;
    return <File className="size-4 text-muted-foreground" />;
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 mb-2">
          <FileText className="size-6 text-muted-foreground/60" />
        </div>
        <p className="text-xs font-semibold text-foreground">No documents attached</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
          Project contracts, PDFs, and architecture briefs will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
          <HardDrive className="size-3 text-primary" /> Attached Files ({files.length})
        </span>
      </div>

      <div className="space-y-1.5">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between gap-2.5 rounded-xl border border-border/60 bg-card/60 p-2.5 shadow-2xs hover:bg-muted/40 hover:border-border transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted/70 group-hover:bg-muted shrink-0 transition-colors">
                {getFileIcon(file.extension)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                  {file.name}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                  <span className="font-mono">{file.size}</span>
                  <span>•</span>
                  <span>{file.uploadedAt}</span>
                </div>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 cursor-pointer"
                    onClick={() => toast.success(`Downloading ${file.name}`)}
                  >
                    <Download className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent side="left" sideOffset={5} className="text-xs">
                Download {file.name}
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
}
