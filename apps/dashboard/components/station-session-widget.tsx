"use client";

import * as React from "react";
import {
  useStationSession,
  formatSessionDuration,
  formatSessionStartTime,
} from "@/lib/station/StationContext";
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
  Radio,
  Briefcase,
  LogOut,
  ArrowRightLeft,
  ChevronDown,
  LayoutDashboard,
  PlusCircle,
  X,
  Layers,
  Clock,
  Globe,
  Laptop,
  Users,
  CheckCircle2,
} from "lucide-react";
import { SelectStationModal } from "@/app/dashboard/stations/components/SelectStationModal";
import { useRouter } from "next/navigation";

export function StationSessionWidget() {
  const router = useRouter();
  const {
    activeSessions,
    currentStationId,
    activeContext,
    sessionDuration,
    switchStation,
    leaveStation,
    leaveAllStations,
    selectModalOpen,
    setSelectModalOpen,
  } = useStationSession();

  const activeStation = activeContext?.station;
  const activeSession = activeContext?.session;
  const activeProfiles = activeContext?.activeProfiles || [];
  const totalActive = activeSessions.length;

  const currentCapacityOccupancy = React.useMemo(() => {
    if (!activeStation) return null;
    const activeCount = activeStation.currentSessions?.length || 1;
    const maxCap = Math.max(1, activeStation.maxConcurrentUsers);
    return {
      activeCount,
      maxCap,
      pct: Math.min(100, Math.round((activeCount / maxCap) * 100)),
    };
  }, [activeStation]);

  return (
    <>
      {activeStation ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-xs font-medium px-2.5 transition-all cursor-pointer"
              />
            }
          >
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-[150px]">
              {activeStation.name}
            </span>
            {totalActive > 1 ? (
              <Badge
                variant="default"
                className="h-4 px-1.5 text-[10px] font-medium bg-emerald-600 hover:bg-emerald-600 text-white gap-0.5"
              >
                <Layers className="size-2.5" />
                {totalActive} Active
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[10px] font-mono bg-background/80 text-emerald-700 dark:text-emerald-300"
              >
                {sessionDuration}
              </Badge>
            )}
            <ChevronDown className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2 shadow-2xl rounded-xl space-y-1">
            {/* 1. Header / Focused Session Telemetry Summary Card */}
            <div className="p-3 rounded-lg bg-emerald-500/[0.07] border border-emerald-500/20 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-foreground truncate">
                      {activeStation.name}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono py-0 px-1 shrink-0 bg-background/50">
                      {activeStation.code}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {activeStation.department?.name || "Operations Desk"} • {activeStation.branch?.name || "HQ"}
                  </span>
                </div>

                <Badge
                  variant="default"
                  className="text-[9px] font-semibold bg-emerald-600 hover:bg-emerald-600 text-white shrink-0 gap-1 py-0.5 px-1.5"
                >
                  <CheckCircle2 className="size-2.5" />
                  Focused
                </Badge>
              </div>

              {/* Actual Session Metadata Grid */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] border-t border-emerald-500/20">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">
                    Active: <strong className="text-foreground font-semibold">{sessionDuration}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                  <Globe className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate font-mono text-[10px]">
                    {activeSession?.ipAddress || "Internal IP"}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                  <Laptop className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate text-[10px]">
                    Started: {formatSessionStartTime(activeSession?.joinedAt)}
                  </span>
                </div>

                {currentCapacityOccupancy && (
                  <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                    <Users className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate text-[10px]">
                      Station Capacity:{" "}
                      <strong className="text-foreground font-medium">
                        {currentCapacityOccupancy.activeCount} / {currentCapacityOccupancy.maxCap} seats
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Multi-Station Shifts (if joined to > 1 stations) */}
            {totalActive > 1 && (
              <>
                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Your Other Active Shifts ({totalActive - 1})</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectModalOpen(true)}
                    className="h-5 px-1 text-[10px] gap-1 text-primary hover:bg-primary/10"
                  >
                    <PlusCircle className="size-2.5" />
                    Join More
                  </Button>
                </DropdownMenuLabel>

                <div className="p-1 space-y-1 max-h-36 overflow-y-auto">
                  {activeSessions
                    .filter((ctx) => ctx.station.id !== currentStationId)
                    .map((ctx) => {
                      const duration = formatSessionDuration(ctx.session?.joinedAt);
                      const profilesCount = ctx.activeProfiles?.length || 0;

                      return (
                        <div
                          key={ctx.station.id}
                          onClick={() => switchStation(ctx.station.id)}
                          className="group flex items-center justify-between gap-2 p-1.5 rounded-lg text-xs hover:bg-muted/60 transition-colors cursor-pointer border border-transparent hover:border-border"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-2 rounded-full bg-emerald-500/70 group-hover:bg-emerald-500 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="truncate font-semibold text-foreground text-[11px]">
                                  {ctx.station.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                {ctx.station.code} • {duration} • {profilesCount}p
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1.5 text-[10px] text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => switchStation(ctx.station.id)}
                            >
                              Focus
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                              title={`Disconnect ${ctx.station.name}`}
                              onClick={() => leaveStation(ctx.station.id)}
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* 3. Focused Station Profiles Overview */}
            {activeProfiles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-1 max-h-28 overflow-y-auto">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Connected Profiles ({activeProfiles.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {activeProfiles.map((ap) => (
                      <Badge
                        key={ap.id}
                        variant="secondary"
                        className="text-[10px] py-0.5 px-1.5 gap-1 font-normal"
                      >
                        <Briefcase className="size-2.5 text-primary" />
                        <span className="font-semibold">{ap.profile?.username || "Profile"}</span>
                        <span className="text-muted-foreground">({ap.profile?.platform?.name || "Platform"})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <DropdownMenuSeparator />

            {/* 4. Action Links */}
            <DropdownMenuItem
              onClick={() => setSelectModalOpen(true)}
              className="text-xs gap-2 cursor-pointer"
            >
              <ArrowRightLeft className="size-3.5 text-primary" />
              <span>Switch or Join Stations</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push("/dashboard/stations")}
              className="text-xs gap-2 cursor-pointer"
            >
              <LayoutDashboard className="size-3.5" />
              <span>Manage Workstations</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* 5. Disconnect Actions */}
            {totalActive > 1 ? (
              <>
                <DropdownMenuItem
                  onClick={() => leaveStation(currentStationId || undefined)}
                  className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>Disconnect Current ({activeStation.name})</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => leaveAllStations()}
                  className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer font-medium"
                >
                  <LogOut className="size-3.5" />
                  <span>Disconnect All ({totalActive} Stations)</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => leaveStation(activeStation.id)}
                className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>End Shift / Disconnect</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectModalOpen(true)}
          className="h-8 gap-1.5 text-xs border-dashed text-muted-foreground hover:text-primary hover:border-primary/40 px-2.5 transition-all cursor-pointer"
        >
          <Radio className="size-3.5 text-primary/70" />
          <span className="hidden sm:inline">Select Station</span>
        </Button>
      )}

      <SelectStationModal
        open={selectModalOpen}
        onOpenChange={setSelectModalOpen}
      />
    </>
  );
}
