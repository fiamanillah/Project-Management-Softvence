"use client";

import * as React from "react";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Monitor,
  Radio,
  Plus,
  RefreshCw,
  Search,
  LayoutList,
  LayoutGrid,
  ArrowRightLeft,
  Briefcase,
  Users,
  Settings,
  Activity,
  FolderKanban,
  LogOut,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type {
  StationItem,
  StationStats,
  StationTypeItem,
  StationStatusItem,
  StationRoleItem,
  BranchItem,
  DepartmentItem,
  StationProfileAssignmentItem,
} from "@workspace/shared";
import { useStationSession } from "@/lib/station/StationContext";
import { StationStatsCards } from "./components/StationStatsCards";
import { StationTable } from "./components/StationTable";
import { StationCardGrid } from "./components/StationCardGrid";
import { CreateStationModal } from "./components/CreateStationModal";
import { EditStationModal } from "./components/EditStationModal";
import { StationDetailSheet } from "./components/StationDetailSheet";
import { ManageStationOperatorsModal } from "./components/ManageStationOperatorsModal";
import { ManageStationProfilesModal } from "./components/ManageStationProfilesModal";
import { ReassignProfileModal } from "./components/ReassignProfileModal";
import { DeleteStationDialog } from "./components/DeleteStationDialog";
import { StationLookupsManager } from "./components/StationLookupsManager";
import { DataTablePagination } from "@/components/data-table";
import Link from "next/link";

export default function StationsPage() {
  return (
    <RouteGuard code="station.view">
      <StationsContent />
    </RouteGuard>
  );
}

