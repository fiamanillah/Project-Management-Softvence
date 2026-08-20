"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@workspace/ui/components/tooltip";
import {
  Plus,
  FolderKanban,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
} from "lucide-react";
import { ProjectListItem } from "./ProjectListItem";
import { ProjectSearchFilter, type ProjectFilterCategory } from "./ProjectSearchFilter";
import type { ProjectWorkspaceItem } from "../types";
import { cn } from "@workspace/ui/lib/utils";

interface ProjectListSidebarProps {
  projects: ProjectWorkspaceItem[];
  selectedProjectId: string | null;
  onSelectProject: (project: ProjectWorkspaceItem) => void;
  onNewProject?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  recentlyUpdatedId?: string | null;
  hasMoreProjects?: boolean;
  isLoadingMoreProjects?: boolean;
  onLoadMoreProjects?: () => void;
  className?: string;
}

export function sortProjectsByActivity(projectList: ProjectWorkspaceItem[]): ProjectWorkspaceItem[] {
  return [...projectList].sort((a, b) => {
    // 1. Pinned projects first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // 2. Sort by lastActivityAt (or lastMessage timestamp or createdAt) descending
    const timeA = a.lastActivityAt
      ? new Date(a.lastActivityAt).getTime()
      : a.lastMessage?.createdAt
      ? new Date(a.lastMessage.createdAt).getTime()
      : a.createdAt
      ? new Date(a.createdAt).getTime()
      : 0;
    const timeB = b.lastActivityAt
      ? new Date(b.lastActivityAt).getTime()
      : b.lastMessage?.createdAt
      ? new Date(b.lastMessage.createdAt).getTime()
      : b.createdAt
      ? new Date(b.createdAt).getTime()
      : 0;

    if (timeA !== timeB) return timeB - timeA;

    return (a.code || "").localeCompare(b.code || "");
  });
}

