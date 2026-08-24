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
import { useStationSession } from "@/lib/station/StationContext";
import {
  Monitor,
  Radio,
  Users,
  Briefcase,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
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
    activeContext,
    myStations,
    selectStation,
    isSelecting,
    refreshMyStations,
  } = useStationSession();

  const stations = propStations || myStations;
  const [selectedStationId, setSelectedStationId] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      refreshMyStations();
      if (activeContext?.station?.id) {
        setSelectedStationId(activeContext.station.id);
      } else if (stations.length > 0 && stations[0]) {
        setSelectedStationId(stations[0].id);
      }
    }
  }, [open, activeContext, refreshMyStations, stations]);

  const handleConnect = async (stationId: string) => {
    try {
      await selectStation(stationId);
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // toast is already handled in context
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Radio className="size-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Select Your Workstation
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Join an assigned sales workstation to load assigned profiles and sync project contexts for your shift.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {stations.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <ShieldAlert className="size-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">No Assigned Stations Found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  You are not currently assigned to any active stations. Please contact your administrator or team lead.
                </p>
              </div>
            </div>
          ) : (
            stations.map((stn) => {
              const isCurrent = activeContext?.station?.id === stn.id;
              const isSelected = selectedStationId === stn.id;
              const isOperational = stn.status?.isOperational ?? true;

              return (
                <div
                  key={stn.id}
                  onClick={() => isOperational && setSelectedStationId(stn.id)}
                  className={`group relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? "border-primary/60 bg-primary/[0.04] shadow-sm"
                      : isSelected
                      ? "border-primary bg-primary/[0.02]"
                      : isOperational
                      ? "border-border hover:border-primary/40 hover:bg-muted/40"
                      : "opacity-60 border-destructive/20 bg-destructive/[0.02] cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isCurrent
                            ? "bg-primary text-primary-foreground"
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
                          {isCurrent && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] py-0 px-1.5 gap-1">
                              <CheckCircle2 className="size-2.5" />
                              Active Shift
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {stn.description || "Dedicated sales workstation"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {stn.status && (
                        <Badge
                          variant="secondary"
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
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="size-3.5 text-primary" />
                        <strong className="text-foreground">
                          {stn.activeProfilesCount ?? stn.activeProfiles?.length ?? 0}
                        </strong>{" "}
                        Profiles
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        <strong className="text-foreground">
                          {stn.activeUsersCount ?? stn.assignedUsers?.length ?? 0}
                        </strong>{" "}
                        Operators
                      </span>
                    </div>

                    {!isCurrent && isOperational && (
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className="h-7 text-xs gap-1"
                        disabled={isSelecting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect(stn.id);
                        }}
                      >
                        {isSelecting && selectedStationId === stn.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <>
                            Join Station
                            <ArrowRight className="size-3" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
