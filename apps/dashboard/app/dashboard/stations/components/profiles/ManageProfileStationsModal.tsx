"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Monitor, Loader2, Save } from "lucide-react";
import type { StationItem, ProfileManagementItem } from "@workspace/shared";

interface ManageProfileStationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileManagementItem | null;
  stations: StationItem[];
  onSuccess: (updatedProfile: ProfileManagementItem) => void;
}

export function ManageProfileStationsModal({
  open,
  onOpenChange,
  profile,
  stations,
  onSuccess,
}: ManageProfileStationsModalProps) {
  const [selectedStationIds, setSelectedStationIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && profile) {
      setSelectedStationIds(
        profile.stationIds || profile.assignedStations?.map((s) => s.stationId) || [],
      );
    }
  }, [open, profile]);

  const toggleStation = (stationId: string) => {
    setSelectedStationIds((prev) =>
      prev.includes(stationId)
        ? prev.filter((id) => id !== stationId)
        : [...prev, stationId],
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await api.patch<ProfileManagementItem>(`/stations/profiles/${profile.id}`, {
        stationIds: selectedStationIds,
      });
      const updated = (res as any)?.data !== undefined ? (res as any).data : res;
      toast.success(`Workstations updated for "${profile.username}".`);
      onOpenChange(false);
      onSuccess(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed to update assigned workstations");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full min-w-[min(100vw-2rem,36rem)] sm:min-w-[500px] md:min-w-[560px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Monitor className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Assign Workstations: {profile.username}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Select which sales workstations can host and operate this platform profile.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider">
              Available Workstations ({stations.length})
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              {selectedStationIds.length} Selected
            </Badge>
          </div>

          <ScrollArea className="flex-1 max-h-[300px] pr-2">
            <div className="space-y-2">
              {stations.map((stn) => {
                const isSelected = selectedStationIds.includes(stn.id);
                return (
                  <div
                    key={stn.id}
                    onClick={() => toggleStation(stn.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleStation(stn.id)}
                        className="size-4.5"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {stn.name}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-mono font-medium text-foreground/80">
                            {stn.code}
                          </span>
                          {stn.branch && <span>• {stn.branch.name}</span>}
                          {stn.department && <span>• {stn.department.name}</span>}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] py-0.5 px-2">
                        Assigned
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-4 border-t gap-2 sm:gap-0 bg-muted/10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5 text-xs shadow-xs"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
