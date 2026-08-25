"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Progress } from "@workspace/ui/components/progress";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
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
  UserCheck,
  Shield,
  Laptop,
  Globe,
  LogOut,
  ArrowRight,
} from "lucide-react";
import type {
  StationItem,
  StationProfileAssignmentItem,
  StationUserAssignmentItem,
  StationSessionItem,
} from "@workspace/shared";
import {
  useStationSession,
  formatSessionDuration,
  formatSessionStartTime,
} from "@/lib/station/StationContext";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export interface StationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: StationItem | null;
  onEdit?: (station: StationItem) => void;
  onManageUsers?: (station: StationItem) => void;
  onManageProfiles?: (station: StationItem) => void;
}

export function StationDetailModal({
  open,
  onOpenChange,
  station,
  onEdit,
  onManageUsers,
  onManageProfiles,
}: StationDetailModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    isJoined,
    currentStationId,
    activeSessions,
    switchStation,
    selectStation,
    leaveStation,
    isSelecting,
  } = useStationSession();

  if (!station) return null;

  const joined = isJoined(station.id);
  const isFocused = currentStationId === station.id;
  const activeProfiles: StationProfileAssignmentItem[] = station.activeProfiles || [];
  const assignedUsers: StationUserAssignmentItem[] = station.assignedUsers || [];
  const currentSessions: StationSessionItem[] = station.currentSessions || [];
  const isOperational = station.status?.isOperational ?? true;

  // Match current user's active session for this station
  const myActiveSessionCtx = activeSessions.find((s) => s.station.id === station.id);
  const mySession = myActiveSessionCtx?.session || currentSessions.find((s) => s.userId === user?.id) || null;

  const maxCap = Math.max(1, station.maxConcurrentUsers);
  const occupancyPct = Math.min(
    100,
    Math.round((currentSessions.length / maxCap) * 100)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full min-w-[min(100vw-2rem,46rem)] sm:min-w-[620px] md:min-w-[740px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`size-11 rounded-xl flex items-center justify-center font-bold ${
                  isFocused
                    ? "bg-primary text-primary-foreground"
                    : joined
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-foreground"
                }`}
              >
                <Monitor className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold">{station.name}</DialogTitle>
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
                  {isFocused ? (
                    <Badge className="bg-primary text-xs py-0 gap-1 text-white">
                      <CheckCircle2 className="size-3" />
                      Focused
                    </Badge>
                  ) : joined ? (
                    <Badge className="bg-emerald-500 text-xs py-0 gap-1 text-white">
                      <CheckCircle2 className="size-3" />
                      Active Shift
                    </Badge>
                  ) : null}
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

          <DialogDescription className="text-xs text-muted-foreground mt-2">
            {station.description || "Dedicated operational workstation"}
          </DialogDescription>
        </DialogHeader>

        {/* Quick Action Bar */}
        <div className="p-4 border-b bg-background flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {joined ? (
              <>
                {!isFocused && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
                    onClick={() => switchStation(station.id)}
                  >
                    Set as Active Focus
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                  onClick={() => leaveStation(station.id)}
                >
                  End Shift for Station
                </Button>
              </>
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

        {/* Modal Scrollable Body with Tabs */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-160px)] px-6 py-5">
          <div className="space-y-6">
            {/* Your Active Session Telemetry Highlight (if operator is joined) */}
            {joined && mySession && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      Your Active Shift on this Workstation
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFocused ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] gap-1 py-0.5 px-2">
                        <CheckCircle2 className="size-3" />
                        Focused Station
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                        onClick={() => switchStation(station.id)}
                      >
                        <ArrowRight className="size-3" />
                        Set as Focused
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => leaveStation(station.id)}
                    >
                      <LogOut className="size-3 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-500/20 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3 text-emerald-600" />
                      Active Duration
                    </span>
                    <p className="font-semibold text-foreground">
                      {formatSessionDuration(mySession.joinedAt)}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3 text-emerald-600" />
                      Joined At
                    </span>
                    <p className="font-semibold text-foreground">
                      {formatSessionStartTime(mySession.joinedAt)}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Globe className="size-3 text-emerald-600" />
                      Network IP
                    </span>
                    <p className="font-mono text-[11px] font-semibold text-foreground">
                      {mySession.ipAddress || "Internal IP"}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                                <Badge className="bg-amber-500 text-[10px] py-0 text-white">
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
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Current Connected Shifts ({currentSessions.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Capacity: {currentSessions.length} / {station.maxConcurrentUsers}
                  </span>
                </div>

                {currentSessions.length === 0 ? (
                  <div className="py-8 text-center border rounded-xl bg-card space-y-1.5">
                    <Radio className="size-6 text-muted-foreground/40 mx-auto" />
                    <p className="text-xs font-medium text-foreground">
                      No active operator sessions currently connected.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Assigned operators can select and join this workstation to begin a shift.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y border rounded-xl bg-card overflow-hidden">
                    {currentSessions.map((s: StationSessionItem) => {
                      const isMe = s.userId === user?.id;
                      const isMeFocused = isMe && isFocused;
                      const duration = formatSessionDuration(s.joinedAt);
                      const startTime = formatSessionStartTime(s.joinedAt);
                      const initials = `${s.user?.firstName?.[0] || ""}${s.user?.lastName?.[0] || ""}`.toUpperCase() || "U";

                      return (
                        <div
                          key={s.id}
                          className={`p-3.5 space-y-2 transition-colors ${
                            isMe ? "bg-emerald-500/[0.04]" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="size-7 border">
                                <AvatarImage src={s.user?.avatarUrl || undefined} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-foreground truncate">
                                    {s.user?.firstName} {s.user?.lastName}
                                  </span>
                                  {isMe && (
                                    <Badge
                                      variant={isMeFocused ? "default" : "secondary"}
                                      className={`text-[9px] py-0 px-1.5 gap-0.5 ${
                                        isMeFocused
                                          ? "bg-emerald-600 hover:bg-emerald-600 text-white font-medium"
                                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                                      }`}
                                    >
                                      {isMeFocused ? "You (Focused)" : "You (Active Shift)"}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground truncate block">
                                  {s.user?.email}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono py-0 px-1.5 bg-background"
                              >
                                {s.ipAddress || "Internal IP"}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap pt-0.5 border-t border-border/40">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-emerald-600 dark:text-emerald-400" />
                              Active: <strong className="text-foreground font-medium">{duration}</strong>
                            </span>
                            <span>
                              Joined: {startTime}
                            </span>
                            <span className="truncate max-w-[200px]">
                              Device: {s.deviceInfo ? (s.deviceInfo.length > 25 ? s.deviceInfo.slice(0, 25) + "..." : s.deviceInfo) : "Web Browser"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
                  <span className="text-muted-foreground">Hardware Security</span>
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {station.isMacRestricted ? (
                      <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px]">
                        MAC Restricted ({station.macWhitelist?.length || 0} Devices)
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        Open Access (Any Device)
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-muted-foreground">Network Security</span>
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {station.isIpRestricted ? (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                        IP Restricted ({station.ipWhitelist?.length || 0} IPs)
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        Open Access (Any IP)
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {station.isMacRestricted && station.macWhitelist && station.macWhitelist.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-semibold text-muted-foreground">Whitelisted Device MAC Addresses</span>
                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border bg-muted/10 font-mono text-xs">
                    {station.macWhitelist.map((mac) => (
                      <Badge key={mac} variant="outline" className="font-mono text-xs py-0.5 px-2 bg-purple-500/5 text-purple-700 dark:text-purple-300 border-purple-500/20">
                        {mac}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {station.isIpRestricted && station.ipWhitelist && station.ipWhitelist.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-semibold text-muted-foreground">Whitelisted IP Addresses</span>
                  <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border bg-muted/10 font-mono text-xs">
                    {station.ipWhitelist.map((ip) => (
                      <Badge key={ip} variant="outline" className="font-mono text-xs py-0.5 px-2 bg-amber-500/5 text-amber-700 dark:text-amber-300 border-amber-500/20">
                        {ip}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
