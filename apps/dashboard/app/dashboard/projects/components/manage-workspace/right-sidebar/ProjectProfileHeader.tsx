"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import { Pin, Bell, BellOff, Share2, Building2, Globe2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import type { ProjectWorkspaceItem } from "../types";

interface ProjectProfileHeaderProps {
  project: ProjectWorkspaceItem;
  onEdit?: () => void;
  onTogglePin?: (projectId: string) => void;
}

export function ProjectProfileHeader({ project, onEdit, onTogglePin }: ProjectProfileHeaderProps) {
  const isPinned = project.isPinned ?? false;
  const [isMuted, setIsMuted] = React.useState(false);

  const initials = project.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const handleTogglePin = () => {
    if (onTogglePin) {
      onTogglePin(project.id);
    } else {
      toast.success(isPinned ? "Project unpinned" : `Project ${project.code} pinned to top`);
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? "Notifications unmuted" : "Notifications muted");
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/dashboard/manage-projects?projectId=${project.id}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success(`Project ${project.code} link copied to clipboard`);
    }
  };

  return (
    <div className="flex flex-col items-center p-3.5 text-center border-b border-border/50 bg-gradient-to-b from-muted/30 to-card/40">
      {/* Large Project Avatar with Online Indicator */}
      <div className="relative mb-2">
        <Avatar className="size-13 rounded-2xl ring-2 ring-primary/25 shadow-md">
          <AvatarImage src={project.client.avatar} alt={project.name} />
          <AvatarFallback className="rounded-2xl bg-primary/10 text-primary text-base font-bold font-mono">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-emerald-500 ring-2 ring-background shadow-xs" />
      </div>

      {/* Primary Auto-Generated Project Code & Platform */}
      <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-center">
        <span className="font-mono text-xs font-extrabold text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-md shadow-2xs">
          {project.code}
        </span>
        {project.client.platform && (
          <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0.2 gap-1">
            <Globe2 className="size-2.5 text-muted-foreground" />
            {project.client.platform}
          </Badge>
        )}
      </div>

      {/* Project Title */}
      <h3 className="font-bold text-xs text-foreground tracking-tight max-w-[260px]">
        {project.name}
      </h3>

      {/* Client Organization */}
      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground font-medium">
        <Building2 className="size-3 text-muted-foreground shrink-0" />
        <span className="truncate">{project.client.name}</span>
        {project.client.company && (
          <span className="text-muted-foreground/70">• {project.client.company}</span>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed max-w-[280px] line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Quick Action Controls with Tooltips */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="xs"
                variant={isPinned ? "secondary" : "outline"}
                onClick={handleTogglePin}
                className={cn(
                  "h-7 text-xs gap-1.5 px-2.5 rounded-lg cursor-pointer transition-all",
                  isPinned && "bg-primary/10 text-primary border-primary/20 font-semibold"
                )}
              >
                <Pin className={cn("size-3 rotate-45", isPinned && "text-primary fill-primary/20")} />
                {isPinned ? "Pinned" : "Pin"}
              </Button>
            }
          />
          <TooltipContent side="bottom" sideOffset={5} className="text-xs">
            {isPinned ? "Unpin project from top" : "Pin project to top"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="xs"
                variant={isMuted ? "secondary" : "outline"}
                onClick={handleToggleMute}
                className={cn(
                  "h-7 text-xs gap-1.5 px-2.5 rounded-lg cursor-pointer transition-all",
                  isMuted && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold"
                )}
              >
                {isMuted ? <BellOff className="size-3" /> : <Bell className="size-3" />}
                {isMuted ? "Muted" : "Mute"}
              </Button>
            }
          />
          <TooltipContent side="bottom" sideOffset={5} className="text-xs">
            {isMuted ? "Unmute notifications" : "Mute notifications"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="xs"
                variant="outline"
                onClick={handleShare}
                className="h-7 text-xs gap-1.5 px-2.5 rounded-lg cursor-pointer hover:bg-muted/80"
              >
                <Share2 className="size-3 text-muted-foreground" />
                Share
              </Button>
            }
          />
          <TooltipContent side="bottom" sideOffset={5} className="text-xs">
            Copy project link
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
