"use client"

import * as React from "react"
import { RouteGuard } from "@/components/permission-gate/RouteGuard"
import { PermissionGate } from "@/components/permission-gate/PermissionGate"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
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
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import type {
  StationItem,
  StationStats,
  StationTypeItem,
  StationStatusItem,
  StationRoleItem,
  BranchItem,
  DepartmentItem,
  StationProfileAssignmentItem,
  PlatformItem,
} from "@workspace/shared"
import { useStationSession } from "@/lib/station/StationContext"
import { useSocket } from "@/lib/socket/SocketProvider"
import { StationStatsCards } from "./components/StationStatsCards"
import { StationTable } from "./components/StationTable"
import { StationCardGrid } from "./components/StationCardGrid"
import { CreateStationModal } from "./components/CreateStationModal"
import { EditStationModal } from "./components/EditStationModal"
import { StationDetailModal } from "./components/StationDetailModal"
import { ManageStationOperatorsModal } from "./components/ManageStationOperatorsModal"
import { ManageStationProfilesModal } from "./components/ManageStationProfilesModal"
import { ReassignProfileModal } from "./components/ReassignProfileModal"
import { DeleteStationDialog } from "./components/DeleteStationDialog"
import { StationLookupsManager } from "./components/StationLookupsManager"
import { PlatformProfilesTab } from "./components/profiles/PlatformProfilesTab"
import { DataTablePagination } from "@/components/data-table"
import Link from "next/link"

export default function StationsPage() {
  return (
    <RouteGuard code="station.view">
      <StationsContent />
    </RouteGuard>
  )
}

