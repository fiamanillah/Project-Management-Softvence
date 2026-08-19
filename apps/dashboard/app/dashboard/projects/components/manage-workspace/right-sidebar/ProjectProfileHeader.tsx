"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Pin, Bell, Share2, Building2, ExternalLink, Shield } from "lucide-react";
import { toast } from "sonner";
import type { ProjectWorkspaceItem } from "../types";

interface ProjectProfileHeaderProps {
  project: ProjectWorkspaceItem;
  onEdit?: () => void;
}

export function ProjectProfileHeader({ project, onEdit }: ProjectProfileHeaderProps) {
  const [isPinned, setIsPinned] = React.useState(project.isPinned ?? false);
  const [isMuted, setIsMuted] = React.useState(false);

  const initials = project.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const handleTogglePin = () => {
    setIsPinned(!isPinned);
    toast.success(isPinned ? "Project unpinned" : `Project ${project.code} pinned to top`);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? "Notifications unmuted" : "Notifications muted");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(`Project ${project.code} link copied to clipboard`);
  };

  return (
    <div className="flex flex-col items-center p-5 text-center border-b border-border/50 bg-muted/20">
      {/* Large Project Avatar with Online Indicator */}
      <div className="relative mb-3">
        <Avatar className="size-18 rounded-2xl ring-2 ring-primary/20 shadow-md">
          <AvatarImage src={project.client.avatar} alt={project.name} />
          <AvatarFallback className="rounded-2xl bg-primary/10 text-primary text-xl font-bold font-mono">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
      </div>

      {/* PRIMARY AUTO-GENERATED PROJECT CODE */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="font-mono text-sm font-extrabold text-primary bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-lg">
          {project.code}
        </span>
        {project.client.platform && (
          <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
            {project.client.platform}
          </span>
        )}
      </div>

      {/* Project Title & Client Account */}
      <h3 className="font-bold text-sm text-foreground tracking-tight max-w-[260px] mt-1">
        {project.name}
      </h3>

      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
        <Building2 className="size-3 text-muted-foreground shrink-0" />
        <span className="truncate">{project.client.name}</span>
        {project.client.company && (
          <span className="text-muted-foreground/70">• {project.client.company}</span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed max-w-[280px]">
        {project.description}
      </p>

      {/* Quick Action Controls */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button
          size="sm"
          variant={isPinned ? "secondary" : "outline"}
          onClick={handleTogglePin}
          className="h-8 text-xs gap-1.5 px-3 rounded-xl cursor-pointer"
        >
          <Pin className="size-3.5 rotate-45" />
          {isPinned ? "Pinned" : "Pin"}
        </Button>

        <Button
          size="sm"
          variant={isMuted ? "secondary" : "outline"}
          onClick={handleToggleMute}
          className="h-8 text-xs gap-1.5 px-3 rounded-xl cursor-pointer"
        >
          <Bell className="size-3.5" />
          {isMuted ? "Muted" : "Mute"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleShare}
          className="h-8 text-xs gap-1.5 px-3 rounded-xl cursor-pointer"
        >
          <Share2 className="size-3.5" />
          Share
        </Button>
      </div>
    </div>
  );
}