function StationsContent() {
  const {
    activeContext,
    leaveStation,
    setSelectModalOpen,
    refreshSession,
  } = useStationSession();

  const [stations, setStations] = React.useState<StationItem[]>([]);
  const [stats, setStats] = React.useState<StationStats>({
    totalStations: 0,
    activeStations: 0,
    salesStations: 0,
    activeUsersCount: 0,
    activeProfilesCount: 0,
  });

  // Lookups & Structure
  const [stationTypes, setStationTypes] = React.useState<StationTypeItem[]>([]);
  const [stationStatuses, setStationStatuses] = React.useState<StationStatusItem[]>([]);
  const [stationRoles, setStationRoles] = React.useState<StationRoleItem[]>([]);
  const [branches, setBranches] = React.useState<BranchItem[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentItem[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);

  // Filters & Views
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTypeId, setSelectedTypeId] = React.useState<string>("all");
  const [selectedStatusId, setSelectedStatusId] = React.useState<string>("all");
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("all");
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("all");
  const [salesFilter, setSalesFilter] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Modals & Sheets
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = React.useState(false);
  const [usersModalOpen, setUsersModalOpen] = React.useState(false);
  const [profilesModalOpen, setProfilesModalOpen] = React.useState(false);
  const [reassignModalOpen, setReassignModalOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const [selectedStation, setSelectedStation] = React.useState<StationItem | null>(null);
  const [selectedProfileToTransfer, setSelectedProfileToTransfer] =
    React.useState<StationProfileAssignmentItem | null>(null);

  // Fetch Lookups
  const fetchLookups = React.useCallback(async () => {
    try {
      const [typesRes, statusesRes, rolesRes, branchesRes, deptsRes] =
        await Promise.all([
          api.get("/stations/lookups/types"),
          api.get("/stations/lookups/statuses"),
          api.get("/stations/lookups/roles"),
          api.get("/organization/branches"),
          api.get("/organization/departments"),
        ]);

      setStationTypes(typesRes?.data || typesRes || []);
      setStationStatuses(statusesRes?.data || statusesRes || []);
      setStationRoles(rolesRes?.data || rolesRes || []);
      setBranches(branchesRes?.data || branchesRes || []);
      setDepartments(deptsRes?.data || deptsRes || []);
    } catch (err) {
      console.warn("Failed to fetch lookups:", err);
    }
  }, []);

  // Fetch Stations & Stats
  const fetchStations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));

      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedTypeId !== "all") params.set("stationTypeId", selectedTypeId);
      if (selectedStatusId !== "all") params.set("statusId", selectedStatusId);
      if (selectedDeptId !== "all") params.set("departmentId", selectedDeptId);
      if (selectedBranchId !== "all") params.set("branchId", selectedBranchId);
      if (salesFilter === "sales") params.set("isSales", "true");
      if (salesFilter === "non-sales") params.set("isSales", "false");

      const [stationsRes, statsRes] = await Promise.all([
        api.get(`/stations?${params.toString()}`),
        api.get("/stations/stats"),
      ]);

      const items =
        stationsRes?.data?.items ||
        stationsRes?.items ||
        (Array.isArray(stationsRes) ? stationsRes : []);

      const pagination = stationsRes?.data?.pagination || stationsRes?.pagination;

      setStations(items);
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
        setTotalCount(pagination.total || 0);
      } else {
        setTotalCount(items.length);
      }

      if (statsRes) {
        setStats(statsRes?.data || statsRes);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load workstations");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    searchQuery,
    selectedTypeId,
    selectedStatusId,
    selectedDeptId,
    selectedBranchId,
    salesFilter,
  ]);

  React.useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  React.useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Radio className="size-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Workstations & Profiles
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage sales workstations, track active shift operator sessions, and dynamically reassign platform accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStations();
              refreshSession();
            }}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <PermissionGate code="station.assign_profile">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedStation(null);
                setSelectedProfileToTransfer(null);
                setReassignModalOpen(true);
              }}
              className="h-9 gap-1.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-500/30"
            >
              <ArrowRightLeft className="size-3.5" />
              Transfer Profile
            </Button>
          </PermissionGate>

          <PermissionGate code="station.manage">
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="h-9 gap-1.5 text-xs shadow-sm"
            >
              <Plus className="size-4" />
              Add Workstation
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats Summary */}
      <StationStatsCards stats={stats} isLoading={isLoading} />

      {/* Main Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 w-full sm:w-[480px]">
          <TabsTrigger value="all" className="text-xs gap-1.5">
            <Monitor className="size-3.5" />
            All Stations ({totalCount})
          </TabsTrigger>
          <TabsTrigger value="my-shift" className="text-xs gap-1.5">
            <Radio className="size-3.5 text-emerald-500" />
            My Active Shift
          </TabsTrigger>
          <PermissionGate code="station.manage_lookups">
            <TabsTrigger value="lookups" className="text-xs gap-1.5">
              <Settings className="size-3.5" />
              Lookups & Config
            </TabsTrigger>
          </PermissionGate>
        </TabsList>

        {/* TAB 1: ALL WORKSTATIONS */}
        <TabsContent value="all" className="pt-4 space-y-4">
          {/* Filters Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card shadow-sm">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search code or station name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={selectedStatusId}
                onValueChange={(val: string | null) => {
                  if (val) setSelectedStatusId(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {stationStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select
                value={selectedTypeId}
                onValueChange={(val: string | null) => {
                  if (val) setSelectedTypeId(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {stationTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Department Filter */}
              <Select
                value={selectedDeptId}
                onValueChange={(val: string | null) => {
                  if (val) setSelectedDeptId(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sales Flag Filter */}
              <Select
                value={salesFilter}
                onValueChange={(val: string | null) => {
                  if (val) setSalesFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Desk Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Desks</SelectItem>
                  <SelectItem value="sales">Sales Desks Only</SelectItem>
                  <SelectItem value="non-sales">Non-Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 self-end lg:self-center border rounded-lg p-0.5 bg-muted/30">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="size-7"
                onClick={() => setViewMode("table")}
              >
                <LayoutList className="size-3.5" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="size-7"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Table / Grid Content */}
          {viewMode === "table" ? (
            <StationTable
              stations={stations}
              onSelectDetail={(stn) => {
                setSelectedStation(stn);
                setDetailSheetOpen(true);
              }}
              onEdit={(stn) => {
                setSelectedStation(stn);
                setEditModalOpen(true);
              }}
              onDelete={(stn) => {
                setSelectedStation(stn);
                setDeleteDialogOpen(true);
              }}
              onManageUsers={(stn) => {
                setSelectedStation(stn);
                setUsersModalOpen(true);
              }}
              onManageProfiles={(stn) => {
                setSelectedStation(stn);
                setProfilesModalOpen(true);
              }}
              onReassignProfile={(stn) => {
                setSelectedStation(stn);
                setSelectedProfileToTransfer(null);
                setReassignModalOpen(true);
              }}
            />
          ) : (
            <StationCardGrid
              stations={stations}
              onSelectDetail={(stn) => {
                setSelectedStation(stn);
                setDetailSheetOpen(true);
              }}
              onEdit={(stn) => {
                setSelectedStation(stn);
                setEditModalOpen(true);
              }}
              onDelete={(stn) => {
                setSelectedStation(stn);
                setDeleteDialogOpen(true);
              }}
              onManageUsers={(stn) => {
                setSelectedStation(stn);
                setUsersModalOpen(true);
              }}
              onManageProfiles={(stn) => {
                setSelectedStation(stn);
                setProfilesModalOpen(true);
              }}
              onReassignProfile={(stn) => {
                setSelectedStation(stn);
                setSelectedProfileToTransfer(null);
                setReassignModalOpen(true);
              }}
            />
          )}

          {/* Pagination */}
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            limit={pageSize}
            onPageChange={(p: number) => setCurrentPage(p)}
            onLimitChange={(s: number) => {
              setPageSize(s);
              setCurrentPage(1);
            }}
          />
        </TabsContent>

        {/* TAB 2: MY ACTIVE SHIFT CONSOLE */}
        <TabsContent value="my-shift" className="pt-4 space-y-4">
          {activeContext?.station ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Station Hero Card */}
              <Card className="lg:col-span-2 border shadow-sm">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                        <Radio className="size-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold">
                            {activeContext.station.name}
                          </h2>
                          <Badge className="bg-emerald-500 text-xs py-0">
                            Active Shift
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Station Code: <strong>{activeContext.station.code}</strong> • Logged in as Operator
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5"
                      onClick={() => leaveStation()}
                    >
                      <LogOut className="size-3.5" />
                      End Shift
                    </Button>
                  </div>

                  {/* Connected Profiles on this Station */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Accessible Platform Profiles ({activeContext.activeProfiles.length})
                      </span>
                      <Link
                        href="/dashboard/projects"
                        className="text-primary hover:underline text-xs"
                      >
                        View Scoped Projects
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeContext.activeProfiles.map((ap) => (
                        <div
                          key={ap.id}
                          className="p-3.5 rounded-xl border bg-muted/20 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              <Briefcase className="size-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-foreground">
                                  {ap.profile?.username}
                                </span>
                                {ap.isPrimary && (
                                  <Badge className="bg-amber-500 text-[9px] py-0">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground block mt-0.5">
                                {ap.profile?.platform?.name || "Platform"}
                              </span>
                            </div>
                          </div>

                          <Link
                            href={`/dashboard/projects?profileId=${ap.profileId}`}
                            className="text-xs px-2.5 py-1 rounded-md border bg-background hover:bg-muted font-medium"
                          >
                            Projects
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shift Information Card */}
              <Card className="border shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Clock className="size-4 text-primary" />
                    Shift Metadata
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                      <span className="text-muted-foreground">Joined At</span>
                      <p className="font-semibold text-foreground">
                        {new Date(activeContext.session.joinedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                      <span className="text-muted-foreground">Active IP Address</span>
                      <p className="font-mono text-foreground">
                        {activeContext.session.ipAddress || "Internal / Local"}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                      <span className="text-muted-foreground">Department Unit</span>
                      <p className="font-semibold text-foreground">
                        {activeContext.station.department?.name || "Global"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="w-full text-xs gap-1.5"
                      onClick={() => setSelectModalOpen(true)}
                    >
                      <ArrowRightLeft className="size-3.5" />
                      Switch Workstation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="py-16 text-center border rounded-xl bg-card space-y-4">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Radio className="size-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="font-bold text-sm">No Active Shift Workstation</h3>
                <p className="text-xs text-muted-foreground">
                  You are not currently connected to any workstation. Select a station to sync platform profiles and project feeds.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setSelectModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Radio className="size-3.5" />
                Select Workstation
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: DYNAMIC LOOKUPS */}
        <PermissionGate code="station.manage_lookups">
          <TabsContent value="lookups" className="pt-4">
            <StationLookupsManager
              stationTypes={stationTypes}
              stationStatuses={stationStatuses}
              stationRoles={stationRoles}
              onRefreshLookups={fetchLookups}
            />
          </TabsContent>
        </PermissionGate>
      </Tabs>

      {/* MODALS & SHEETS */}
      <CreateStationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        stationTypes={stationTypes}
        stationStatuses={stationStatuses}
        branches={branches}
        departments={departments}
        onSuccess={() => {
          fetchStations();
          fetchLookups();
        }}
      />

      <EditStationModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        station={selectedStation}
        stationTypes={stationTypes}
        stationStatuses={stationStatuses}
        branches={branches}
        departments={departments}
        onSuccess={() => {
          fetchStations();
          refreshSession();
        }}
      />

      <StationDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        station={selectedStation}
        onEdit={(stn) => {
          setDetailSheetOpen(false);
          setSelectedStation(stn);
          setEditModalOpen(true);
        }}
        onManageUsers={(stn) => {
          setDetailSheetOpen(false);
          setSelectedStation(stn);
          setUsersModalOpen(true);
        }}
        onManageProfiles={(stn) => {
          setDetailSheetOpen(false);
          setSelectedStation(stn);
          setProfilesModalOpen(true);
        }}
      />

      <ManageStationOperatorsModal
        open={usersModalOpen}
        onOpenChange={setUsersModalOpen}
        station={selectedStation}
        stationRoles={stationRoles}
        onSuccess={() => {
          fetchStations();
          refreshSession();
        }}
      />

      <ManageStationProfilesModal
        open={profilesModalOpen}
        onOpenChange={setProfilesModalOpen}
        station={selectedStation}
        onTriggerReassign={(profile) => {
          setSelectedProfileToTransfer(profile);
          setReassignModalOpen(true);
        }}
        onSuccess={() => {
          fetchStations();
          refreshSession();
        }}
      />

      <ReassignProfileModal
        open={reassignModalOpen}
        onOpenChange={setReassignModalOpen}
        stations={stations}
        defaultStation={selectedStation}
        defaultProfile={selectedProfileToTransfer}
        onSuccess={() => {
          fetchStations();
          refreshSession();
        }}
      />

      <DeleteStationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        station={selectedStation}
        onSuccess={() => {
          fetchStations();
          refreshSession();
        }}
      />
    </div>
  );
}
