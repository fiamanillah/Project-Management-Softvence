"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  ArrowLeft,
  Search,
  Phone,
  PanelRightOpen,
  PanelRightClose,
  MoreVertical,
  BellOff,
  FolderOpen,
  Share2,
  Users,
  Settings,
  ShieldCheck,
  Send,
  MessageSquare,
  Pin,
  Download,
  ChevronDown,
  ChevronRight,
  Building2,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { toast } from "sonner";
import { ExportChatDialog } from "./ExportChatDialog";
import { PinnedMessagesModal } from "./PinnedMessagesModal";
import type { ProjectWorkspaceItem, ProjectPinnedAnnouncement } from "../types";

export type ChannelFilterMode = "all" | "internal" | "client" | "approvals";

interface ProjectChatHeaderProps {
  project: ProjectWorkspaceItem;
  onBackMobile?: () => void;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
  onSearchClick?: () => void;
  activeChannel: ChannelFilterMode;
  onChannelChange: (channel: ChannelFilterMode) => void;
  pendingApprovalsCount?: number;
  onScrollToMessage?: (messageId: string) => void;
  onTogglePinMessage?: (messageId: string) => void;
  onTogglePinProject?: (projectId: string) => void;
}

export function ProjectChatHeader({
  project,
  onBackMobile,
  isRightSidebarOpen,
  onToggleRightSidebar,
  onSearchClick,
  activeChannel,
  onChannelChange,
  pendingApprovalsCount = 0,
  onScrollToMessage,
  onTogglePinMessage,
  onTogglePinProject,
}: ProjectChatHeaderProps) {
  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
  const [isPinnedModalOpen, setIsPinnedModalOpen] = React.useState(false);

  const initials = project.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const onlineMembers = project.members.filter((m) => m.isOnline);

  // List of all pinned announcements / messages
  const pinnedList: ProjectPinnedAnnouncement[] = React.useMemo(() => {
    if (project.pinnedAnnouncements && project.pinnedAnnouncements.length > 0) {
      return project.pinnedAnnouncements;
    }
    if (project.pinnedAnnouncement) {
      return [
        {
          id: project.pinnedAnnouncement.id,
          messageId: project.pinnedAnnouncement.messageId || "msg-101",
          message: project.pinnedAnnouncement.message,
          author: project.pinnedAnnouncement.author,
          authorAvatar: project.pinnedAnnouncement.authorAvatar,
          authorDesignation: project.pinnedAnnouncement.authorDesignation,
          timestamp: project.pinnedAnnouncement.timestamp,
          category: project.pinnedAnnouncement.category || "ANNOUNCEMENT",
        },
      ];
    }
    return [];
  }, [project.pinnedAnnouncements, project.pinnedAnnouncement]);

  const handleShareProject = () => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/dashboard/manage-projects?projectId=${project.id}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success(`Project ${project.code} link copied to clipboard`);
    }
  };

  return (
    <div className="border-b border-border/60 bg-card/90 backdrop-blur-md select-none shrink-0 w-full overflow-hidden">
      {/* Top Header Row */}
      <div className="flex h-13 sm:h-14 items-center justify-between px-2.5 sm:px-4 gap-2">
        {/* Left: Mobile Back + Primary Project Code & Title */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          {onBackMobile && (
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={onBackMobile}
              className="md:hidden size-7 text-muted-foreground hover:text-foreground cursor-pointer -ml-1 shrink-0"
              title="Back to projects"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}

          <button
            type="button"
            onClick={onToggleRightSidebar}
            className="flex items-center gap-2 text-left cursor-pointer group min-w-0 flex-1"
          >
            <div className="relative shrink-0">
              <Avatar className="size-8 sm:size-9 rounded-xl ring-1 ring-border/50">
                <AvatarImage src={project.client.avatar} alt={project.name} />
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-[10px] sm:text-xs font-mono">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 size-2 sm:size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* PROMINENT AUTO-GENERATED PROJECT CODE */}
                <span className="font-mono text-[11px] sm:text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20 shrink-0">
                  {project.code}
                </span>
                <h3 className="truncate text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                  {project.name}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                <span className="truncate font-medium">{project.client.name}</span>
                {project.client.platform && (
                  <span className="hidden xs:inline text-[9px] sm:text-[10px] text-muted-foreground/80 bg-muted px-1 py-0.2 rounded truncate">
                    {project.client.platform}
                  </span>
                )}
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                  {onlineMembers.length} online
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Right: Team Avatar Pile & Action Buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Team Avatars Stack (Desktop Only) */}
          <div className="hidden xl:flex items-center -space-x-1.5 mr-1.5">
            {project.members.slice(0, 3).map((member) => (
              <Avatar
                key={member.id}
                className="size-6 rounded-full ring-2 ring-background border border-border/50"
                title={`${member.name} (${member.designation})`}
              >
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback className="text-[8px] font-bold">
                  {member.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {project.members.length > 3 && (
              <div className="flex size-6 items-center justify-center rounded-full bg-muted ring-2 ring-background text-[9px] font-bold text-muted-foreground">
                +{project.members.length - 3}
              </div>
            )}
          </div>

          {/* Search inside project */}
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onSearchClick}
            className="size-7 sm:size-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Search conversation"
          >
            <Search className="size-3.5 sm:size-4" />
          </Button>

          {/* Start Audio Huddle */}
          <Button
            size="icon-xs"
            variant="ghost"
            className="hidden sm:inline-flex size-7 sm:size-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Start Audio Huddle"
          >
            <Phone className="size-3.5 sm:size-4" />
          </Button>

          {/* Toggle Right Details Sidebar */}
          <Button
            size="icon-xs"
            variant={isRightSidebarOpen ? "secondary" : "ghost"}
            onClick={onToggleRightSidebar}
            className={cn(
              "size-7 sm:size-8 cursor-pointer transition-colors",
              isRightSidebarOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            )}
            title="Project Information & Assets"
          >
            {isRightSidebarOpen ? (
              <PanelRightClose className="size-3.5 sm:size-4" />
            ) : (
              <PanelRightOpen className="size-3.5 sm:size-4" />
            )}
          </Button>

          {/* More Options Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="size-7 sm:size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="More Options"
                >
                  <MoreVertical className="size-3.5 sm:size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52 text-xs">
              <DropdownMenuItem onClick={onToggleRightSidebar} className="gap-2">
                <FolderOpen className="size-3.5 text-muted-foreground" />
                Project Information & Files
              </DropdownMenuItem>
              {onTogglePinProject && (
                <DropdownMenuItem onClick={() => onTogglePinProject(project.id)} className="gap-2">
                  <Pin className={cn("size-3.5 text-muted-foreground", project.isPinned && "text-amber-500 fill-amber-500/20")} />
                  {project.isPinned ? "Unpin Project" : "Pin Project"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="gap-2">
                <Users className="size-3.5 text-muted-foreground" />
                Manage Team Roster
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareProject} className="gap-2">
                <Share2 className="size-3.5 text-muted-foreground" />
                Share Project Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsExportDialogOpen(true)} className="gap-2">
                <Download className="size-3.5 text-muted-foreground" />
                Export Conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">
                <BellOff className="size-3.5 text-muted-foreground" />
                Mute Notifications
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Settings className="size-3.5 text-muted-foreground" />
                Project Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Single Consolidated Sub-bar: Stream Filters on Left + Pinned Message on Right */}
      <div className="flex items-center justify-between gap-2 px-2.5 sm:px-4 py-1.5 overflow-x-auto no-scrollbar border-t border-border/40 bg-muted/20 min-w-0">
        {/* Left: Stream Filter Pills */}
        <div className="flex items-center gap-1.5 shrink-0 min-w-0">
          <button
            type="button"
            onClick={() => onChannelChange("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-all shrink-0 cursor-pointer select-none",
              activeChannel === "all"
                ? "bg-background text-foreground shadow-2xs border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <MessageSquare className="size-3 shrink-0" />
            <span>All Stream</span>
          </button>

          <button
            type="button"
            onClick={() => onChannelChange("internal")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-all shrink-0 cursor-pointer select-none",
              activeChannel === "internal"
                ? "bg-background text-foreground shadow-2xs border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Users className="size-3 text-primary shrink-0" />
            <span>Internal Discussion</span>
          </button>

          <button
            type="button"
            onClick={() => onChannelChange("client")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-all shrink-0 cursor-pointer select-none",
              activeChannel === "client"
                ? "bg-background text-foreground shadow-2xs border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Building2 className="size-3 text-sky-500 shrink-0" />
            <span>Client Comms</span>
          </button>

          <button
            type="button"
            onClick={() => onChannelChange("approvals")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-all shrink-0 cursor-pointer select-none",
              activeChannel === "approvals"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <ShieldCheck className="size-3.5 text-amber-500 shrink-0" />
            <span>Pending Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="rounded-full bg-amber-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 leading-none">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        </div>

        {/* Right: Pinned Messages Dropdown Menu */}
        {pinnedList.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30 transition-all shrink-0 cursor-pointer shadow-2xs group ml-auto select-none"
                  title="View all pinned announcements & messages"
                >
                  <Pin className="size-3 text-amber-500 shrink-0 rotate-45 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0">
                    Pinned
                  </span>
                  <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-white font-mono text-[9px] font-bold">
                    {pinnedList.length}
                  </span>
                  <ChevronDown className="size-3 text-amber-600/70 dark:text-amber-400/70 ml-0.5 shrink-0" />
                </button>
              }
            />
            <DropdownMenuContent
              align="end"
              className="w-80 sm:w-96 p-1.5 shadow-xl border-border/80 bg-popover/95 backdrop-blur-md z-50"
            >
              {/* Dropdown Header */}
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/50 mb-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Pin className="size-3.5 text-amber-500 rotate-45" />
                  <span>Pinned Messages ({pinnedList.length})</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Click to jump in chat</span>
              </div>

              {/* Pinned Items List */}
              <div className="max-h-[300px] overflow-y-auto space-y-1 p-0.5 no-scrollbar">
                {pinnedList.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => onScrollToMessage?.(item.messageId)}
                    className="flex flex-col items-start gap-1 p-2.5 rounded-lg cursor-pointer hover:bg-muted/80 focus:bg-muted/80 transition-colors w-full"
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Avatar className="size-4.5 rounded-full ring-1 ring-border shrink-0">
                          {item.authorAvatar && <AvatarImage src={item.authorAvatar} alt={item.author} />}
                          <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                            {item.author.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] font-bold text-foreground truncate">
                          {item.author}
                        </span>
                        {item.category && (
                          <Badge
                            variant="outline"
                            className="text-[8px] font-semibold px-1 py-0 rounded bg-muted text-muted-foreground border-border/50 uppercase tracking-wider shrink-0"
                          >
                            {item.category}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {item.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-foreground/90 leading-snug line-clamp-2 text-left font-normal pl-0.5">
                      {item.message}
                    </p>

                    <div className="flex items-center gap-1 text-[10px] font-semibold text-primary mt-0.5 pl-0.5">
                      <span>Jump to message</span>
                      <ChevronRight className="size-3" />
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Export Conversation Dialog */}
      <ExportChatDialog
        projectId={project.id}
        projectCode={project.code}
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
      />

      {/* Pinned Announcements Modal */}
      <PinnedMessagesModal
        projectCode={project.code}
        pinnedList={pinnedList}
        open={isPinnedModalOpen}
        onOpenChange={setIsPinnedModalOpen}
        onSelectMessage={onScrollToMessage}
        onUnpinMessage={onTogglePinMessage}
      />
    </div>
  );
}
