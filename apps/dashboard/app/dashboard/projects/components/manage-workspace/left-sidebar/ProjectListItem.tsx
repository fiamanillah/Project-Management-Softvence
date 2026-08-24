"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import { Pin, ShieldCheck, Send, AlertTriangle, Building2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { ProjectWorkspaceItem } from "../types";

interface ProjectListItemProps {
  project: ProjectWorkspaceItem;
  isSelected: boolean;
  onSelect: (project: ProjectWorkspaceItem) => void;
  onTogglePin?: (projectId: string) => void;
  isCollapsed?: boolean;
  isRecentlyUpdated?: boolean;
}

const AVATAR_PALETTES = [
  { bg: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20", gradient: "from-blue-500/20 to-indigo-500/15" },
  { bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20", gradient: "from-emerald-500/20 to-teal-500/15" },
  { bg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20", gradient: "from-purple-500/20 to-pink-500/15" },
  { bg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20", gradient: "from-amber-500/20 to-orange-500/15" },
  { bg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20", gradient: "from-rose-500/20 to-red-500/15" },
  { bg: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20", gradient: "from-cyan-500/20 to-blue-500/15" },
  { bg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20", gradient: "from-indigo-500/20 to-violet-500/15" },
  { bg: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20", gradient: "from-teal-500/20 to-emerald-500/15" },
];

function getAvatarPalette(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index]!;
}

export function ProjectListItem({
  project,
  isSelected,
  onSelect,
  onTogglePin,
  isCollapsed = false,
  isRecentlyUpdated = false,
}: ProjectListItemProps) {
  const initials = project.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const palette = React.useMemo(() => getAvatarPalette(project.code || project.name), [project.code, project.name]);

  const hasPendingApproval =
    (project.pendingApprovalsCount !== undefined && project.pendingApprovalsCount > 0) ||
    project.attentionType === "PENDING_APPROVAL";
  const isRevision =
    (project.pendingRevisionsCount !== undefined && project.pendingRevisionsCount > 0) ||
    project.attentionType === "REVISION_REQUESTED";
  const isClientMessage =
    (project.pendingInboundCount !== undefined && project.pendingInboundCount > 0) ||
    project.attentionType === "CLIENT_MESSAGE";
  const hasUnread = (project.unreadCount || 0) > 0 && !isSelected;

  // 1. COLLAPSED VIEW (Slim Rail with Rich Tooltips)
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => onSelect(project)}
              className={cn(
                "group relative flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer outline-none mx-auto",
                isSelected
                  ? "bg-primary/15 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xs"
                  : isRecentlyUpdated
                  ? "ring-2 ring-primary/60 bg-primary/10 animate-pulse"
                  : "hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {/* Project Avatar & Badges Box */}
              <div className="relative size-9">
                <Avatar className="size-9 rounded-xl ring-1 ring-border/50">
                  <AvatarImage src={project.client.avatar} alt={project.name} />
                  <AvatarFallback className={cn("rounded-xl font-bold text-[11px] font-mono border bg-gradient-to-br", palette.gradient, palette.bg)}>
                    {initials || "PR"}
                  </AvatarFallback>
                </Avatar>

                {/* Online Indicator */}
                {project.onlineCount && project.onlineCount > 0 ? (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card z-10"
                    title={`${project.onlineCount} online`}
                  />
                ) : null}

                {/* Unread Count Badge */}
                {hasUnread ? (
                  <span className="absolute -top-1 -right-1 z-20 flex min-w-3.5 h-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold text-primary-foreground ring-1.5 ring-background shadow-xs animate-in zoom-in-75">
                    {project.unreadCount}
                  </span>
                ) : null}

                {/* Attention Indicators on Avatar */}
                <div className="absolute -top-1 -left-1 z-20 flex items-center -space-x-1">
                  {isRevision ? (
                    <span
                      className="flex size-3.5 items-center justify-center rounded-full bg-rose-500 text-white text-[8px] font-bold ring-1.5 ring-background shadow-xs animate-bounce"
                      title="Revision Requested"
                    >
                      <AlertTriangle className="size-2" />
                    </span>
                  ) : null}
                  {hasPendingApproval ? (
                    <span
                      className="flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-white text-[8px] font-bold ring-1.5 ring-background shadow-xs"
                      title={`${project.pendingApprovalsCount || 1} pending approval(s)`}
                    >
                      <ShieldCheck className="size-2" />
                    </span>
                  ) : null}
                  {isClientMessage ? (
                    <span
                      className="flex size-3.5 items-center justify-center rounded-full bg-purple-500 text-white text-[8px] font-bold ring-1.5 ring-background shadow-xs"
                      title={`${project.pendingInboundCount || 1} client message(s)`}
                    >
                      <Send className="size-2" />
                    </span>
                  ) : null}
                </div>
              </div>
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

          {/* Attention Tags in Tooltip */}
          <div className="flex flex-col gap-1">
            {isRevision && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                <AlertTriangle className="size-3 text-rose-500 shrink-0" />
                <span>Revision requested ({project.pendingRevisionsCount || 1})</span>
              </div>
            )}
            {hasPendingApproval && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                <ShieldCheck className="size-3 text-amber-500 shrink-0" />
                <span>{project.pendingApprovalsCount || 1} pending approval(s)</span>
              </div>
            )}
            {isClientMessage && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                <Send className="size-3 text-purple-500 shrink-0" />
                <span>Client inbound communication ({project.pendingInboundCount || 1})</span>
              </div>
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
            <span className="text-primary font-semibold">Click to open chat</span>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // 2. EXPANDED VIEW
  return (
    <button
      type="button"
      onClick={() => onSelect(project)}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-xl p-2.5 sm:p-3 text-left transition-all duration-200 outline-none cursor-pointer border select-none",
        isSelected
          ? "bg-primary/[0.08] dark:bg-primary/[0.12] border-primary/25 shadow-2xs text-foreground"
          : isRecentlyUpdated
          ? "bg-primary/10 border-primary/40 animate-in fade-in-50"
          : "border-transparent hover:bg-muted/60 hover:border-border/40 text-muted-foreground hover:text-foreground"
      )}
    >
      {/* Active Left Indicator Bar */}
      {isSelected && (
        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-primary shadow-xs" />
      )}

      {/* Avatar with Online/Active indicator */}
      <div className="relative shrink-0 mt-0.5">
        <Avatar className="size-10 rounded-xl ring-1 ring-border/50 shadow-2xs">
          <AvatarImage src={project.client.avatar} alt={project.name} />
          <AvatarFallback
            className={cn(
              "rounded-xl font-bold text-xs font-mono border bg-gradient-to-br transition-transform group-hover:scale-105",
              palette.gradient,
              palette.bg
            )}
          >
            {initials || "PR"}
          </AvatarFallback>
        </Avatar>

        {/* Online Indicator */}
        {project.onlineCount && project.onlineCount > 0 ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card shadow-xs"
            title={`${project.onlineCount} online`}
          />
        ) : null}

        {/* Attention Pip on Avatar */}
        {isRevision ? (
          <span
            className="absolute -top-1 -left-1 flex size-3.5 items-center justify-center rounded-full bg-rose-500 text-white text-[8px] font-bold ring-1.5 ring-card shadow-xs animate-bounce"
            title="Revision Requested"
          >
            <AlertTriangle className="size-2" />
          </span>
        ) : hasPendingApproval ? (
          <span
            className="absolute -top-1 -left-1 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-white text-[8px] font-bold ring-1.5 ring-card shadow-xs"
            title="Needs Review"
          >
            <ShieldCheck className="size-2" />
          </span>
        ) : isClientMessage ? (
          <span
            className="absolute -top-1 -left-1 flex size-3.5 items-center justify-center rounded-full bg-purple-500 text-white text-[8px] font-bold ring-1.5 ring-card shadow-xs"
            title="Client Inbound"
          >
            <Send className="size-2" />
          </span>
        ) : null}
      </div>

      {/* Content Body */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Line 1: Code Badge + Project Name + Timestamp */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Primary Project Code Badge */}
            <span
              className={cn(
                "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 max-w-[110px] truncate border tracking-tight transition-colors",
                isSelected
                  ? "bg-primary/20 text-primary border-primary/30 font-extrabold"
                  : "bg-muted/80 text-muted-foreground border-border/50 group-hover:border-border group-hover:text-foreground"
              )}
            >
              {project.code}
            </span>

            {/* Project Title */}
            <span
              className={cn(
                "truncate font-semibold text-xs leading-tight tracking-tight",
                isSelected
                  ? "text-foreground font-bold"
                  : hasUnread
                  ? "text-foreground font-bold"
                  : "text-foreground/90 group-hover:text-foreground"
              )}
            >
              {project.name}
            </span>
          </div>

          <span className="shrink-0 text-[10px] text-muted-foreground/80 font-medium whitespace-nowrap ml-1">
            {project.lastMessage?.timestamp || "Recently"}
          </span>
        </div>

        {/* Line 2: Client & Platform */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
          <span className="truncate font-medium text-foreground/80 flex items-center gap-1 min-w-0">
            <Building2 className="size-3 text-muted-foreground/60 shrink-0" />
            <span className="truncate">{project.client.name}</span>
          </span>
          {project.client.platform && (
            <span className="text-[9.5px] text-muted-foreground/75 bg-muted/80 border border-border/40 px-1.5 py-0.2 rounded-md font-medium shrink-0">
              {project.client.platform}
            </span>
          )}
        </div>

        {/* Line 3: Attention Status Pills (Compact Single-Row Flex Wrap) */}
        {(isRevision || hasPendingApproval || isClientMessage) && (
          <div className="flex items-center flex-wrap gap-1 my-0.5">
            {isRevision && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md shrink-0 animate-pulse">
                <AlertTriangle className="size-2.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Revision Needed</span>
              </span>
            )}
            {hasPendingApproval && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                <ShieldCheck className="size-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Needs Review {project.pendingApprovalsCount ? `(${project.pendingApprovalsCount})` : ""}</span>
              </span>
            )}
            {isClientMessage && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                <Send className="size-2.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Client Inbound {project.pendingInboundCount ? `(${project.pendingInboundCount})` : ""}</span>
              </span>
            )}
          </div>
        )}

        {/* Line 4: Last Message Snippet + Actions/Unread */}
        <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0">
          <p
            className={cn(
              "truncate text-[11px] leading-snug flex-1",
              hasUnread ? "text-foreground font-semibold" : "text-muted-foreground/80"
            )}
          >
            {project.lastMessage ? (
              <>
                <span className={cn("font-medium", hasUnread ? "text-foreground font-bold" : "text-foreground/75")}>
                  {project.lastMessage.senderName.split(" ")[0]}:{" "}
                </span>
                <span>{project.lastMessage.text}</span>
              </>
            ) : (
              <span className="italic text-muted-foreground/50">No messages yet</span>
            )}
          </p>

          <div className="flex items-center gap-1 shrink-0">
            {onTogglePin ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(project.id);
                }}
                className={cn(
                  "size-5 rounded flex items-center justify-center transition-all cursor-pointer",
                  project.isPinned
                    ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/15"
                    : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={project.isPinned ? "Unpin project from top" : "Pin project to top"}
              >
                <Pin className={cn("size-3", project.isPinned && "fill-amber-500/20 rotate-45")} />
              </button>
            ) : project.isPinned ? (
              <Pin className="size-3 text-amber-500/80 fill-amber-500/20 rotate-45" />
            ) : null}

            {hasUnread && (
              <span className="flex min-w-4.5 h-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-2xs animate-in zoom-in-95">
                {project.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
