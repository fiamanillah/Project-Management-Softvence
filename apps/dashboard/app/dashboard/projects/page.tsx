"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
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
import {
  Briefcase,
  Plus,
  RefreshCw,
  Search,
  LayoutList,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  ListTodo,
  Radio,
  Layers,
  Globe,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { useStationSession } from "@/lib/station/StationContext";
import { SelectStationModal } from "@/app/dashboard/stations/components/SelectStationModal";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type {
  ProjectItem,
  ProjectLookups,
  ProjectStats,
} from "@workspace/shared";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";
import { ProjectTable } from "./components/ProjectTable";
import { ProjectCardGrid } from "./components/ProjectCardGrid";
import { ProjectStatsCards } from "./components/ProjectStatsCards";
import { CreateProjectModal } from "./components/CreateProjectModal";
import { EditProjectModal } from "./components/EditProjectModal";
import { ManageProjectMembersModal } from "./components/ManageProjectMembersModal";
import { ManageComponentsModal } from "./components/ManageComponentsModal";
import { ProjectDetailDialog } from "./components/detail/ProjectDetailDialog";
import { DeleteProjectDialog } from "./components/DeleteProjectDialog";

export default function ProjectsPage() {
  return (
    <RouteGuard code="project.view">
      <React.Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading projects...</div>}>
        <ProjectsContent />
      </React.Suspense>
    </RouteGuard>
  );
}

function ProjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    activeSessions,
    currentStationId,
    activeContext,
    switchStation,
    selectModalOpen,
    setSelectModalOpen,
  } = useStationSession();

  const [projects, setProjects] = React.useState<ProjectItem[]>([]);
  const [lookups, setLookups] = React.useState<ProjectLookups | null>(null);
  const [stationsList, setStationsList] = React.useState<
    { id: string; name: string; code: string }[]
  >([]);

  const [stats, setStats] = React.useState<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    inProgressProjects: 0,
    inReviewProjects: 0,
    deliveredProjects: 0,
    totalPipelineValue: null,
  });
  const [isLoading, setIsLoading] = React.useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedStatusId, setSelectedStatusId] = React.useState<string>("all");
  const [selectedServiceLineId, setSelectedServiceLineId] = React.useState<string>("all");
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>("all");
  const [selectedPlatformId, setSelectedPlatformId] = React.useState<string>("all");

  // Default selectedStationId to URL param if provided, otherwise default to focused station
  const [selectedStationId, setSelectedStationId] = React.useState<string>(() => {
    const urlStn = searchParams.get("stationId");
    if (urlStn) return urlStn;
    return currentStationId || "all";
  });

  const [selectedProfileId, setSelectedProfileId] = React.useState<string>(
    searchParams.get("profileId") || "all"
  );
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Debounce search input by 300ms
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Sync with focused station from header widget
  const prevFocusedRef = React.useRef<string | null | undefined>(currentStationId);
  React.useEffect(() => {
    if (currentStationId && currentStationId !== prevFocusedRef.current) {
      prevFocusedRef.current = currentStationId;
      setSelectedStationId(currentStationId);
      setCurrentPage(1);
    }
  }, [currentStationId]);

  // Reset to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch,
    selectedStatusId,
    selectedServiceLineId,
    selectedTeamId,
    selectedPlatformId,
    selectedStationId,
    selectedProfileId,
  ]);

  // Modals & Dialogs
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [createParentId, setCreateParentId] = React.useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [membersModalOpen, setMembersModalOpen] = React.useState(false);
  const [componentsModalOpen, setComponentsModalOpen] = React.useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const [selectedProject, setSelectedProject] = React.useState<ProjectItem | null>(null);

  const handleOpenChat = (project: ProjectItem) => {
    router.push(`/dashboard/manage-projects?projectId=${project.id}`);
  };

  // Fetch Lookups & Stations
  const fetchLookups = React.useCallback(async () => {
    try {
      const [lookupsRes, stationsRes] = await Promise.all([
        api.get("/projects/lookups"),
        api.get("/stations?limit=100"),
      ]);
      setLookups(lookupsRes?.data || lookupsRes);
      const stnItems =
        stationsRes?.data?.items ||
        stationsRes?.items ||
        (Array.isArray(stationsRes) ? stationsRes : []);
      setStationsList(stnItems);
    } catch (err) {
      console.error("Failed to load lookups:", err);
    }
  }, []);

  // Fetch Projects List & Stats
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));
      params.set("_t", String(Date.now()));

      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (selectedStatusId !== "all") params.set("statusId", selectedStatusId);
      if (selectedServiceLineId !== "all") params.set("serviceLineId", selectedServiceLineId);
      if (selectedTeamId !== "all") params.set("teamId", selectedTeamId);
      if (selectedPlatformId !== "all") params.set("platformId", selectedPlatformId);
      if (selectedStationId !== "all") params.set("stationId", selectedStationId);
      if (selectedProfileId !== "all") params.set("profileId", selectedProfileId);

      const [projectsRes, statsRes] = await Promise.all([
        api.get(`/projects?${params.toString()}`),
        api.get("/projects/stats"),
      ]);

      const items = Array.isArray(projectsRes) ? projectsRes : projectsRes?.data || [];
      setProjects(items);

      const pagination =
        (projectsRes as any)?.pagination ||
        (projectsRes as any)?.meta?.pagination ||
        (projectsRes as any)?.meta;

      const total = typeof pagination?.total === "number" ? pagination.total : items.length;
      const pages = typeof pagination?.totalPages === "number" ? pagination.totalPages : Math.max(1, Math.ceil(total / pageSize));

      setTotalCount(total);
      setTotalPages(pages);

      if (statsRes) {
        setStats(statsRes?.data || statsRes);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    debouncedSearch,
    selectedStatusId,
    selectedServiceLineId,
    selectedTeamId,
    selectedPlatformId,
    selectedStationId,
    selectedProfileId,
  ]);

  React.useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal Handlers
  const handleViewDetails = (project: ProjectItem) => {
    setSelectedProject(project);
    setDetailDialogOpen(true);
  };

  const handleEdit = (project: ProjectItem) => {
    setSelectedProject(project);
    setEditModalOpen(true);
  };

  const handleManageMembers = (project: ProjectItem) => {
    setSelectedProject(project);
    setMembersModalOpen(true);
  };

  const handleManageComponents = (project: ProjectItem) => {
    setSelectedProject(project);
    setComponentsModalOpen(true);
  };

  const handleDelete = (project: ProjectItem) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleCreateSubProject = (parent: ProjectItem) => {
    setCreateParentId(parent.id);
    setCreateModalOpen(true);
  };

  // Helper station metadata
  const selectedStationMeta = React.useMemo(() => {
    if (selectedStationId === "all") return null;
    const fromActive = activeSessions.find((s) => s.station.id === selectedStationId);
    if (fromActive) return { name: fromActive.station.name, code: fromActive.station.code, isJoined: true };
    const fromList = stationsList.find((s) => s.id === selectedStationId);
    if (fromList) return { name: fromList.name, code: fromList.code, isJoined: false };
    return null;
  }, [selectedStationId, activeSessions, stationsList]);

  const otherActiveStations = React.useMemo(() => {
    return activeSessions.filter((s) => s.station.id !== selectedStationId);
  }, [activeSessions, selectedStationId]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Briefcase className="size-6 text-primary" />
            Projects & Engagements
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track operational deliveries, sales milestones, team assignments, and client channel activities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="h-9 gap-1.5 text-xs shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link href="/dashboard/manage-projects">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs shadow-2xs border-primary/40 text-primary hover:bg-primary/5 cursor-pointer"
            >
              <ListTodo className="size-3.5" />
              Manage Workspace
            </Button>
          </Link>

          <PermissionGate code="project.create">
            <Button
              size="sm"
              onClick={() => {
                setCreateParentId(null);
                setCreateModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              New Project
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* 2. Statistical Highlights Banner */}
      <ProjectStatsCards stats={stats} />

      {/* 3. Filtering & Search Toolbar */}
      <Card className="border bg-card/60 shadow-2xs backdrop-blur-xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search projects by name, order ID, or service line..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <Select
                value={selectedStatusId}
                onValueChange={(val: string | null) => {
                  setSelectedStatusId(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-[130px]">
                  <SelectValue placeholder="Status">
                    {selectedStatusId === "all"
                      ? "All Statuses"
                      : lookups?.statuses.find((s) => s.id === selectedStatusId)?.name || "Status"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Statuses
                  </SelectItem>
                  {lookups?.statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: (status as any).colorHex || "#64748b" }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Service Line Filter */}
              <Select
                value={selectedServiceLineId}
                onValueChange={(val: string | null) => {
                  setSelectedServiceLineId(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-[140px]">
                  <SelectValue placeholder="Service Line">
                    {selectedServiceLineId === "all"
                      ? "All Service Lines"
                      : lookups?.serviceLines.find((sl) => sl.id === selectedServiceLineId)?.name ||
                        "Service Line"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Service Lines
                  </SelectItem>
                  {lookups?.serviceLines.map((sl) => (
                    <SelectItem key={sl.id} value={sl.id} className="text-xs">
                      {sl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Team Filter */}
              <Select
                value={selectedTeamId}
                onValueChange={(val: string | null) => {
                  setSelectedTeamId(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-[130px]">
                  <SelectValue placeholder="Team">
                    {selectedTeamId === "all"
                      ? "All Teams"
                      : lookups?.teams.find((t) => t.id === selectedTeamId)?.name || "Team"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Teams
                  </SelectItem>
                  {lookups?.teams.map((team) => (
                    <SelectItem key={team.id} value={team.id} className="text-xs">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Platform Filter */}
              <Select
                value={selectedPlatformId}
                onValueChange={(val: string | null) => {
                  setSelectedPlatformId(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-[130px]">
                  <SelectValue placeholder="Platform">
                    {selectedPlatformId === "all"
                      ? "All Platforms"
                      : lookups?.platforms.find((p) => p.id === selectedPlatformId)?.name ||
                        "Platform"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Platforms
                  </SelectItem>
                  {lookups?.platforms.map((plat) => (
                    <SelectItem key={plat.id} value={plat.id} className="text-xs">
                      {plat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Workstation Filter with Active Shifts Hierarchy */}
              <Select
                value={selectedStationId}
                onValueChange={(val: string | null) => {
                  const target = val || "all";
                  setSelectedStationId(target);
                  if (target !== "all" && activeSessions.some((s) => s.station.id === target)) {
                    switchStation(target);
                  }
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-[150px]">
                  <SelectValue placeholder="Workstation">
                    {selectedStationId === "all"
                      ? "All Stations"
                      : selectedStationMeta
                      ? `${selectedStationMeta.name}`
                      : "Station"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all" className="text-xs">
                    <div className="flex items-center gap-2">
                      <Globe className="size-3.5 text-muted-foreground" />
                      <span>All Workstations</span>
                    </div>
                  </SelectItem>

                  {/* Active Joined Shifts */}
                  {activeSessions.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Active Shifts ({activeSessions.length})
                      </SelectLabel>
                      {activeSessions.map((s) => (
                        <SelectItem key={s.station.id} value={s.station.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-semibold">{s.station.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({s.station.code})
                            </span>
                            {s.station.id === currentStationId && (
                              <Badge variant="secondary" className="text-[8px] py-0 px-1 ml-auto">
                                Focused
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {/* All Workstations */}
                  <SelectGroup>
                    <SelectSeparator />
                    <SelectLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      All Stations
                    </SelectLabel>
                    {stationsList.map((stn) => (
                      <SelectItem key={stn.id} value={stn.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Briefcase className="size-3 text-muted-foreground" />
                          <span>{stn.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({stn.code})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Profile Filter */}
              <Select
                value={selectedProfileId}
                onValueChange={(val: string | null) => {
                  setSelectedProfileId(val || "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-[130px]">
                  <SelectValue placeholder="Profile">
                    {selectedProfileId === "all"
                      ? "All Profiles"
                      : lookups?.profiles?.find((p) => p.id === selectedProfileId)?.username || "Profile"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Profiles
                  </SelectItem>
                  {lookups?.profiles?.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id} className="text-xs">
                      {prof.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Reset Filters */}
              {(selectedStatusId !== "all" ||
                selectedServiceLineId !== "all" ||
                selectedTeamId !== "all" ||
                selectedPlatformId !== "all" ||
                selectedStationId !== "all" ||
                selectedProfileId !== "all" ||
                searchQuery.trim() !== "") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStatusId("all");
                    setSelectedServiceLineId("all");
                    setSelectedTeamId("all");
                    setSelectedPlatformId("all");
                    setSelectedStationId("all");
                    setSelectedProfileId("all");
                    setSearchQuery("");
                    setDebouncedSearch("");
                    setCurrentPage(1);
                  }}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear Filters
                </Button>
              )}

              {/* Layout View Mode Switcher */}
              <div className="flex items-center rounded-lg border border-border/80 p-0.5 ml-auto">
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                  className="size-7.5 rounded-md"
                  title="Table View"
                >
                  <LayoutList className="size-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="size-7.5 rounded-md"
                  title="Grid Cards View"
                >
                  <LayoutGrid className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Projects Content (Table, Grid, or Station Empty State Hub) */}
      {!isLoading && projects.length === 0 && selectedStationMeta ? (
        <Card className="border bg-card/60 p-8 text-center max-w-xl mx-auto shadow-sm space-y-4">
          <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <Radio className="size-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              No Projects on {selectedStationMeta.name} ({selectedStationMeta.code})
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              No projects have been linked to the platform profiles hosted on this workstation yet.
            </p>
          </div>

          {/* Quick Switch to other active shifts */}
          {otherActiveStations.length > 0 && (
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Layers className="size-3 text-emerald-500" /> Switch to Another Active Shift:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {otherActiveStations.map((s) => (
                  <div
                    key={s.station.id}
                    onClick={() => {
                      setSelectedStationId(s.station.id);
                      switchStation(s.station.id);
                    }}
                    className="p-2.5 rounded-lg border bg-background hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold truncate">{s.station.name}</span>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-600 px-1.5">
                      Switch <ArrowRight className="size-2.5 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1"
              onClick={() => setSelectedStationId("all")}
            >
              <Globe className="size-3.5" />
              View All Projects
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1"
              onClick={() => setSelectModalOpen(true)}
            >
              <Radio className="size-3.5 text-primary" />
              Join Other Station
            </Button>
            <PermissionGate code="project.create">
              <Button
                size="sm"
                onClick={() => {
                  setCreateParentId(null);
                  setCreateModalOpen(true);
                }}
                className="text-xs font-semibold gap-1"
              >
                <Plus className="size-3.5" />
                Create New Project
              </Button>
            </PermissionGate>
          </div>
        </Card>
      ) : viewMode === "table" ? (
        <ProjectTable
          projects={projects}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onManageMembers={handleManageMembers}
          onManageComponents={handleManageComponents}
          onDelete={handleDelete}
          onOpenChat={handleOpenChat}
        />
      ) : (
        <ProjectCardGrid
          projects={projects}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onManageMembers={handleManageMembers}
          onManageComponents={handleManageComponents}
          onDelete={handleDelete}
          onOpenChat={handleOpenChat}
        />
      )}

      {/* 6. Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 pb-1 px-1 text-xs text-muted-foreground border-t border-border/40">
          {/* Left: Row Count & Page Size Selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="font-medium">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{totalCount}</span> projects
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="hidden md:inline text-muted-foreground text-[11px]">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val: string | null) => {
                  if (!val) return;
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs font-semibold">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10" className="text-xs font-medium">10</SelectItem>
                  <SelectItem value="25" className="text-xs font-medium">25</SelectItem>
                  <SelectItem value="50" className="text-xs font-medium">50</SelectItem>
                  <SelectItem value="100" className="text-xs font-medium">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right: Page Navigation & Numbered Pills */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="size-8"
              title="First Page"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="size-8"
              title="Previous Page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>

            {/* Numbered Page Buttons */}
            <div className="hidden sm:flex items-center gap-1">
              {(() => {
                const pages: (number | string)[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else if (currentPage <= 4) {
                  pages.push(1, 2, 3, 4, 5, "...", totalPages);
                } else if (currentPage >= totalPages - 3) {
                  pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                } else {
                  pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
                }

                return pages.map((p, idx) => {
                  if (typeof p === "string") {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted-foreground">
                        …
                      </span>
                    );
                  }
                  const isCurrent = p === currentPage;
                  return (
                    <Button
                      key={p}
                      variant={isCurrent ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(p)}
                      className={`size-8 p-0 text-xs font-semibold ${
                        isCurrent ? "pointer-events-none shadow-xs" : "hover:bg-muted"
                      }`}
                    >
                      {p}
                    </Button>
                  );
                });
              })()}
            </div>

            <span className="sm:hidden px-2 font-semibold text-foreground text-xs">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="size-8"
              title="Next Page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="size-8"
              title="Last Page"
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* 7. Modals & Dialogs (Capability Gated) */}
      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        lookups={lookups}
        initialParentId={createParentId}
        onSuccess={() => {
          fetchData();
        }}
        onRefreshLookups={fetchLookups}
      />

      <EditProjectModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        project={selectedProject}
        lookups={lookups}
        onSuccess={() => {
          fetchData();
        }}
      />

      <ManageProjectMembersModal
        open={membersModalOpen}
        onOpenChange={setMembersModalOpen}
        project={selectedProject}
        lookups={lookups}
        onSuccess={() => {
          fetchData();
        }}
      />

      <ManageComponentsModal
        open={componentsModalOpen}
        onOpenChange={setComponentsModalOpen}
        project={selectedProject}
        lookups={lookups}
        onSuccess={() => {
          fetchData();
        }}
      />

      <ProjectDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        project={selectedProject}
        onEdit={handleEdit}
        onManageMembers={handleManageMembers}
        onManageComponents={handleManageComponents}
        onAddSubProject={handleCreateSubProject}
        onDelete={handleDelete}
        onRefresh={fetchData}
      />

      <DeleteProjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        project={selectedProject}
        onSuccess={() => {
          fetchData();
        }}
      />

      <SelectStationModal
        open={selectModalOpen}
        onOpenChange={setSelectModalOpen}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}
