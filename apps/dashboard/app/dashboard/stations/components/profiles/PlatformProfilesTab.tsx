"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Briefcase,
  Plus,
  Search,
  RefreshCw,
  Monitor,
  FolderKanban,
  MoreHorizontal,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Globe,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type {
  PlatformItem,
  StationItem,
  ProfileManagementItem,
} from "@workspace/shared";
import { CreateProfileModal } from "./CreateProfileModal";
import { EditProfileModal } from "./EditProfileModal";
import { ManageProfileStationsModal } from "./ManageProfileStationsModal";
import { DataTablePagination } from "@/components/data-table";
import Link from "next/link";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";

interface PlatformProfilesTabProps {
  stations: StationItem[];
  platforms: PlatformItem[];
  onRefreshStations: () => void;
}

export function PlatformProfilesTab({
  stations,
  platforms,
  onRefreshStations,
}: PlatformProfilesTabProps) {
  const [profiles, setProfiles] = React.useState<ProfileManagementItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [search, setSearch] = React.useState("");
  const [selectedPlatformId, setSelectedPlatformId] = React.useState<string>("all");
  const [selectedStationId, setSelectedStationId] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Modals
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [manageStationsModalOpen, setManageStationsModalOpen] = React.useState(false);
  const [selectedProfile, setSelectedProfile] = React.useState<ProfileManagementItem | null>(null);

  const fetchProfiles = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));

      if (search.trim()) params.set("search", search.trim());
      if (selectedPlatformId !== "all") params.set("platformId", selectedPlatformId);
      if (selectedStationId !== "all") params.set("stationId", selectedStationId);
      if (selectedStatus !== "all") params.set("isActive", selectedStatus);

      const res = await api.get<any>(`/stations/profiles?${params.toString()}`);
      const items = res?.data?.items || res?.items || (Array.isArray(res) ? res : []);
      const pagination = res?.data?.pagination || res?.pagination;

      setProfiles(items);
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
        setTotalCount(pagination.total || 0);
      } else {
        setTotalCount(items.length);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch platform profiles");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, selectedPlatformId, selectedStationId, selectedStatus]);

  React.useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleDeleteProfile = async (profile: ProfileManagementItem) => {
    if (!confirm(`Are you sure you want to deactivate profile "${profile.username}"?`)) {
      return;
    }
    try {
      await api.delete(`/stations/profiles/${profile.id}`);
      toast.info(`Profile "${profile.username}" deactivated.`);
      fetchProfiles();
      onRefreshStations();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate profile");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search profile username or platform..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* Platform Filter */}
          <Select
            value={selectedPlatformId}
            onValueChange={(val: string | null) => {
              if (val) setSelectedPlatformId(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="All Platforms">
                {selectedPlatformId === "all"
                  ? "All Platforms"
                  : platforms.find((p) => p.id === selectedPlatformId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {platforms.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Station Filter */}
          <Select
            value={selectedStationId}
            onValueChange={(val: string | null) => {
              if (val) setSelectedStationId(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="All Workstations">
                {selectedStationId === "all"
                  ? "All Workstations"
                  : stations.find((s) => s.id === selectedStationId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workstations</SelectItem>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={selectedStatus}
            onValueChange={(val: string | null) => {
              if (val) setSelectedStatus(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue placeholder="All Status">
                {selectedStatus === "all"
                  ? "All Status"
                  : selectedStatus === "true"
                  ? "Active Only"
                  : "Inactive"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active Only</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProfiles}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <PermissionGate code="station.assign_profile">
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="h-9 gap-1.5 text-xs shadow-xs"
            >
              <Plus className="size-4" />
              Add Platform Profile
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Profiles Table */}
      {profiles.length === 0 ? (
        <div className="py-16 text-center border rounded-xl bg-card space-y-3">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Briefcase className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">No platform profiles found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add your agency's seller accounts (Upwork, Fiverr, Direct) and assign them across sales workstations.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            Add First Profile
          </Button>
        </div>
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[280px]">Profile Handle</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Assigned Workstations</TableHead>
                <TableHead>Linked Projects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const assigned = p.assignedStations || [];
                const projectCount = p._count?.projects ?? 0;

                return (
                  <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                    {/* Username */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          <Briefcase className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {p.username}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            Created {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Platform */}
                    <TableCell>
                      <Badge variant="secondary" className="text-xs gap-1 py-0.5 px-2">
                        <Globe className="size-3 text-muted-foreground" />
                        {p.platform?.name || "Platform"}
                      </Badge>
                    </TableCell>

                    {/* Assigned Workstations */}
                    <TableCell>
                      {assigned.length === 0 ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
                        >
                          Unassigned
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5 max-w-[320px]">
                          {assigned.map((as) => (
                            <Badge
                              key={as.id}
                              variant="secondary"
                              className="font-mono text-[10px] py-0.5 px-2 bg-muted/80 gap-1"
                            >
                              <Monitor className="size-2.5 text-primary" />
                              {as.station?.code || as.station?.name}
                              {as.isPrimary && (
                                <span className="text-[9px] text-amber-500 font-bold ml-0.5">
                                  ★
                                </span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>

                    {/* Projects Count */}
                    <TableCell>
                      <Link
                        href={`/dashboard/projects?profileId=${p.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                      >
                        <FolderKanban className="size-3.5" />
                        <span>{projectCount} projects</span>
                      </Link>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {p.isActive ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 py-0">
                          <CheckCircle2 className="size-2.5" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px] gap-1 py-0">
                          <XCircle className="size-2.5" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                            />
                          }
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 shadow-lg">
                          <DropdownMenuLabel className="text-xs">
                            Profile Actions
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedProfile(p);
                              setManageStationsModalOpen(true);
                            }}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <Monitor className="size-3.5 text-primary" />
                            Manage Workstations
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedProfile(p);
                              setEditModalOpen(true);
                            }}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <Edit2 className="size-3.5 text-blue-500" />
                            Edit Profile
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => handleDeleteProfile(p)}
                            className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            Deactivate Profile
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        limit={pageSize}
        onPageChange={(page: number) => setCurrentPage(page)}
        onLimitChange={(size: number) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Modals */}
      <CreateProfileModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        platforms={platforms}
        stations={stations}
        onSuccess={() => {
          fetchProfiles();
          onRefreshStations();
        }}
      />

      <EditProfileModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        profile={selectedProfile}
        platforms={platforms}
        stations={stations}
        onSuccess={() => {
          fetchProfiles();
          onRefreshStations();
        }}
      />

      <ManageProfileStationsModal
        open={manageStationsModalOpen}
        onOpenChange={setManageStationsModalOpen}
        profile={selectedProfile}
        stations={stations}
        onSuccess={() => {
          fetchProfiles();
          onRefreshStations();
        }}
      />
    </div>
  );
}
