"use client"

import * as React from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip"
import { Pin, ShieldCheck, Send, AlertTriangle, Building2 } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import type { ProjectWorkspaceItem } from "../types"

interface ProjectListItemProps {
  project: ProjectWorkspaceItem
  isSelected: boolean
  onSelect: (project: ProjectWorkspaceItem) => void
  onTogglePin?: (projectId: string) => void
  isCollapsed?: boolean
  isRecentlyUpdated?: boolean
}

const AVATAR_PALETTES = [
  {
    bg: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    gradient: "from-blue-500/20 to-indigo-500/15",
  },
  {
    bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    gradient: "from-emerald-500/20 to-teal-500/15",
  },
  {
    bg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    gradient: "from-purple-500/20 to-pink-500/15",
  },
  {
    bg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    gradient: "from-amber-500/20 to-orange-500/15",
  },
  {
    bg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    gradient: "from-rose-500/20 to-red-500/15",
  },
  {
    bg: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
    gradient: "from-cyan-500/20 to-blue-500/15",
  },
  {
    bg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    gradient: "from-indigo-500/20 to-violet-500/15",
  },
  {
    bg: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
    gradient: "from-teal-500/20 to-emerald-500/15",
  },
]

function getAvatarPalette(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length
  return AVATAR_PALETTES[index]!
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
    .toUpperCase()

  const palette = React.useMemo(
    () => getAvatarPalette(project.code || project.name),
    [project.code, project.name]
  )

  const hasPendingApproval =
    (project.pendingApprovalsCount !== undefined &&
      project.pendingApprovalsCount > 0) ||
    project.attentionType === "PENDING_APPROVAL"
  const isRevision =
    (project.pendingRevisionsCount !== undefined &&
      project.pendingRevisionsCount > 0) ||
    project.attentionType === "REVISION_REQUESTED"
  const isClientMessage =
    (project.pendingInboundCount !== undefined &&
      project.pendingInboundCount > 0) ||
    project.attentionType === "CLIENT_MESSAGE"
  const hasUnread = (project.unreadCount || 0) > 0 && !isSelected

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
                "group relative mx-auto flex size-10 cursor-pointer items-center justify-center rounded-xl transition-all outline-none",
                isSelected
                  ? "bg-primary/15 text-primary shadow-xs ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : isRecentlyUpdated
                    ? "animate-pulse bg-primary/10 ring-2 ring-primary/60"
                    : "text-muted-foreground hover:bg-muted/80"
              )}
            >
              {/* Project Avatar & Badges Box */}
              <div className="relative size-9">
                <Avatar className="size-9 rounded-xl ring-1 ring-border/50">
                  <AvatarImage src={project.client.avatar} alt={project.name} />
                  <AvatarFallback
                    className={cn(
                      "rounded-xl border bg-gradient-to-br font-mono text-[11px] font-bold",
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
                    className="absolute -right-0.5 -bottom-0.5 z-10 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card"
                    title={`${project.onlineCount} online`}
                  />
                ) : null}

                {/* Unread Count Badge */}
                {hasUnread ? (
                  <span className="ring-1.5 absolute -top-1 -right-1 z-20 flex h-3.5 min-w-3.5 animate-in items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold text-primary-foreground shadow-xs ring-background zoom-in-75">
                    {project.unreadCount}
                  </span>
                ) : null}

                {/* Attention Indicators on Avatar */}
                <div className="absolute -top-1 -left-1 z-20 flex items-center -space-x-1">
                  {isRevision ? (
                    <span
                      className="ring-1.5 flex size-3.5 animate-bounce items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white shadow-xs ring-background"
                      title="Revision Requested"
                    >
                      <AlertTriangle className="size-2" />
                    </span>
                  ) : null}
                  {hasPendingApproval ? (
                    <span
                      className="ring-1.5 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white shadow-xs ring-background"
                      title={`${project.pendingApprovalsCount || 1} pending approval(s)`}
                    >
                      <ShieldCheck className="size-2" />
                    </span>
                  ) : null}
                  {isClientMessage ? (
                    <span
                      className="ring-1.5 flex size-3.5 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white shadow-xs ring-background"
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
          className="pointer-events-none z-50 w-72 space-y-2 border-border/80 bg-popover/95 p-3 text-left shadow-2xl backdrop-blur-md"
        >
          {/* Header: Project Code + Name + Status */}
          <div className="flex items-start justify-between gap-1.5 border-b border-border/50 pb-2">
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-1.5">
                <span className="py-0.2 shrink-0 rounded border border-primary/20 bg-primary/10 px-1.5 font-mono text-[10px] font-bold text-primary">
                  {project.code}
                </span>
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  • {project.status.name}
                </span>
              </div>
              <h4 className="truncate text-xs font-bold text-foreground">
                {project.name}
              </h4>
            </div>
            {project.isPinned && (
              <Pin className="size-3 shrink-0 rotate-45 fill-amber-500/20 text-amber-500" />
            )}
          </div>

          {/* Attention Tags in Tooltip */}
          <div className="flex flex-col gap-1">
            {isRevision && (
              <div className="flex items-center gap-1 rounded border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="size-3 shrink-0 text-rose-500" />
                <span>
                  Revision requested ({project.pendingRevisionsCount || 1})
                </span>
              </div>
            )}
            {hasPendingApproval && (
              <div className="flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <ShieldCheck className="size-3 shrink-0 text-amber-500" />
                <span>
                  {project.pendingApprovalsCount || 1} pending approval(s)
                </span>
              </div>
            )}
            {isClientMessage && (
              <div className="flex items-center gap-1 rounded border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                <Send className="size-3 shrink-0 text-purple-500" />
                <span>
                  Client inbound communication (
                  {project.pendingInboundCount || 1})
                </span>
              </div>
            )}
          </div>

          {/* Client & Platform Info */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 truncate font-medium text-foreground/80">
              <Building2 className="size-3 shrink-0 text-primary" />
              {project.client.name}
            </span>
            {project.client.platform && (
              <span className="py-0.2 rounded bg-muted px-1.5 text-[9px] font-medium text-muted-foreground">
                {project.client.platform}
              </span>
            )}
          </div>

          {/* Last Message Preview */}
          {project.lastMessage && (
            <div className="rounded-md border border-border/40 bg-muted/40 p-1.5 text-[10px] leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground/90">
                {project.lastMessage.senderName.split(" ")[0]}:
              </span>{" "}
              <span className="line-clamp-2">{project.lastMessage.text}</span>
            </div>
          )}

          {/* Footer Status */}
          <div className="flex items-center justify-between border-t border-border/30 pt-1 text-[10px] font-medium text-muted-foreground">
            <span>
              {project.onlineCount
                ? `${project.onlineCount} online`
                : "Offline"}
            </span>
            <span className="font-semibold text-primary">
              Click to open chat
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  // 2. EXPANDED VIEW
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(project)
        }
      }}
      className={cn(
        "group relative flex w-full cursor-pointer items-start gap-3 rounded-xl border p-2.5 text-left transition-all duration-200 outline-none select-none sm:p-3",
        isSelected
          ? "border-primary/25 bg-primary/[0.08] text-foreground shadow-2xs dark:bg-primary/[0.12]"
          : isRecentlyUpdated
            ? "animate-in border-primary/40 bg-primary/10 fade-in-50"
            : "border-transparent text-muted-foreground hover:border-border/40 hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {/* Active Left Indicator Bar */}
      {isSelected && (
        <span className="absolute top-3 bottom-3 left-0 w-1 rounded-r-full bg-primary shadow-xs" />
      )}

      {/* Avatar with Online/Active indicator */}
      <div className="relative mt-0.5 shrink-0">
        <Avatar className="size-10 rounded-xl shadow-2xs ring-1 ring-border/50">
          <AvatarImage src={project.client.avatar} alt={project.name} />
          <AvatarFallback
            className={cn(
              "rounded-xl border bg-gradient-to-br font-mono text-xs font-bold transition-transform group-hover:scale-105",
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
            className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-500 shadow-xs ring-2 ring-card"
            title={`${project.onlineCount} online`}
          />
        ) : null}

        {/* Attention Pip on Avatar */}
        {isRevision ? (
          <span
            className="ring-1.5 absolute -top-1 -left-1 flex size-3.5 animate-bounce items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white shadow-xs ring-card"
            title="Revision Requested"
          >
            <AlertTriangle className="size-2" />
          </span>
        ) : hasPendingApproval ? (
          <span
            className="ring-1.5 absolute -top-1 -left-1 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white shadow-xs ring-card"
            title="Needs Review"
          >
            <ShieldCheck className="size-2" />
          </span>
        ) : isClientMessage ? (
          <span
            className="ring-1.5 absolute -top-1 -left-1 flex size-3.5 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white shadow-xs ring-card"
            title="Client Inbound"
          >
            <Send className="size-2" />
          </span>
        ) : null}
      </div>

      {/* Content Body */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Line 1: Code Badge + Project Name + Timestamp */}
        <div className="flex min-w-0 items-center justify-between gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {/* Primary Project Code Badge */}
            <span
              className={cn(
                "max-w-[110px] shrink-0 truncate rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-tight transition-colors",
                isSelected
                  ? "border-primary/30 bg-primary/20 font-extrabold text-primary"
                  : "border-border/50 bg-muted/80 text-muted-foreground group-hover:border-border group-hover:text-foreground"
              )}
            >
              {project.code}
            </span>

            {/* Project Title */}
            <span
              className={cn(
                "truncate text-xs leading-tight font-semibold tracking-tight",
                isSelected
                  ? "font-bold text-foreground"
                  : hasUnread
                    ? "font-bold text-foreground"
                    : "text-foreground/90 group-hover:text-foreground"
              )}
            >
              {project.name}
            </span>
          </div>

          <span className="ml-1 shrink-0 text-[10px] font-medium whitespace-nowrap text-muted-foreground/80">
            {project.lastMessage?.timestamp || "Recently"}
          </span>
        </div>

        {/* Line 2: Client & Platform */}
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1 truncate font-medium text-foreground/80">
            <Building2 className="size-3 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{project.client.name}</span>
          </span>
          {project.client.platform && (
            <span className="py-0.2 shrink-0 rounded-md border border-border/40 bg-muted/80 px-1.5 text-[9.5px] font-medium text-muted-foreground/75">
              {project.client.platform}
            </span>
          )}
        </div>

        {/* Line 3: Attention Status Pills (Compact Single-Row Flex Wrap) */}
        {(isRevision || hasPendingApproval || isClientMessage) && (
          <div className="my-0.5 flex flex-wrap items-center gap-1">
            {isRevision && (
              <span className="inline-flex shrink-0 animate-pulse items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="size-2.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Revision Needed</span>
              </span>
            )}
            {hasPendingApproval && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-600 dark:text-amber-400">
                <ShieldCheck className="size-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Needs Review{" "}
                  {project.pendingApprovalsCount
                    ? `(${project.pendingApprovalsCount})`
                    : ""}
                </span>
              </span>
            )}
            {isClientMessage && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-purple-600 dark:text-purple-400">
                <Send className="size-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
                <span>
                  Client Inbound{" "}
                  {project.pendingInboundCount
                    ? `(${project.pendingInboundCount})`
                    : ""}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Line 4: Last Message Snippet + Actions/Unread */}
        <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
          <p
            className={cn(
              "flex-1 truncate text-[11px] leading-snug",
              hasUnread
                ? "font-semibold text-foreground"
                : "text-muted-foreground/80"
            )}
          >
            {project.lastMessage ? (
              <>
                <span
                  className={cn(
                    "font-medium",
                    hasUnread
                      ? "font-bold text-foreground"
                      : "text-foreground/75"
                  )}
                >
                  {project.lastMessage.senderName.split(" ")[0]}:{" "}
                </span>
                <span>{project.lastMessage.text}</span>
              </>
            ) : (
              <span className="text-muted-foreground/50 italic">
                No messages yet
              </span>
            )}
          </p>

          <div className="flex shrink-0 items-center gap-1">
            {onTogglePin ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePin(project.id)
                }}
                onKeyDown={(e) => {
                  e.stopPropagation()
                }}
                className={cn(
                  "flex size-5 cursor-pointer items-center justify-center rounded transition-all",
                  project.isPinned
                    ? "text-amber-500 hover:bg-amber-500/15 hover:text-amber-600"
                    : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                )}
                title={
                  project.isPinned
                    ? "Unpin project from top"
                    : "Pin project to top"
                }
              >
                <Pin
                  className={cn(
                    "size-3",
                    project.isPinned && "rotate-45 fill-amber-500/20"
                  )}
                />
              </button>
            ) : project.isPinned ? (
              <Pin className="size-3 rotate-45 fill-amber-500/20 text-amber-500/80" />
            ) : null}

            {hasUnread && (
              <span className="flex h-4.5 min-w-4.5 animate-in items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-2xs zoom-in-95">
                {project.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
