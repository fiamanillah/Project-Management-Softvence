"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useStationSession } from "@/lib/station/StationContext";
import {
  Monitor,
  Radio,
  Users,
  Briefcase,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Search,
  Check,
  LogOut,
  Layers,
} from "lucide-react";
import type { StationItem } from "@workspace/shared";

interface SelectStationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stations?: StationItem[];
  onSuccess?: () => void;
}

export function SelectStationModal({
  open,
  onOpenChange,
  stations: propStations,
  onSuccess,
}: SelectStationModalProps) {
  const {
    activeSessions,
    currentStationId,
    activeStationIds,
    myStations,
    isJoined,
    switchStation,
    selectStation,
    leaveStation,
    leaveAllStations,
    isSelecting,
    refreshMyStations,
  } = useStationSession();

  const stations = propStations || myStations;
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    if (open) {
      refreshMyStations();
      setSearchQuery("");
    }
  }, [open, refreshMyStations]);

  const filteredStations = React.useMemo(() => {
    if (!searchQuery.trim()) return stations;
    const q = searchQuery.toLowerCase().trim();
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [stations, searchQuery]);

  const handleConnect = async (stationId: string) => {
    try {
      await selectStation(stationId);
      onSuccess?.();
    } catch {
      // toast is already handled in context
    }
  };

  const handleSwitch = (stationId: string) => {
    switchStation(stationId);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full min-w-[min(100vw-2rem,42rem)] sm:min-w-[580px] md:min-w-[660px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Radio className="size-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Workstation Hub & Multi-Station Joining
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Join multiple authorized sales workstations simultaneously and switch your active focus seamlessly.
              </DialogDescription>
            </div>
          </div>

          {/* Active Sessions Summary Bar */}
          {activeSessions.length > 0 && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Layers className="size-3.5" />
                  Active Shifts ({activeSessions.length}):
                </span>
                {activeSessions.map((s) => (
                  <Badge
                    key={s.station.id}
                    variant={s.station.id === currentStationId ? "default" : "secondary"}
                    className={`text-[10px] cursor-pointer transition-transform hover:scale-105 ${
                      s.station.id === currentStationId
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-background/80 hover:bg-background border"
                    }`}
                    onClick={() => switchStation(s.station.id)}
                  >
                    {s.station.id === currentStationId && <Check className="size-2.5 mr-0.5" />}
                    {s.station.name}
                  </Badge>
                ))}
              </div>

              {activeSessions.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 px-2 shrink-0"
                  onClick={() => leaveAllStations()}
                >
                  Leave All
                </Button>
              )}
            </div>
          )}

          {/* Search bar */}
          <div className="relative mt-3">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workstations by name or code..."
              className="h-9 pl-8 text-xs bg-background"
            />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[58vh] p-6">
          <div className="space-y-3">
            {filteredStations.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <ShieldAlert className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {searchQuery ? "No matching workstations found" : "No Assigned Stations Found"}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    {searchQuery
                      ? "Try refining your search query."
                      : "You are not currently assigned to any active stations. Please contact your administrator or team lead."}
                  </p>
                </div>
              </div>
            ) : (
              filteredStations.map((stn) => {
                const joined = isJoined(stn.id);
                const isFocused = currentStationId === stn.id;
                const isOperational = stn.status?.isOperational ?? true;

                return (
                  <div
                    key={stn.id}
                    className={`group relative flex flex-col p-4 rounded-xl border transition-all ${
                      isFocused
                        ? "border-primary/60 bg-primary/[0.04] shadow-sm"
                        : joined
                        ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                        : isOperational
                        ? "border-border hover:border-primary/40 hover:bg-muted/30"
                        : "opacity-60 border-destructive/20 bg-destructive/[0.02]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isFocused
                              ? "bg-primary text-primary-foreground"
                              : joined
                              ? "bg-emerald-500 text-white"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <Monitor className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{stn.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                              {stn.code}
                            </Badge>
                            {isFocused ? (
                              <Badge className="bg-primary hover:bg-primary text-[10px] py-0 px-1.5 gap-1">
                                <Check className="size-2.5" />
                                Focused
                              </Badge>
                            ) : joined ? (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] py-0 px-1.5 gap-1">
                                <CheckCircle2 className="size-2.5" />
                                Active Shift
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {stn.description || "Dedicated sales workstation"}
                          </p>
                        </div>
                      </div>

                      {stn.status && (
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            borderColor: stn.status.color || undefined,
                            color: stn.status.color || undefined,
                          }}
                        >
                          {stn.status.name}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Briefcase className="size-3.5" />
                          <strong className="text-foreground">
                            {stn.activeProfilesCount ?? stn.activeProfiles?.length ?? 0}
                          </strong>{" "}
                          Profiles
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" />
                          <strong className="text-foreground">
                            {stn.activeUsersCount ?? stn.assignedUsers?.length ?? 0}
                          </strong>{" "}
                          Operators
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {joined ? (
                          <>
                            {!isFocused && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1"
                                onClick={() => handleSwitch(stn.id)}
                              >
                                Switch Focus
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                              onClick={() => leaveStation(stn.id)}
                            >
                              <LogOut className="size-3" />
                              Leave
                            </Button>
                          </>
                        ) : isOperational ? (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs gap-1"
                            disabled={isSelecting}
                            onClick={() => handleConnect(stn.id)}
                          >
                            {isSelecting ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <>
                                Join Station
                                <ArrowRight className="size-3" />
                              </>
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
