"use client";

import * as React from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
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
  Check,
} from "lucide-react";
import type { StationItem } from "@workspace/shared";
import {
  useStationSession,
  formatSessionDuration,
  formatSessionStartTime,
} from "@/lib/station/StationContext";
import { useRouter } from "next/navigation";

interface StationCardGridProps {
  stations: StationItem[];
  onSelectDetail: (station: StationItem) => void;
  onEdit: (station: StationItem) => void;
  onDelete: (station: StationItem) => void;
  onManageUsers: (station: StationItem) => void;
  onManageProfiles: (station: StationItem) => void;
  onReassignProfile: (station: StationItem) => void;
}

export function StationCardGrid({
  stations,
  onSelectDetail,
  onEdit,
  onDelete,
  onManageUsers,
  onManageProfiles,
  onReassignProfile,
}: StationCardGridProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {stations.map((stn) => {
        const joined = isJoined(stn.id);
        const isFocused = currentStationId === stn.id;
        const caps = stn._capabilities || {};
        const activeProfiles = stn.activeProfiles || [];
        const assignedUsers = stn.assignedUsers || [];
        const currentSessions = stn.currentSessions || [];
        const isOperational = stn.status?.isOperational ?? true;

        const maxCap = Math.max(1, stn.maxConcurrentUsers);
        const occupancyPct = Math.min(
          100,
          Math.round((currentSessions.length / maxCap) * 100)
        );

        return (
          <Card
            key={stn.id}
            className={`group relative overflow-hidden transition-all border hover:shadow-md cursor-pointer ${
              isFocused
                ? "border-primary/60 bg-primary/[0.03]"
                : joined
                ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                : "hover:border-border/80"
            }`}
            onClick={() => onSelectDetail(stn)}
          >
            <CardContent className="p-5 space-y-4">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isFocused
                        ? "bg-primary text-primary-foreground font-bold"
                        : joined
                        ? "bg-emerald-500 text-white font-bold"
                        : "bg-muted text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Monitor className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                        {stn.name}
                      </h4>
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
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="font-mono text-[10px] py-0">
                        {stn.code}
                      </Badge>
                      {stn.stationType?.isSales && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/5 py-0"
                        >
                          Sales
                        </Badge>
                      )}
                      {stn.isIpRestricted && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/5 py-0 font-mono"
                        >
                          IP
                        </Badge>
                      )}
                      {stn.isMacRestricted && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-purple-600 border-purple-500/30 bg-purple-500/5 py-0 font-mono"
                        >
                          MAC
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Indicator & Dropdown */}
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {stn.status && (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0"
                      style={{
                        borderColor: stn.status.color || undefined,
                        color: stn.status.color || undefined,
                      }}
                    >
                      {stn.status.name}
                    </Badge>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 p-1 shadow-lg">
                      <DropdownMenuLabel className="text-xs">
                        Workstation Actions
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => onSelectDetail(stn)}
                        className="text-xs gap-2 cursor-pointer"
                      >
                        <Monitor className="size-3.5 text-muted-foreground" />
                        <span>View Details</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => router.push(`/dashboard/projects?stationId=${stn.id}`)}
                        className="text-xs gap-2 cursor-pointer"
                      >
                        <FolderKanban className="size-3.5 text-muted-foreground" />
                        <span>View Projects</span>
                      </DropdownMenuItem>

                      {joined && !isFocused && (
                        <DropdownMenuItem
                          onClick={() => switchStation(stn.id)}
                          className="text-xs gap-2 cursor-pointer font-medium"
                        >
                          <Check className="size-3.5 text-primary" />
                          <span>Switch Focus to Station</span>
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
              </div>

              {/* Occupancy Progress */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="size-3" /> Shift Occupancy:
                  </span>
                  <span className="font-semibold text-foreground">
                    {currentSessions.length} / {stn.maxConcurrentUsers}
                  </span>
                </div>
                <Progress value={occupancyPct} className="h-1.5" />
              </div>

              {/* Profiles Chips */}
              <div className="space-y-1.5 pt-1 border-t border-dashed">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Briefcase className="size-3" /> Hosted Profiles:
                  </span>
                  <span className="font-semibold text-foreground">
                    {activeProfiles.length}
                  </span>
                </div>
                {activeProfiles.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {activeProfiles.slice(0, 3).map((p) => (
                      <Badge
                        key={p.id}
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5"
                      >
                        {p.profile?.username}
                      </Badge>
                    ))}
                    {activeProfiles.length > 3 && (
                      <span className="text-[10px] text-muted-foreground self-center">
                        +{activeProfiles.length - 3} more
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">
                    No platform profiles allocated
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div
                className="pt-2 flex items-center justify-between gap-2 border-t"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <Building2 className="size-3 shrink-0" />
                  <span className="truncate">
                    {stn.department?.name || "Global Dept"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {joined ? (
                    <>
                      {!isFocused && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 px-2"
                          onClick={() => switchStation(stn.id)}
                        >
                          Focus
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 px-2"
                        onClick={() => leaveStation(stn.id)}
                      >
                        <LogOut className="size-3" />
                        Leave
                      </Button>
                    </>
                  ) : caps.canJoin && isOperational ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs gap-1 px-2.5"
                      disabled={isSelecting}
                      onClick={() => selectStation(stn.id)}
                    >
                      <Radio className="size-3" />
                      Join Shift
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
