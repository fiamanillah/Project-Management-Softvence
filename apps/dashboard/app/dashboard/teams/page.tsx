"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  UsersRound,
  Plus,
  RefreshCw,
  CheckCircle2,
  Users,
  Building2,
  LayoutList,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { TeamItem, DepartmentItem, TeamStats } from "@workspace/shared";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";
import { DataTableToolbar } from "@/components/data-table";
import { TeamTable } from "./components/TeamTable";
import { TeamCardGrid } from "./components/TeamCardGrid";
import { CreateTeamModal } from "./components/CreateTeamModal";
import { EditTeamModal } from "./components/EditTeamModal";
import { ManageMembersModal } from "./components/ManageMembersModal";
import { TeamDetailSheet } from "./components/TeamDetailSheet";
import { DeleteTeamDialog } from "./components/DeleteTeamDialog";

export default function TeamsPage() {
  return (
    <RouteGuard code="organization.team.view">
      <TeamsContent />
    </RouteGuard>
  );
}

function TeamsContent() {
  const [teams, setTeams] = React.useState<TeamItem[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentItem[]>([]);
  const [stats, setStats] = React.useState<TeamStats>({
    totalTeams: 0,
    activeTeams: 0,
    totalMembers: 0,
    totalDepartmentsRepresented: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string>("all");
  const [selectedShift, setSelectedShift] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Modals & Sheets
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [membersModalOpen, setMembersModalOpen] = React.useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const [selectedTeam, setSelectedTeam] = React.useState<TeamItem | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [teamsRes, deptsRes, statsRes] = await Promise.all([
        api.get("/teams?limit=100"),
        api.get("/organization/departments"),
        api.get("/teams/stats"),
      ]);

      const teamItems = teamsRes?.data || (Array.isArray(teamsRes) ? teamsRes : []);
      setTeams(teamItems);
      setDepartments(deptsRes || []);
      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load teams data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleViewDetails = (team: TeamItem) => {
    setSelectedTeam(team);
    setDetailSheetOpen(true);
  };

  const handleManageMembers = (team: TeamItem) => {
    setSelectedTeam(team);
    setMembersModalOpen(true);
  };

  const handleEdit = (team: TeamItem) => {
    setSelectedTeam(team);
    setEditModalOpen(true);
  };

  const handleDelete = (team: TeamItem) => {
    setSelectedTeam(team);
    setDeleteDialogOpen(true);
  };

  // Client Filter Logic (Multi-criteria search across name, slug, department, lead name, member names)
  const filteredTeams = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return teams.filter((team) => {
      const activeMembers = team.members || [];
      const memberMatch = activeMembers.some(
        (m) =>
          `${m.user.firstName || ""} ${m.user.lastName || ""}`.toLowerCase().includes(q) ||
          m.user.email.toLowerCase().includes(q) ||
          (m.user.employeeId || "").toLowerCase().includes(q),
      );

      const matchesSearch =
        !q ||
        team.name.toLowerCase().includes(q) ||
        team.slug.toLowerCase().includes(q) ||
        team.department.name.toLowerCase().includes(q) ||
        team.department.code.toLowerCase().includes(q) ||
        memberMatch;

      const matchesDept =
        selectedDepartmentId === "all" ? true : team.departmentId === selectedDepartmentId;

      const matchesShift =
        selectedShift === "all" ? true : (team.shift || "none").toLowerCase() === selectedShift.toLowerCase();

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? team.isActive
            : !team.isActive;

      return matchesSearch && matchesDept && matchesShift && matchesStatus;
    });
  }, [teams, searchQuery, selectedDepartmentId, selectedShift, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / pageSize));
  const paginatedTeams = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTeams.slice(startIndex, startIndex + pageSize);
  }, [filteredTeams, currentPage, pageSize]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDepartmentId, selectedShift, statusFilter, pageSize]);

  const activeTeamsCount = stats.activeTeams || teams.filter((t) => t.isActive).length;
  const totalTeamsCount = stats.totalTeams || teams.length;

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UsersRound className="size-6 text-primary" /> Teams
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage operational teams, team leadership, member rosters, and department assignments.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>

          <PermissionGate code="organization.team.create">
            <Button size="sm" onClick={() => setCreateModalOpen(true)} className="font-medium shadow-2xs">
              <Plus className="mr-2 size-4" /> Create Team
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Teams</p>
              <h3 className="text-2xl font-bold mt-1">{totalTeamsCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Across {stats.totalDepartmentsRepresented || departments.length} Departments
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <UsersRound className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Teams</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {activeTeamsCount}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {totalTeamsCount - activeTeamsCount} Inactive / Archived
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Team Members</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                {stats.totalMembers}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Active roster assignments
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Divisions Represented</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                {stats.totalDepartmentsRepresented || departments.length}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Organizational units
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Building2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unified Toolbar */}
      <DataTableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search team name, slug, department, lead, member..."
        onReset={() => {
          setSearchQuery("");
          setSelectedDepartmentId("all");
          setSelectedShift("all");
          setStatusFilter("all");
        }}
        isFiltered={Boolean(
          (searchQuery && searchQuery.trim() !== "") ||
            selectedDepartmentId !== "all" ||
            selectedShift !== "all" ||
            statusFilter !== "all",
        )}
        showViewOptions={false}
        actions={
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={`h-7 text-xs px-2.5 gap-1.5 ${
                viewMode === "table" ? "shadow-2xs font-semibold" : "text-muted-foreground"
              }`}
            >
              <LayoutList className="size-3.5" />
              <span>Table</span>
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={`h-7 text-xs px-2.5 gap-1.5 ${
                viewMode === "grid" ? "shadow-2xs font-semibold" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              <span>Cards</span>
            </Button>
          </div>
        }
      >
        {/* Department Filter */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedDepartmentId}
            onChange={(e) => setSelectedDepartmentId(e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          {/* Shift Filter */}
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Shifts</option>
            <option value="day">Day Shift</option>
            <option value="night">Night Shift</option>
            <option value="roster">Roster Shift</option>
            <option value="flexible">Flexible Shift</option>
          </select>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-8 text-xs"
          >
            All ({teams.length})
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className="h-8 text-xs"
          >
            Active ({activeTeamsCount})
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("inactive")}
            className="h-8 text-xs"
          >
            Inactive ({totalTeamsCount - activeTeamsCount})
          </Button>
        </div>
      </DataTableToolbar>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center border rounded-xl bg-card">
          <RefreshCw className="size-6 animate-spin text-muted-foreground mb-2" />
          <span className="text-xs text-muted-foreground">Loading teams...</span>
        </div>
      ) : viewMode === "table" ? (
        <TeamTable
          teams={paginatedTeams}
          onViewDetails={handleViewDetails}
          onManageMembers={handleManageMembers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <TeamCardGrid
          teams={paginatedTeams}
          onViewDetails={handleViewDetails}
          onManageMembers={handleManageMembers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Teams Pagination Footer */}
      {!isLoading && filteredTeams.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 px-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredTeams.length)} of{" "}
              {filteredTeams.length} teams
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">Rows:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val: string | null) => {
                  if (val) setPageSize(Number(val));
                }}
              >
                <SelectTrigger className="h-7 text-xs w-[68px]">
                  <SelectValue>{pageSize}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6" className="text-xs">6</SelectItem>
                  <SelectItem value="10" className="text-xs">10</SelectItem>
                  <SelectItem value="20" className="text-xs">20</SelectItem>
                  <SelectItem value="50" className="text-xs">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="size-7.5"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7.5"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-xs px-2.5 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-7.5"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7.5"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Team Modal */}
      <CreateTeamModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        departments={departments}
        onSuccess={fetchData}
      />

      {/* Edit Team Modal */}
      <EditTeamModal
        team={selectedTeam}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        departments={departments}
        onSuccess={fetchData}
      />

      {/* Manage Members Modal */}
      <ManageMembersModal
        team={selectedTeam}
        open={membersModalOpen}
        onOpenChange={setMembersModalOpen}
        onSuccess={fetchData}
      />

      {/* Team Detail Sheet */}
      <TeamDetailSheet
        teamId={selectedTeam?.id || null}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onManageMembers={handleManageMembers}
        onEdit={handleEdit}
      />

      {/* Delete Team Dialog */}
      <DeleteTeamDialog
        team={selectedTeam}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
