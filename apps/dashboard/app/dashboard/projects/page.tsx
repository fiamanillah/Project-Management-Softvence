"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
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
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type {
  ProjectItem,
  ProjectLookups,
  ProjectStats,
} from "@workspace/shared";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";
import { ProjectStatsCards } from "./components/ProjectStatsCards";
import { ProjectTable } from "./components/ProjectTable";
import { ProjectCardGrid } from "./components/ProjectCardGrid";
import { ProjectDetailDialog } from "./components/detail/ProjectDetailDialog";
import { CreateProjectModal } from "./components/CreateProjectModal";
import { EditProjectModal } from "./components/EditProjectModal";
import { ManageProjectMembersModal } from "./components/ManageProjectMembersModal";
import { ManageComponentsModal } from "./components/ManageComponentsModal";
import { DeleteProjectDialog } from "./components/DeleteProjectDialog";

export default function ProjectsPage() {
  return (
    <RouteGuard code="project.view">
      <ProjectsContent />
    </RouteGuard>
  );
}

function ProjectsContent() {
  const [projects, setProjects] = React.useState<ProjectItem[]>([]);
  const [lookups, setLookups] = React.useState<ProjectLookups | null>(null);
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

  // Reset to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedStatusId, selectedServiceLineId, selectedTeamId, selectedPlatformId]);

  // Modals & Dialogs
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [createParentId, setCreateParentId] = React.useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [membersModalOpen, setMembersModalOpen] = React.useState(false);
  const [componentsModalOpen, setComponentsModalOpen] = React.useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const [selectedProject, setSelectedProject] = React.useState<ProjectItem | null>(null);

  // Fetch Lookups
  const fetchLookups = React.useCallback(async () => {
    try {
      const res = await api.get("/projects/lookups");
      setLookups(res?.data || res);
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
  ]);

  React.useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleViewDetails = (project: ProjectItem) => {
    setSelectedProject(project);
    setDetailDialogOpen(true);
  };

  const handleOpenCreateRoot = () => {
    setCreateParentId(null);
    setCreateModalOpen(true);
  };

  const handleAddSubProject = (parentProject: ProjectItem) => {
    setCreateParentId(parentProject.id);
    setCreateModalOpen(true);
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

  const handleSuccess = () => {
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Briefcase className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Projects Management
              </h1>
              <p className="text-xs text-muted-foreground">
                Coordinate deliverables, team allocations, milestones, and client accounts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            disabled={isLoading}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <PermissionGate code="project.create">
            <Button
              size="sm"
              onClick={handleOpenCreateRoot}
              className="text-xs h-9 gap-1.5 shadow-xs"
            >
              <Plus className="size-4" /> New Project
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* 2. KPI Metrics Bar */}
      <ProjectStatsCards stats={stats} isLoading={isLoading} />

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
                      : lookups?.statuses.find((st) => st.id === selectedStatusId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                  {lookups?.statuses.map((st) => (
                    <SelectItem key={st.id} value={st.id} className="text-xs">
                      {st.name}
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
                      ? "All Services"
                      : lookups?.serviceLines.find((sl) => sl.id === selectedServiceLineId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Services</SelectItem>
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
                      : lookups?.teams.find((t) => t.id === selectedTeamId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Teams</SelectItem>
                  {lookups?.teams.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 ml-auto sm:ml-0">
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                  className="size-8"
                >
                  <LayoutList className="size-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="size-8"
                >
                  <LayoutGrid className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Projects Content (Table or Grid) */}
      {viewMode === "table" ? (
        <ProjectTable
          projects={projects}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onManageMembers={handleManageMembers}
          onManageComponents={handleManageComponents}
          onDelete={handleDelete}
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
        />
      )}

      {/* 5. Comprehensive Pagination Controls */}
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
            <div className="hidden sm:flex items-center gap-1 mx-1">
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

      {/* Modals & Dialogs */}
      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        lookups={lookups}
        initialParentId={createParentId}
        onSuccess={handleSuccess}
        onRefreshLookups={fetchLookups}
      />

      <EditProjectModal
        project={selectedProject}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        lookups={lookups}
        onSuccess={handleSuccess}
        onRefreshLookups={fetchLookups}
      />

      <ManageProjectMembersModal
        project={selectedProject}
        open={membersModalOpen}
        onOpenChange={setMembersModalOpen}
        lookups={lookups}
        onSuccess={handleSuccess}
      />

      <ManageComponentsModal
        project={selectedProject}
        open={componentsModalOpen}
        onOpenChange={setComponentsModalOpen}
        lookups={lookups}
        onSuccess={handleSuccess}
      />

      <ProjectDetailDialog
        project={selectedProject}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={handleEdit}
        onManageMembers={handleManageMembers}
        onManageComponents={handleManageComponents}
        onAddSubProject={handleAddSubProject}
        onDelete={handleDelete}
        onRefresh={handleSuccess}
      />

      <DeleteProjectDialog
        project={selectedProject}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