function StationsContent() {
  const { socket, isConnected } = useSocket()
  const {
    activeSessions,
    currentStationId,
    activeContext,
    switchStation,
    leaveStation,
    leaveAllStations,
    setSelectModalOpen,
    refreshSession,
  } = useStationSession()

  const [stations, setStations] = React.useState<StationItem[]>([])
  const [stats, setStats] = React.useState<StationStats>({
    totalStations: 0,
    activeStations: 0,
    salesStations: 0,
    activeUsersCount: 0,
    activeProfilesCount: 0,
  })

  // Lookups & Structure
  const [stationTypes, setStationTypes] = React.useState<StationTypeItem[]>([])
  const [stationStatuses, setStationStatuses] = React.useState<
    StationStatusItem[]
  >([])
  const [stationRoles, setStationRoles] = React.useState<StationRoleItem[]>([])
  const [branches, setBranches] = React.useState<BranchItem[]>([])
  const [departments, setDepartments] = React.useState<DepartmentItem[]>([])
  const [platforms, setPlatforms] = React.useState<PlatformItem[]>([])

  const [isLoading, setIsLoading] = React.useState(true)

  // Filters & Views
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedTypeId, setSelectedTypeId] = React.useState<string>("all")
  const [selectedStatusId, setSelectedStatusId] = React.useState<string>("all")
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("all")
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("all")
  const [salesFilter, setSalesFilter] = React.useState<string>("all")
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table")

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(15)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalCount, setTotalCount] = React.useState(0)

  // Modals & Sheets
  const [createModalOpen, setCreateModalOpen] = React.useState(false)
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [detailSheetOpen, setDetailSheetOpen] = React.useState(false)
  const [usersModalOpen, setUsersModalOpen] = React.useState(false)
  const [profilesModalOpen, setProfilesModalOpen] = React.useState(false)
  const [reassignModalOpen, setReassignModalOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const [selectedStation, setSelectedStation] =
    React.useState<StationItem | null>(null)
  const [selectedProfileToTransfer, setSelectedProfileToTransfer] =
    React.useState<StationProfileAssignmentItem | null>(null)

  // Fetch Lookups
  const fetchLookups = React.useCallback(async () => {
    try {
      const [
        typesRes,
        statusesRes,
        rolesRes,
        branchesRes,
        deptsRes,
        projectLookupsRes,
      ] = await Promise.all([
        api.get("/stations/lookups/types"),
        api.get("/stations/lookups/statuses"),
        api.get("/stations/lookups/roles"),
        api.get("/organization/branches"),
        api.get("/organization/departments"),
        api.get("/projects/lookups"),
      ])

      setStationTypes(typesRes?.data || typesRes || [])
      setStationStatuses(statusesRes?.data || statusesRes || [])
      setStationRoles(rolesRes?.data || rolesRes || [])
      setBranches(branchesRes?.data || branchesRes || [])
      setDepartments(deptsRes?.data || deptsRes || [])
      setPlatforms(
        projectLookupsRes?.platforms || projectLookupsRes?.data?.platforms || []
      )
    } catch (err) {
      console.warn("Failed to fetch lookups:", err)
    }
  }, [])

  // Fetch Stations & Stats
  const fetchStations = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(currentPage))
      params.set("limit", String(pageSize))

      if (searchQuery.trim()) params.set("search", searchQuery.trim())
      if (selectedTypeId !== "all") params.set("stationTypeId", selectedTypeId)
      if (selectedStatusId !== "all") params.set("statusId", selectedStatusId)
      if (selectedDeptId !== "all") params.set("departmentId", selectedDeptId)
      if (selectedBranchId !== "all") params.set("branchId", selectedBranchId)
      if (salesFilter === "sales") params.set("isSales", "true")
      if (salesFilter === "non-sales") params.set("isSales", "false")

      const [stationsRes, statsRes] = await Promise.all([
        api.get(`/stations?${params.toString()}`),
        api.get("/stations/stats"),
      ])

      const items =
        stationsRes?.data?.items ||
        stationsRes?.items ||
        (Array.isArray(stationsRes) ? stationsRes : [])

      const pagination =
        stationsRes?.data?.pagination || stationsRes?.pagination

      setStations(items)
      if (pagination) {
        setTotalPages(pagination.totalPages || 1)
        setTotalCount(pagination.total || 0)
      } else {
        setTotalCount(items.length)
      }

      if (statsRes) {
        setStats(statsRes?.data || statsRes)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load workstations")
    } finally {
      setIsLoading(false)
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
  ])

  React.useEffect(() => {
    fetchLookups()
  }, [fetchLookups])

  React.useEffect(() => {
    fetchStations()
  }, [fetchStations])

  // Real-time synchronization for stations overview and live occupancy updates with debounce
  React.useEffect(() => {
    if (!socket || !isConnected) return

    socket.emit("room:join", { room: "stations:overview" })

    let debounceTimer: NodeJS.Timeout | null = null
    const debouncedFetchStations = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchStations()
      }, 500)
    }

    const handleStationUpdated = (data: {
      stationId: string
      station: StationItem
    }) => {
      if (!data?.station) return
      setStations((prev) =>
        prev.map((s) =>
          s.id === data.stationId ? { ...s, ...data.station } : s
        )
      )
      debouncedFetchStations()
    }

    const handleOccupancyUpdated = () => {
      debouncedFetchStations()
    }

    socket.on("station:updated", handleStationUpdated as any)
    socket.on("station:occupancy_updated", handleOccupancyUpdated as any)
    socket.on("station:profiles_updated", debouncedFetchStations as any)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      socket.off("station:updated", handleStationUpdated as any)
      socket.off("station:occupancy_updated", handleOccupancyUpdated as any)
      socket.off("station:profiles_updated", debouncedFetchStations as any)
    }
  }, [socket, isConnected, fetchStations])

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Radio className="size-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Workstations & Profiles
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage sales workstations, track active shift operator sessions, and
            dynamically reassign platform accounts.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStations()
              refreshSession()
            }}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw
              className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <PermissionGate code="station.assign_profile">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedStation(null)
                setSelectedProfileToTransfer(null)
                setReassignModalOpen(true)
              }}
              className="h-9 gap-1.5 border-amber-500/30 text-xs text-amber-600 hover:bg-amber-50 hover:text-amber-700"
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
        <TabsList className="grid w-full grid-cols-2 sm:w-[620px] sm:grid-cols-4">
          <TabsTrigger value="all" className="gap-1.5 text-xs">
            <Monitor className="size-3.5" />
            All Stations ({totalCount})
          </TabsTrigger>
          <TabsTrigger value="profiles" className="gap-1.5 text-xs">
            <Briefcase className="size-3.5 text-blue-500" />
            Platform Profiles
          </TabsTrigger>
          <TabsTrigger value="my-shift" className="gap-1.5 text-xs">
            <Radio className="size-3.5 text-emerald-500" />
            My Active Shift
          </TabsTrigger>
          <PermissionGate code="station.manage_lookups">
            <TabsTrigger value="lookups" className="gap-1.5 text-xs">
              <Settings className="size-3.5" />
              Lookups & Config
            </TabsTrigger>
          </PermissionGate>
        </TabsList>

        {/* TAB 1: ALL WORKSTATIONS */}
        <TabsContent value="all" className="space-y-4 pt-4">
          {/* Filters Toolbar */}
          <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border bg-card p-3.5 shadow-sm lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search code or station name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-9 pl-8 text-xs"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={selectedStatusId}
                onValueChange={(val: string | null) => {
                  if (val) setSelectedStatusId(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <SelectValue placeholder="All Statuses">
                    {selectedStatusId === "all"
                      ? "All Statuses"
                      : stationStatuses.find((s) => s.id === selectedStatusId)
                          ?.name}
                  </SelectValue>
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
                  if (val) setSelectedTypeId(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <SelectValue placeholder="All Types">
                    {selectedTypeId === "all"
                      ? "All Types"
                      : stationTypes.find((t) => t.id === selectedTypeId)?.name}
                  </SelectValue>
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
                  if (val) setSelectedDeptId(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="All Departments">
                    {selectedDeptId === "all"
                      ? "All Departments"
                      : departments.find((d) => d.id === selectedDeptId)?.name}
                  </SelectValue>
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
                  if (val) setSalesFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-[130px] text-xs">
                  <SelectValue placeholder="Desk Mode">
                    {salesFilter === "all"
                      ? "All Desks"
                      : salesFilter === "sales"
                        ? "Sales Desks Only"
                        : "Non-Sales"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Desks</SelectItem>
                  <SelectItem value="sales">Sales Desks Only</SelectItem>
                  <SelectItem value="non-sales">Non-Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 self-end rounded-lg border bg-muted/30 p-0.5 lg:self-center">
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
                setSelectedStation(stn)
                setDetailSheetOpen(true)
              }}
              onEdit={(stn) => {
                setSelectedStation(stn)
                setEditModalOpen(true)
              }}
              onDelete={(stn) => {
                setSelectedStation(stn)
                setDeleteDialogOpen(true)
              }}
              onManageUsers={(stn) => {
                setSelectedStation(stn)
                setUsersModalOpen(true)
              }}
              onManageProfiles={(stn) => {
                setSelectedStation(stn)
                setProfilesModalOpen(true)
              }}
              onReassignProfile={(stn) => {
                setSelectedStation(stn)
                setSelectedProfileToTransfer(null)
                setReassignModalOpen(true)
              }}
            />
          ) : (
            <StationCardGrid
              stations={stations}
              onSelectDetail={(stn) => {
                setSelectedStation(stn)
                setDetailSheetOpen(true)
              }}
              onEdit={(stn) => {
                setSelectedStation(stn)
                setEditModalOpen(true)
              }}
              onDelete={(stn) => {
                setSelectedStation(stn)
                setDeleteDialogOpen(true)
              }}
              onManageUsers={(stn) => {
                setSelectedStation(stn)
                setUsersModalOpen(true)
              }}
              onManageProfiles={(stn) => {
                setSelectedStation(stn)
                setProfilesModalOpen(true)
              }}
              onReassignProfile={(stn) => {
                setSelectedStation(stn)
                setSelectedProfileToTransfer(null)
                setReassignModalOpen(true)
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
              setPageSize(s)
              setCurrentPage(1)
            }}
          />
        </TabsContent>

        {/* TAB: PLATFORM PROFILES */}
        <TabsContent value="profiles" className="pt-4">
          <PlatformProfilesTab
            stations={stations}
            platforms={platforms}
            onRefreshStations={() => {
              fetchStations()
              refreshSession()
            }}
          />
        </TabsContent>

        {/* TAB 2: MY ACTIVE SHIFT CONSOLE */}
        <TabsContent value="my-shift" className="space-y-4 pt-4">
          {activeSessions.length > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Joined Workstations ({activeSessions.length}):
                </span>
                {activeSessions.map((s) => {
                  const isFocused = s.station.id === currentStationId
                  return (
                    <Badge
                      key={s.station.id}
                      variant={isFocused ? "default" : "outline"}
                      className={`cursor-pointer px-2.5 py-1 text-xs transition-all ${
                        isFocused
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-muted/60"
                      }`}
                      onClick={() => switchStation(s.station.id)}
                    >
                      {s.station.name} ({s.station.code})
                    </Badge>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => leaveAllStations()}
              >
                Disconnect All ({activeSessions.length})
              </Button>
            </div>
          )}

          {activeContext?.station ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Station Hero Card */}
              <Card className="border shadow-sm lg:col-span-2">
                <CardContent className="space-y-6 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 font-bold text-emerald-600">
                        <Radio className="size-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold">
                            {activeContext.station.name}
                          </h2>
                          <Badge className="bg-emerald-500 py-0 text-xs">
                            Active Shift
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Station Code:{" "}
                          <strong>{activeContext.station.code}</strong> • Logged
                          in as Operator
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => leaveStation(activeContext.station.id)}
                    >
                      <LogOut className="size-3.5" />
                      End Shift
                    </Button>
                  </div>

                  {/* Connected Profiles on this Station */}
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Accessible Platform Profiles (
                        {activeContext.activeProfiles.length})
                      </span>
                      <Link
                        href="/dashboard/projects"
                        className="text-xs text-primary hover:underline"
                      >
                        View Scoped Projects
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {activeContext.activeProfiles.map((ap) => (
                        <div
                          key={ap.id}
                          className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3.5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                              <Briefcase className="size-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-foreground">
                                  {ap.profile?.username}
                                </span>
                                {ap.isPrimary && (
                                  <Badge className="bg-amber-500 py-0 text-[9px]">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                {ap.profile?.platform?.name || "Platform"}
                              </span>
                            </div>
                          </div>

                          <Link
                            href={`/dashboard/projects?profileId=${ap.profileId}`}
                            className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
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
                <CardContent className="space-y-4 p-6">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Clock className="size-4 text-primary" />
                    Shift Metadata
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                      <span className="text-muted-foreground">Joined At</span>
                      <p className="font-semibold text-foreground">
                        {new Date(
                          activeContext.session.joinedAt
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                      <span className="text-muted-foreground">
                        Active IP Address
                      </span>
                      <p className="font-mono text-foreground">
                        {activeContext.session.ipAddress || "Internal / Local"}
                      </p>
                    </div>

                    <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                      <span className="text-muted-foreground">
                        Department Unit
                      </span>
                      <p className="font-semibold text-foreground">
                        {activeContext.station.department?.name || "Global"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="w-full gap-1.5 text-xs"
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
            <div className="space-y-4 rounded-xl border bg-card py-16 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Radio className="size-6" />
              </div>
              <div className="mx-auto max-w-sm space-y-1">
                <h3 className="text-sm font-bold">
                  No Active Shift Workstation
                </h3>
                <p className="text-xs text-muted-foreground">
                  You are not currently connected to any workstation. Select a
                  station to sync platform profiles and project feeds.
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
          fetchStations()
          fetchLookups()
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
          fetchStations()
          refreshSession()
        }}
      />

      <StationDetailModal
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        station={selectedStation}
        onEdit={(stn) => {
          setDetailSheetOpen(false)
          setSelectedStation(stn)
          setEditModalOpen(true)
        }}
        onManageUsers={(stn) => {
          setDetailSheetOpen(false)
          setSelectedStation(stn)
          setUsersModalOpen(true)
        }}
        onManageProfiles={(stn) => {
          setDetailSheetOpen(false)
          setSelectedStation(stn)
          setProfilesModalOpen(true)
        }}
      />

      <ManageStationOperatorsModal
        open={usersModalOpen}
        onOpenChange={setUsersModalOpen}
        station={selectedStation}
        stationRoles={stationRoles}
        onSuccess={() => {
          fetchStations()
          refreshSession()
        }}
      />

      <ManageStationProfilesModal
        open={profilesModalOpen}
        onOpenChange={setProfilesModalOpen}
        station={selectedStation}
        onTriggerReassign={(profile) => {
          setSelectedProfileToTransfer(profile)
          setReassignModalOpen(true)
        }}
        onSuccess={() => {
          fetchStations()
          refreshSession()
        }}
      />

      <ReassignProfileModal
        open={reassignModalOpen}
        onOpenChange={setReassignModalOpen}
        stations={stations}
        defaultStation={selectedStation}
        defaultProfile={selectedProfileToTransfer}
        onSuccess={() => {
          fetchStations()
          refreshSession()
        }}
      />

      <DeleteStationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        station={selectedStation}
        onSuccess={() => {
          fetchStations()
          refreshSession()
        }}
      />
    </div>
  )
}
