"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import { Pin, ShieldCheck, Send, CheckCheck, Sparkles, Building2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { ProjectWorkspaceItem } from "../types";

interface ProjectListItemProps {
  project: ProjectWorkspaceItem;
  isSelected: boolean;
  onSelect: (project: ProjectWorkspaceItem) => void;
  isCollapsed?: boolean;
}

export function ProjectListItem({
  project,
  isSelected,
  onSelect,
  isCollapsed = false,
}: ProjectListItemProps) {
  const initials = project.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  // Collapsed Mode with Rich Details Tooltip on Hover
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => onSelect(project)}
              className={cn(
                "group relative flex size-11 items-center justify-center rounded-xl transition-all cursor-pointer outline-none mx-auto",
                isSelected
                  ? "bg-primary/20 text-primary ring-2 ring-primary shadow-xs scale-105"
                  : "hover:bg-muted/80 text-muted-foreground hover:scale-105"
              )}
            >
              {/* Project Avatar */}
              <Avatar className="size-9 rounded-lg ring-1 ring-border/50">
                <AvatarImage src={project.client.avatar} alt={project.name} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-[11px] font-mono">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Online Indicator */}
              {project.onlineCount && project.onlineCount > 0 ? (
                <span
                  className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background"
                  title={`${project.onlineCount} online`}
                />
              ) : null}

              {/* Unread Count Badge */}
              {project.unreadCount && project.unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-xs">
                  {project.unreadCount}
                </span>
              ) : null}

              {/* Pending Approvals Badge */}
              {project.pendingApprovalsCount && project.pendingApprovalsCount > 0 ? (
                <span
                  className="absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-white text-[8px] font-bold shadow-xs"
                  title={`${project.pendingApprovalsCount} pending approvals`}
                >
                  <ShieldCheck className="size-2.5" />
                </span>
              ) : null}
            </button>
          }
        />
        <TooltipContent
          side="right"
          sideOffset={12}
          variant="card"
          className="p-3 w-72 space-y-2 border-border/80 shadow-2xl bg-popover/95 backdrop-blur-md z-50 pointer-events-none text-left"
        >
          {/* Header: Project Code + Name + Status */}
          <div className="flex items-start justify-between gap-1.5 border-b border-border/50 pb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20 shrink-0">
                  {project.code}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  • {project.status.name}
                </span>
              </div>
              <h4 className="font-bold text-xs text-foreground truncate">
                {project.name}
              </h4>
            </div>
            {project.isPinned && (
              <Pin className="size-3 text-amber-500 fill-amber-500/20 rotate-45 shrink-0" />
            )}
          </div>

          {/* Client & Platform Info */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate font-medium text-foreground/80 flex items-center gap-1">
              <Building2 className="size-3 text-primary shrink-0" />
              {project.client.name}
            </span>
            {project.client.platform && (
              <span className="text-[9px] bg-muted px-1.5 py-0.2 rounded font-medium text-muted-foreground">
                {project.client.platform}
              </span>
            )}
          </div>

          {/* Last Message Preview */}
          {project.lastMessage && (
            <div className="text-[10px] leading-snug text-muted-foreground bg-muted/40 p-1.5 rounded-md border border-border/40">
              <span className="font-semibold text-foreground/90">
                {project.lastMessage.senderName.split(" ")[0]}:
              </span>{" "}
              <span className="line-clamp-2">{project.lastMessage.text}</span>
            </div>
          )}

          {/* Footer Status */}
          <div className="flex items-center justify-between text-[10px] pt-1 text-muted-foreground font-medium border-t border-border/30">
            <span>
              {project.onlineCount ? `${project.onlineCount} online` : "Offline"}
            </span>
            {project.pendingApprovalsCount && project.pendingApprovalsCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                <ShieldCheck className="size-3" /> {project.pendingApprovalsCount} pending approvals
              </span>
            ) : (
              <span className="text-primary font-semibold">Click to open chat</span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expanded Mode
  return (
    <button
      type="button"
      onClick={() => onSelect(project)}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all outline-hidden cursor-pointer",
        isSelected
          ? "bg-primary/10 text-foreground ring-1 ring-primary/20 dark:bg-primary/15"
          : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
      )}
    >
      {/* Avatar with Online/Active indicator */}
      <div className="relative shrink-0 mt-0.5">
        <Avatar className="size-11 rounded-xl ring-1 ring-border/50">
          <AvatarImage src={project.client.avatar} alt={project.name} />
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs font-mono">
            {initials}
          </AvatarFallback>
        </Avatar>
        {project.onlineCount && project.onlineCount > 0 ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-background"
            title={`${project.onlineCount} online`}
          />
        ) : null}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Top Line: Main Identifier Code + Time */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Primary Project Code Identifier */}
            <span
              className={cn(
                "font-mono text-xs font-bold px-1.5 py-0.2 rounded shrink-0",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              )}
            >
              {project.code}
            </span>
            <span
              className={cn(
                "truncate font-semibold text-xs leading-tight tracking-tight",
                isSelected ? "text-foreground font-bold" : "text-foreground/90 group-hover:text-foreground"
              )}
            >
              {project.name}
            </span>
          </div>

          <span className="shrink-0 text-[10px] text-muted-foreground font-medium">
            {project.lastMessage?.timestamp || "Recently"}
          </span>
        </div>

        {/* Middle Line: Client & Platform */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="truncate font-medium text-foreground/80">{project.client.name}</span>
          {project.client.platform && (
            <span className="text-[10px] text-muted-foreground/70 bg-muted px-1 py-0.2 rounded truncate">
              {project.client.platform}
            </span>
          )}
        </div>

        {/* Bottom Line: Last Message Snippet + Badges */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="truncate text-[11px] leading-snug text-muted-foreground/80 flex-1">
            {project.lastMessage ? (
              <>
                <span className="font-medium text-foreground/80">
                  {project.lastMessage.senderName.split(" ")[0]}:{" "}
                </span>
                {project.lastMessage.text}
              </>
            ) : (
              <span className="italic text-muted-foreground/60">No messages yet</span>
            )}
          </p>

          <div className="flex items-center gap-1 shrink-0">
            {/* Pending Approvals Badge */}
            {project.pendingApprovalsCount && project.pendingApprovalsCount > 0 ? (
              <span
                className="flex items-center gap-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-bold"
                title={`${project.pendingApprovalsCount} pending approvals`}
              >
                <ShieldCheck className="size-2.5" />
                {project.pendingApprovalsCount}
              </span>
            ) : null}

            {project.isPinned && (
              <Pin className="size-3 text-muted-foreground/70 fill-muted-foreground/30 rotate-45" />
            )}

            {project.unreadCount && project.unreadCount > 0 ? (
              <span className="flex min-w-4.5 h-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {project.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
