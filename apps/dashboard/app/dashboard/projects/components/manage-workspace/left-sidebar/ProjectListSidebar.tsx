"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@workspace/ui/components/tooltip";
import {
  FolderKanban,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  Pin,
  MessageSquare,
  Monitor,
  Radio,
  Globe,
  Layers,
  Check,
  PlusCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { ProjectListItem } from "./ProjectListItem";
import { ProjectSearchFilter, type ProjectFilterCategory } from "./ProjectSearchFilter";
import type { ProjectWorkspaceItem } from "../types";
import type { StationItem, ActiveStationContext } from "@workspace/shared";
import { formatSessionDuration } from "@/lib/station/StationContext";
import { cn } from "@workspace/ui/lib/utils";

interface ProjectListSidebarProps {
  projects: ProjectWorkspaceItem[];
  selectedProjectId: string | null;
  onSelectProject: (project: ProjectWorkspaceItem) => void;
  onTogglePinProject?: (projectId: string) => void;
  onNewProject?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  recentlyUpdatedId?: string | null;
  hasMoreProjects?: boolean;
  isLoadingMoreProjects?: boolean;
  onLoadMoreProjects?: () => void;
  stationFilter?: string;
  onStationFilterChange?: (stationId: string) => void;
  activeSessions?: ActiveStationContext[];
  currentStationId?: string | null;
  activeStation?: StationItem | null;
  myStations?: StationItem[];
  onOpenStationModal?: () => void;
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
  onTogglePinProject,
  onNewProject,
  isCollapsed = false,
  onToggleCollapse,
  recentlyUpdatedId,
  hasMoreProjects = false,
  isLoadingMoreProjects = false,
  onLoadMoreProjects,
  stationFilter = "all",
  onStationFilterChange,
  activeSessions = [],
  currentStationId,
  activeStation,
  myStations = [],
  onOpenStationModal,
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

  // Helper to get active station session IDs
  const activeStationIdSet = React.useMemo(() => {
    return new Set(activeSessions.map((s) => s.station.id));
  }, [activeSessions]);

  // Assigned stations not joined
  const unjoinedAssignedStations = React.useMemo(() => {
    return myStations.filter((s) => !activeStationIdSet.has(s.id));
  }, [myStations, activeStationIdSet]);

  // 1. COLLAPSED VIEW (Slim Icon / Avatar Rail with Tooltips)
  if (isCollapsed) {
    return (
      <TooltipProvider delay={100}>
        <div
          className={cn(
            "flex h-full w-16 xl:w-[68px] flex-col items-center bg-card/70 backdrop-blur-xs border-r border-border/50 select-none py-2 shrink-0 transition-all duration-300",
            className
          )}
        >
          {/* Collapsed Top Header (Single Expand Button) */}
          <div className="flex flex-col items-center justify-center pb-2 border-b border-border/40 w-full px-2">
            {onToggleCollapse && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={onToggleCollapse}
                      className="size-8.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer transition-colors"
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
        "flex h-full flex-col bg-card/60 backdrop-blur-xs border-r border-border/50 select-none transition-all duration-300",
        className
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/40 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex size-7.5 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 border border-primary/20">
            <FolderKanban className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5 truncate">
              Projects & Channels
              <span className="rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.2 border border-primary/25">
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
            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted/80 shrink-0 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        )}
      </div>

      {/* Workstation Scope Selector & Multi-Station Quick Switcher */}
      {((myStations && myStations.length > 0) || activeSessions.length > 0 || activeStation) &&
        onStationFilterChange && (
          <div className="px-3 py-2 border-b border-border/40 bg-muted/20 space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Monitor className="size-3 text-primary" /> Workstation Scope
              </span>
              {stationFilter && stationFilter !== "all" ? (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-medium">
                  Station Filter Active
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                  All Projects
                </span>
              )}
            </div>

            {/* Quick Multi-Station Switcher Pills if user is joined to multiple stations */}
            {activeSessions.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                <Badge
                  variant={stationFilter === "all" ? "default" : "outline"}
                  className={`text-[9px] cursor-pointer py-0 px-1.5 transition-colors shrink-0 ${
                    stationFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted/60 text-muted-foreground"
                  }`}
                  onClick={() => onStationFilterChange("all")}
                >
                  All
                </Badge>
                {activeSessions.map((s) => {
                  const isSelected = stationFilter === s.station.id;
                  const isFocused = s.station.id === currentStationId;
                  const duration = formatSessionDuration(s.session?.joinedAt);
                  return (
                    <Badge
                      key={s.station.id}
                      variant={isSelected ? "default" : "outline"}
                      className={`text-[9px] cursor-pointer py-0 px-1.5 transition-colors shrink-0 gap-1 ${
                        isSelected
                          ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                          : "hover:bg-muted/60 text-muted-foreground"
                      }`}
                      onClick={() => onStationFilterChange(s.station.id)}
                      title={`${s.station.name} • Active for ${duration} • (${s.activeProfiles.length} profiles)`}
                    >
                      <span className={`size-1.5 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`} />
                      <span className="truncate max-w-[80px]">{s.station.name}</span>
                      <span className="text-[8px] opacity-75 font-mono">({duration})</span>
                      {isFocused && <span className="text-[8px] opacity-75">★</span>}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Dropdown Scope Selector */}
            <Select
              value={stationFilter || "all"}
              onValueChange={(val: string | null) => onStationFilterChange(val || "all")}
            >
              <SelectTrigger className="w-full h-8 text-xs bg-background/80 border-border/60">
                <SelectValue placeholder="Scope">
                  {stationFilter === "all" ? (
                    <div className="flex items-center gap-1.5 truncate">
                      <Globe className="size-3 text-muted-foreground" />
                      <span>All Projects (Global Scope)</span>
                    </div>
                  ) : (
                    (() => {
                      const activeSess = activeSessions.find((s) => s.station.id === stationFilter);
                      if (activeSess) {
                        return (
                          <div className="flex items-center gap-1.5 truncate font-medium">
                            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">{activeSess.station.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({activeSess.station.code})
                            </span>
                            {activeSess.station.id === currentStationId && (
                              <Badge variant="secondary" className="text-[8px] py-0 px-1 ml-auto">
                                Focused
                              </Badge>
                            )}
                          </div>
                        );
                      }
                      const assigned = myStations.find((s) => s.id === stationFilter);
                      if (assigned) {
                        return (
                          <div className="flex items-center gap-1.5 truncate">
                            <Monitor className="size-3 text-muted-foreground" />
                            <span className="truncate">{assigned.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({assigned.code})
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div className="flex items-center gap-1.5 truncate">
                          <Monitor className="size-3 text-muted-foreground" />
                          <span>Filtered Station</span>
                        </div>
                      );
                    })()
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all" className="text-xs">
                  <div className="flex items-center gap-2">
                    <Globe className="size-3.5 text-muted-foreground" />
                    <span className="font-medium">All Projects (All Workstations)</span>
                  </div>
                </SelectItem>

                {/* Active Joined Workstations */}
                {activeSessions.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                      Active Shifts ({activeSessions.length})
                    </SelectLabel>
                    {activeSessions.map((s) => {
                      const isFocused = s.station.id === currentStationId;
                      const duration = formatSessionDuration(s.session?.joinedAt);
                      return (
                        <SelectItem key={s.station.id} value={s.station.id} className="text-xs">
                          <div className="flex items-center justify-between gap-2 w-full">
                            <div className="flex items-center gap-2 min-w-0">
                              <Radio className="size-3.5 text-emerald-500 animate-pulse shrink-0" />
                              <span className="font-semibold truncate">{s.station.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({s.station.code})
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isFocused && (
                                <Badge variant="secondary" className="text-[9px] py-0 px-1 text-primary">
                                  Focused
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                                {duration}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] py-0 px-1">
                                {s.activeProfiles.length}p
                              </Badge>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                )}

                {/* Other Assigned Workstations */}
                {unjoinedAssignedStations.length > 0 && (
                  <SelectGroup>
                    <SelectSeparator />
                    <SelectLabel className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                      Other Assigned Stations
                    </SelectLabel>
                    {unjoinedAssignedStations.map((stn) => (
                      <SelectItem key={stn.id} value={stn.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Monitor className="size-3.5 text-muted-foreground" />
                          <span>{stn.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({stn.code})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {onOpenStationModal && (
                  <>
                    <SelectSeparator />
                    <div
                      className="p-1.5 text-center cursor-pointer hover:bg-muted/60 rounded text-xs text-primary font-medium flex items-center justify-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStationModal();
                      }}
                    >
                      <PlusCircle className="size-3.5" />
                      <span>Join / Manage Stations</span>
                    </div>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

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
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
            <Sparkles className="size-7 text-muted-foreground/40" />
            <p className="text-xs font-semibold text-foreground">
              {stationFilter !== "all"
                ? "No projects on this workstation"
                : "No projects found"}
            </p>
            <p className="text-[11px] text-muted-foreground max-w-[220px]">
              {stationFilter !== "all"
                ? "No projects match the profiles of this workstation."
                : "Try adjusting your search or category filter."}
            </p>
            {stationFilter !== "all" && onStationFilterChange && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2 mt-1"
                onClick={() => onStationFilterChange("all")}
              >
                View All Projects
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pinned section if any */}
            {pinnedProjects.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Pin className="size-3 text-primary rotate-45" />
                  <span>Pinned Channels ({pinnedProjects.length})</span>
                </div>
                <div className="space-y-1">
                  {pinnedProjects.map((proj) => (
                    <ProjectListItem
                      key={proj.id}
                      project={proj}
                      isSelected={selectedProjectId === proj.id}
                      onSelect={onSelectProject}
                      onTogglePin={onTogglePinProject}
                      isRecentlyUpdated={proj.id === recentlyUpdatedId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unpinned / Regular Projects */}
            <div className="space-y-1">
              {pinnedProjects.length > 0 && unpinnedProjects.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <MessageSquare className="size-3" />
                  <span>All Channels ({unpinnedProjects.length})</span>
                </div>
              )}
              <div className="space-y-1">
                {unpinnedProjects.map((proj) => (
                  <ProjectListItem
                    key={proj.id}
                    project={proj}
                    isSelected={selectedProjectId === proj.id}
                    onSelect={onSelectProject}
                    onTogglePin={onTogglePinProject}
                    isRecentlyUpdated={proj.id === recentlyUpdatedId}
                  />
                ))}
              </div>
            </div>

            {/* Loading More Indicator */}
            {isLoadingMoreProjects && (
              <div className="flex items-center justify-center p-3 text-xs text-muted-foreground gap-1.5">
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
