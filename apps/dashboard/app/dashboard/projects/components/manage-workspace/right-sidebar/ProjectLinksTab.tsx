"use client";

import * as React from "react";
import { Link2, ExternalLink, Palette, Code2, Globe } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import type { ProjectLinkItem } from "../types";

interface ProjectLinksTabProps {
  links: ProjectLinkItem[];
}

export function ProjectLinksTab({ links }: ProjectLinksTabProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Figma":
        return <Palette className="size-4 text-purple-500" />;
      case "GitHub":
        return <Code2 className="size-4 text-foreground" />;
      case "Staging":
        return <Globe className="size-4 text-emerald-500" />;
      default:
        return <Link2 className="size-4 text-primary" />;
    }
  };

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 mb-2">
          <Link2 className="size-6 text-muted-foreground/60" />
        </div>
        <p className="text-xs font-semibold text-foreground">No shared links</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
          Figma specs, GitHub repositories, and staging links will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
          <Link2 className="size-3 text-primary" /> External Links ({links.length})
        </span>
      </div>

      <div className="space-y-1.5">
        {links.map((link) => (
          <Tooltip key={link.id}>
            <TooltipTrigger
              render={
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-2.5 rounded-xl border border-border/60 bg-card/60 p-2.5 shadow-2xs hover:border-primary/40 hover:bg-muted/40 transition-all text-left block cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted/70 group-hover:bg-muted shrink-0 mt-0.5 transition-colors">
                      {getCategoryIcon(link.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {link.title}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5 max-w-[190px]">
                        {link.url}
                      </p>
                      {link.description && (
                        <p className="text-[11px] text-muted-foreground/90 mt-1 line-clamp-2">
                          {link.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors mt-1" />
                </a>
              }
            />
            <TooltipContent side="left" sideOffset={5} className="text-xs">
              Open {link.category || "Link"} in new tab
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
