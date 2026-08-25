"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Monitor,
  Radio,
  Users,
  Briefcase,
  MoreHorizontal,
  Edit2,
  Trash2,
  UserPlus,
  ArrowRightLeft,
  CheckCircle2,
  Building2,
  LogOut,
  FolderKanban,
  Eye,
  Check,
} from "lucide-react";
import type { StationItem } from "@workspace/shared";
import {
  useStationSession,
  formatSessionDuration,
  formatSessionStartTime,
} from "@/lib/station/StationContext";
import { useRouter } from "next/navigation";

interface StationTableProps {
  stations: StationItem[];
  onSelectDetail: (station: StationItem) => void;
  onEdit: (station: StationItem) => void;
  onDelete: (station: StationItem) => void;
  onManageUsers: (station: StationItem) => void;
  onManageProfiles: (station: StationItem) => void;
  onReassignProfile: (station: StationItem) => void;
}

export function StationTable({
  stations,
  onSelectDetail,
  onEdit,
  onDelete,
  onManageUsers,
  onManageProfiles,
  onReassignProfile,
}: StationTableProps) {
  const router = useRouter();
  const {
    isJoined,
    currentStationId,
    activeSessions,
    switchStation,
    selectStation,
    leaveStation,
    isSelecting,
  } = useStationSession();

  if (stations.length === 0) {
    return (
      <div className="py-16 text-center border rounded-xl bg-card">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground mb-3">
          <Monitor className="size-6" />
        </div>
        <h3 className="font-semibold text-sm">No workstations found</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
          No stations match your current search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[280px]">Workstation</TableHead>
            <TableHead>Type & Status</TableHead>
            <TableHead>Organization Scope</TableHead>
            <TableHead>Shift Operators</TableHead>
            <TableHead>Allocated Profiles</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stations.map((stn) => {
            const joined = isJoined(stn.id);
            const isFocused = currentStationId === stn.id;
            const caps = stn._capabilities || {};
            const activeProfiles = stn.activeProfiles || [];
            const assignedUsers = stn.assignedUsers || [];
            const currentSessions = stn.currentSessions || [];
            const isOperational = stn.status?.isOperational ?? true;

            return (
              <TableRow
                key={stn.id}
                className={`group hover:bg-muted/40 cursor-pointer transition-colors ${
                  isFocused
                    ? "bg-primary/[0.03]"
                    : joined
                    ? "bg-emerald-500/[0.02]"
                    : ""
                }`}
                onClick={() => onSelectDetail(stn)}
              >
                {/* 1. Workstation Identity */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                        isFocused
                          ? "bg-primary text-primary-foreground"
                          : joined
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <Monitor className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {stn.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] py-0 px-1.5"
                        >
                          {stn.code}
                        </Badge>
                        {isFocused ? (
                          <Badge className="bg-primary hover:bg-primary text-[10px] py-0 px-1.5 gap-1 font-medium">
                            <CheckCircle2 className="size-2.5" />
                            Focused ({formatSessionDuration(activeSessions.find((s) => s.station.id === stn.id)?.session?.joinedAt)})
                          </Badge>
                        ) : joined ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] py-0 px-1.5 gap-1 font-medium">
                            <CheckCircle2 className="size-2.5" />
                            Active ({formatSessionDuration(activeSessions.find((s) => s.station.id === stn.id)?.session?.joinedAt)})
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {stn.description || "No description provided"}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* 2. Type & Status */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {stn.stationType && (
                        <Badge variant="secondary" className="text-[10px]">
                          {stn.stationType.name}
                        </Badge>
                      )}
                      {stn.stationType?.isSales && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/5"
                        >
                          Sales Desk
                        </Badge>
                      )}
                    </div>
                    {stn.status && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: stn.status.color || (isOperational ? "#10b981" : "#ef4444"),
                          }}
                        />
                        <span className="text-muted-foreground text-xs">
                          {stn.status.name}
                        </span>
                        {stn.isIpRestricted ? (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                            • IP ({stn.ipWhitelist?.length || 0})
                          </span>
                        ) : null}
                        {stn.isMacRestricted ? (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                            • MAC ({stn.macWhitelist?.length || 0})
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* 3. Department & Branch */}
                <TableCell>
                  <div className="space-y-0.5 text-xs">
                    {stn.department ? (
                      <div className="flex items-center gap-1 text-foreground font-medium">
                        <Building2 className="size-3 text-muted-foreground" />
                        <span>{stn.department.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Global Dept</span>
                    )}
                    {stn.branch && (
                      <p className="text-muted-foreground text-[11px]">
                        Branch: {stn.branch.name}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* 4. Active Shift Operators */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Users className="size-3.5 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {currentSessions.length} active
                      </span>
                      <span className="text-muted-foreground">
                        / {assignedUsers.length} assigned (Max {stn.maxConcurrentUsers})
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* 5. Hosted Platform Profiles */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="size-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        {stn.activeProfilesCount ?? activeProfiles.length} Profiles
                      </span>
                    </div>
                    {activeProfiles.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {activeProfiles.slice(0, 2).map((p) => (
                          <Badge
                            key={p.id}
                            variant="secondary"
                            className="text-[10px] font-normal py-0 px-1 truncate max-w-[100px]"
                          >
                            {p.profile?.username}
                          </Badge>
                        ))}
                        {activeProfiles.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{activeProfiles.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* 6. Capability-Gated Actions Menu (Rule FE-1) */}
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {/* Quick Connect / Leave / Focus Button */}
                    {joined ? (
                      <>
                        {!isFocused && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => switchStation(stn.id)}
                          >
                            Focus
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                          onClick={() => leaveStation(stn.id)}
                        >
                          <LogOut className="size-3.5" />
                          <span className="hidden xl:inline">Leave</span>
                        </Button>
                      </>
                    ) : caps.canJoin && isOperational ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-primary/30 hover:border-primary text-primary gap-1"
                        disabled={isSelecting}
                        onClick={() => selectStation(stn.id)}
                      >
                        <Radio className="size-3" />
                        <span className="hidden xl:inline">Join</span>
                      </Button>
                    ) : null}

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 p-1 shadow-lg">
                        <DropdownMenuLabel className="text-xs">
                          Workstation Actions
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => onSelectDetail(stn)}
                          className="text-xs gap-2 cursor-pointer"
                        >
                          <Eye className="size-3.5 text-muted-foreground" />
                          <span>View Station Details</span>
                        </DropdownMenuItem>

                        {/* View projects under this station */}
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/projects?stationId=${stn.id}`)}
                          className="text-xs gap-2 cursor-pointer"
                        >
                          <FolderKanban className="size-3.5 text-muted-foreground" />
                          <span>View Station Projects</span>
                        </DropdownMenuItem>

                        {joined && !isFocused && (
                          <DropdownMenuItem
                            onClick={() => switchStation(stn.id)}
                            className="text-xs gap-2 cursor-pointer font-medium"
                          >
                            <Check className="size-3.5 text-primary" />
                            <span>Set as Active Focus</span>
                          </DropdownMenuItem>
                        )}

                        {caps.canAssignProfile && (
                          <DropdownMenuItem
                            onClick={() => onManageProfiles(stn)}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <Briefcase className="size-3.5 text-primary" />
                            <span>Manage Profiles</span>
                          </DropdownMenuItem>
                        )}

                        {caps.canAssignUser && (
                          <DropdownMenuItem
                            onClick={() => onManageUsers(stn)}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <UserPlus className="size-3.5 text-purple-500" />
                            <span>Manage Operators</span>
                          </DropdownMenuItem>
                        )}

                        {caps.canReassignProfile && activeProfiles.length > 0 && (
                          <DropdownMenuItem
                            onClick={() => onReassignProfile(stn)}
                            className="text-xs gap-2 cursor-pointer"
                          >
                            <ArrowRightLeft className="size-3.5 text-amber-500" />
                            <span>Transfer Profile</span>
                          </DropdownMenuItem>
                        )}

                        {caps.canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onEdit(stn)}
                              className="text-xs gap-2 cursor-pointer"
                            >
                              <Edit2 className="size-3.5 text-blue-500" />
                              <span>Edit Station</span>
                            </DropdownMenuItem>
                          </>
                        )}

                        {joined && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => leaveStation(stn.id)}
                              className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
                            >
                              <LogOut className="size-3.5" />
                              <span>Leave Station</span>
                            </DropdownMenuItem>
                          </>
                        )}

                        {caps.canDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(stn)}
                            className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Delete Station</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
