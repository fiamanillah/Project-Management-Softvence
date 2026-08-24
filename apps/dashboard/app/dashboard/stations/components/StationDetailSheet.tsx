"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@workspace/ui/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Progress } from "@workspace/ui/components/progress";
import {
  Monitor,
  Radio,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  FolderKanban,
  Edit2,
  Activity,
} from "lucide-react";
import type {
  StationItem,
  StationProfileAssignmentItem,
  StationUserAssignmentItem,
  StationSessionItem,
} from "@workspace/shared";
import { useStationSession } from "@/lib/station/StationContext";
import { useRouter } from "next/navigation";

interface StationDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: StationItem | null;
  onEdit?: (station: StationItem) => void;
  onManageUsers?: (station: StationItem) => void;
  onManageProfiles?: (station: StationItem) => void;
}

export function StationDetailSheet({
  open,
  onOpenChange,
  station,
  onEdit,
  onManageUsers,
  onManageProfiles,
}: StationDetailSheetProps) {
  const router = useRouter();
  const { activeContext, selectStation, leaveStation, isSelecting } =
    useStationSession();

  if (!station) return null;

  const isCurrentSession = activeContext?.station?.id === station.id;
  const activeProfiles: StationProfileAssignmentItem[] = station.activeProfiles || [];
  const assignedUsers: StationUserAssignmentItem[] = station.assignedUsers || [];
  const currentSessions: StationSessionItem[] = station.currentSessions || [];
  const isOperational = station.status?.isOperational ?? true;

  const maxCap = Math.max(1, station.maxConcurrentUsers);
  const occupancyPct = Math.min(
    100,
    Math.round((currentSessions.length / maxCap) * 100)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col gap-0 shadow-2xl">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`size-11 rounded-xl flex items-center justify-center font-bold ${
                  isCurrentSession
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <Monitor className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-lg font-bold">{station.name}</SheetTitle>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-mono text-xs py-0">
                    {station.code}
                  </Badge>
                  {station.stationType && (
                    <Badge variant="secondary" className="text-xs py-0">
                      {station.stationType.name}
                    </Badge>
                  )}
                  {station.stationType?.isSales && (
                    <Badge
                      variant="outline"
                      className="text-xs text-amber-600 bg-amber-500/10 border-amber-500/30 py-0"
                    >
                      Sales Desk
                    </Badge>
                  )}
                  {isCurrentSession && (
                    <Badge className="bg-emerald-500 text-xs py-0 gap-1">
                      <CheckCircle2 className="size-3" />
                      Active Shift
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {station.status && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: station.status.color || undefined,
                  color: station.status.color || undefined,
                }}
              >
                {station.status.name}
              </Badge>
            )}
          </div>

          <SheetDescription className="text-xs text-muted-foreground mt-2">
            {station.description || "Dedicated operational workstation"}
          </SheetDescription>
        </SheetHeader>

        {/* Quick Action Bar */}
        <div className="p-4 border-b bg-background flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isCurrentSession ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                onClick={() => leaveStation()}
              >
                End Active Shift
              </Button>
            ) : isOperational ? (
              <Button
                variant="default"
                size="sm"
                className="text-xs gap-1.5"
                disabled={isSelecting}
                onClick={() => selectStation(station.id)}
              >
                <Radio className="size-3.5" />
                Join Workstation
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => {
                onOpenChange(false);
                router.push(`/dashboard/projects?stationId=${station.id}`);
              }}
            >
              <FolderKanban className="size-3.5" />
              View Projects
            </Button>
          </div>

          {onEdit && station._capabilities?.canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => onEdit(station)}
            >
              <Edit2 className="size-3.5" />
              Edit
            </Button>
          )}
        </div>

        {/* Tabs Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Occupancy Progress */}
          <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Activity className="size-4 text-primary" />
                Real-time Shift Occupancy
              </span>
              <span className="font-bold text-foreground">
                {currentSessions.length} / {station.maxConcurrentUsers} Operators Active
              </span>
            </div>
            <Progress value={occupancyPct} className="h-2" />
            <p className="text-[11px] text-muted-foreground">
              Capacity limit: Maximum {station.maxConcurrentUsers} concurrent operator sessions.
            </p>
          </div>

          <Tabs defaultValue="profiles" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="profiles" className="text-xs gap-1.5">
                <Briefcase className="size-3.5" />
                Profiles ({activeProfiles.length})
              </TabsTrigger>
              <TabsTrigger value="operators" className="text-xs gap-1.5">
                <Users className="size-3.5" />
                Operators ({assignedUsers.length})
              </TabsTrigger>
              <TabsTrigger value="sessions" className="text-xs gap-1.5">
                <Radio className="size-3.5" />
                Live Sessions ({currentSessions.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Profiles */}
            <TabsContent value="profiles" className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Hosted Platform Accounts
                </span>
                {onManageProfiles && station._capabilities?.canAssignProfile && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs p-0 h-auto"
                    onClick={() => onManageProfiles(station)}
                  >
                    Manage Profiles
                  </Button>
                )}
              </div>

              {activeProfiles.length === 0 ? (
                <div className="py-8 text-center border rounded-xl bg-card">
                  <p className="text-xs text-muted-foreground">
                    No platform profiles are attached to this workstation.
                  </p>
                </div>
              ) : (
                <div className="divide-y border rounded-xl bg-card overflow-hidden">
                  {activeProfiles.map((p: StationProfileAssignmentItem) => (
                    <div
                      key={p.id}
                      className="p-3.5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          <Briefcase className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {p.profile?.username}
                            </span>
                            <Badge variant="outline" className="text-[10px] py-0">
                              {p.profile?.platform?.name || "Platform"}
                            </Badge>
                            {p.isPrimary && (
                              <Badge className="bg-amber-500 text-[10px] py-0">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                            {p.shift && <span>Shift: {p.shift}</span>}
                            <span>
                              Projects: {p.profile?._count?.projects ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          onOpenChange(false);
                          router.push(`/dashboard/projects?profileId=${p.profileId}`);
                        }}
                      >
                        View Projects
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Operators */}
            <TabsContent value="operators" className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Authorized Operators Roster
                </span>
                {onManageUsers && station._capabilities?.canAssignUser && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs p-0 h-auto"
                    onClick={() => onManageUsers(station)}
                  >
                    Manage Roster
                  </Button>
                )}
              </div>

              {assignedUsers.length === 0 ? (
                <div className="py-8 text-center border rounded-xl bg-card">
                  <p className="text-xs text-muted-foreground">
                    No operators are currently assigned to this workstation.
                  </p>
                </div>
              ) : (
                <div className="divide-y border rounded-xl bg-card overflow-hidden">
                  {assignedUsers.map((au: StationUserAssignmentItem) => {
                    const name =
                      au.user?.firstName || au.user?.lastName
                        ? `${au.user?.firstName || ""} ${au.user?.lastName || ""}`.trim()
                        : au.user?.email || "Unknown";

                    return (
                      <div
                        key={au.id}
                        className="p-3 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={au.user?.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs font-bold">
                              {name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-foreground">
                                {name}
                              </span>
                              {au.role && (
                                <Badge variant="secondary" className="text-[10px] py-0">
                                  {au.role.name}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {au.user?.email} {au.shift ? `• Shift: ${au.shift}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Live Sessions */}
            <TabsContent value="sessions" className="pt-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Current Connected Shifts ({currentSessions.length})
              </span>

              {currentSessions.length === 0 ? (
                <div className="py-8 text-center border rounded-xl bg-card">
                  <p className="text-xs text-muted-foreground">
                    No active operator sessions currently connected.
                  </p>
                </div>
              ) : (
                <div className="divide-y border rounded-xl bg-card overflow-hidden">
                  {currentSessions.map((s: StationSessionItem) => (
                    <div key={s.id} className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex size-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                          </span>
                          <span className="font-semibold text-xs">
                            {s.user?.firstName} {s.user?.lastName} ({s.user?.email})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {s.ipAddress || "Internal IP"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Joined: {new Date(s.joinedAt).toLocaleTimeString()}
                        </span>
                        <span>
                          Device: {s.deviceInfo ? s.deviceInfo.slice(0, 30) + "..." : "Browser"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Technical Specs & Org Info */}
          <div className="pt-4 border-t space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Technical & Organizational Specs
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <span className="text-muted-foreground">Department</span>
                <p className="font-semibold text-foreground">
                  {station.department?.name || "Global / Unassigned"}
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <span className="text-muted-foreground">Branch Location</span>
                <p className="font-semibold text-foreground">
                  {station.branch?.name || "HQ / Remote"}
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <span className="text-muted-foreground">MAC Address</span>
                <p className="font-mono text-foreground font-medium">
                  {station.macAddress || "Not configured"}
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <span className="text-muted-foreground">IP Whitelist</span>
                <p className="font-mono text-foreground font-medium">
                  {station.ipWhitelist && station.ipWhitelist.length > 0
                    ? `${station.ipWhitelist.length} Allowed IP(s)`
                    : "Open Network"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