export function ProjectListSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onNewProject,
  isCollapsed = false,
  onToggleCollapse,
  recentlyUpdatedId,
  hasMoreProjects = false,
  isLoadingMoreProjects = false,
  onLoadMoreProjects,
  className,
}: ProjectListSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<ProjectFilterCategory>("all");
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Infinite Scroll Trigger for Project List
  React.useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-slot='scroll-area-viewport']"
    ) as HTMLElement | null;
    if (!viewport) return;

    const handleScroll = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      if (distanceFromBottom < 100 && hasMoreProjects && !isLoadingMoreProjects) {
        onLoadMoreProjects?.();
      }
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [hasMoreProjects, isLoadingMoreProjects, onLoadMoreProjects]);

  // Keep projects sorted by activity
  const sortedProjects = React.useMemo(() => {
    return sortProjectsByActivity(projects);
  }, [projects]);

  // Compute counts for all filter categories
  const counts = React.useMemo<Record<ProjectFilterCategory, number>>(() => {
    const res: Record<ProjectFilterCategory, number> = {
      all: sortedProjects.length,
      active: sortedProjects.filter((p) => !p.status.isTerminal && p.status.id !== "st-in-review").length,
      review: sortedProjects.filter((p) => p.status.id === "st-in-review" || p.status.name.toLowerCase().includes("review")).length,
      critical: sortedProjects.filter((p) => p.priority.level === 0 || p.priority.name.toLowerCase().includes("critical") || p.priority.name.toLowerCase().includes("high")).length,
      delivered: sortedProjects.filter((p) => p.status.isTerminal || p.status.name.toLowerCase().includes("delivered")).length,
    };
    return res;
  }, [sortedProjects]);

  // Filtered projects
  const filteredProjects = React.useMemo(() => {
    return sortedProjects.filter((p) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesClient = p.client.name.toLowerCase().includes(q);
        const matchesService = p.serviceLine.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesClient && !matchesService) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory === "active") {
        return !p.status.isTerminal && p.status.id !== "st-in-review";
      }
      if (selectedCategory === "review") {
        return p.status.id === "st-in-review" || p.status.name.toLowerCase().includes("review");
      }
      if (selectedCategory === "critical") {
        return p.priority.level === 0 || p.priority.name.toLowerCase().includes("critical") || p.priority.name.toLowerCase().includes("high");
      }
      if (selectedCategory === "delivered") {
        return p.status.isTerminal || p.status.name.toLowerCase().includes("delivered");
      }

      return true;
    });
  }, [sortedProjects, searchQuery, selectedCategory]);

  const pinnedProjects = filteredProjects.filter((p) => p.isPinned);
  const unpinnedProjects = filteredProjects.filter((p) => !p.isPinned);

  // 1. COLLAPSED VIEW (Slim Icon / Avatar Rail with Tooltips)
  if (isCollapsed) {
    return (
      <TooltipProvider delay={100}>
        <div
          className={cn(
            "flex h-full w-16 xl:w-[68px] flex-col items-center bg-card/60 backdrop-blur-xs border-r border-border/60 select-none py-2 shrink-0 transition-all duration-300",
            className
          )}
        >
          {/* Collapsed Top Header (Single Expand Button) */}
          <div className="flex flex-col items-center justify-center pb-2 border-b border-border/50 w-full px-2">
            {onToggleCollapse && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={onToggleCollapse}
                      className="size-8.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                      title="Expand sidebar"
                    >
                      <PanelLeftOpen className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent side="right" sideOffset={8}>
                  Expand projects sidebar
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Project Avatars List */}
          <ScrollArea className="flex-1 w-full py-2">
            <div className="flex flex-col items-center gap-3 px-1 py-1">
              {filteredProjects.map((proj) => (
                <ProjectListItem
                  key={proj.id}
                  project={proj}
                  isSelected={selectedProjectId === proj.id}
                  onSelect={onSelectProject}
                  isCollapsed={true}
                  isRecentlyUpdated={proj.id === recentlyUpdatedId}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </TooltipProvider>
    );
  }

  // 2. EXPANDED VIEW
  return (
    <div
      className={cn(
        "flex h-full flex-col bg-card/60 backdrop-blur-xs border-r border-border/60 select-none transition-all duration-300",
        className
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/50 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <FolderKanban className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5 truncate">
              Manage Projects
              <span className="rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.2">
                {projects.length}
              </span>
            </h2>
          </div>
        </div>

        {onToggleCollapse && (
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onToggleCollapse}
            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted/80 shrink-0"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        )}
      </div>

      {/* Search & Category Filter */}
      <ProjectSearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        counts={counts}
      />

      {/* Project Channel List */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-2 py-2">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Sparkles className="size-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs font-semibold text-foreground">No projects found</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
              Try adjusting your search or category filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pinned section if any */}
            {pinnedProjects.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70">
                  Pinned Channels
                </div>
                <div className="space-y-1">
                  {pinnedProjects.map((proj) => (
                    <ProjectListItem
                      key={proj.id}
                      project={proj}
                      isSelected={selectedProjectId === proj.id}
                      onSelect={onSelectProject}
                      isCollapsed={false}
                      isRecentlyUpdated={proj.id === recentlyUpdatedId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Projects section */}
            {unpinnedProjects.length > 0 && (
              <div className="space-y-1">
                {pinnedProjects.length > 0 && (
                  <div className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70">
                    All Conversations
                  </div>
                )}
                <div className="space-y-1">
                  {unpinnedProjects.map((proj) => (
                    <ProjectListItem
                      key={proj.id}
                      project={proj}
                      isSelected={selectedProjectId === proj.id}
                      onSelect={onSelectProject}
                      isCollapsed={false}
                      isRecentlyUpdated={proj.id === recentlyUpdatedId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Infinite Loading Spinner */}
            {isLoadingMoreProjects && (
              <div className="flex items-center justify-center p-3 text-muted-foreground gap-1.5 text-[11px] font-medium animate-pulse">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span>Loading more projects...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
