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
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { api, handleFormApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Loader2,
  Briefcase,
  Monitor,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type {
  StationItem,
  StationProfileAssignmentItem,
} from "@workspace/shared";
import { useStationSession } from "@/lib/station/StationContext";

interface ReassignProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stations: StationItem[];
  defaultStation?: StationItem | null;
  defaultProfile?: StationProfileAssignmentItem | null;
  onSuccess: () => void;
}

export function ReassignProfileModal({
  open,
  onOpenChange,
  stations,
  defaultStation,
  defaultProfile,
  onSuccess,
}: ReassignProfileModalProps) {
  const { refreshSession } = useStationSession();
  const [loading, setLoading] = React.useState(false);

  const [fromStationId, setFromStationId] = React.useState<string>("");
  const [profileId, setProfileId] = React.useState<string>("");
  const [toStationId, setToStationId] = React.useState<string>("");
  const [shift, setShift] = React.useState<string>("Day");
  const [isPrimary, setIsPrimary] = React.useState<boolean>(false);
  const [note, setNote] = React.useState<string>("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setFieldErrors({});
      setNote("");
      setShift("Day");
      setIsPrimary(false);

      if (defaultStation) {
        setFromStationId(defaultStation.id);
      } else if (stations.length > 0 && stations[0]) {
        setFromStationId(stations[0].id);
      }

      if (defaultProfile) {
        setProfileId(defaultProfile.profileId);
        setIsPrimary(defaultProfile.isPrimary ?? false);
      } else {
        setProfileId("");
      }

      // Default target station: first different operational station
      const sourceId = defaultStation?.id || stations[0]?.id;
      const target = stations.find(
        (s) => s.id !== sourceId && (s.status?.isOperational ?? true)
      );
      setToStationId(target?.id || "");
    }
  }, [open, defaultStation, defaultProfile, stations]);

  const fromStation = React.useMemo(() => {
    return stations.find((s) => s.id === fromStationId);
  }, [stations, fromStationId]);

  const availableProfiles = React.useMemo(() => {
    return fromStation?.activeProfiles || [];
  }, [fromStation]);

  const targetStation = React.useMemo(() => {
    return stations.find((s) => s.id === toStationId);
  }, [stations, toStationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!fromStationId) {
      setFieldErrors((prev) => ({ ...prev, fromStationId: "Select source station" }));
      return;
    }
    if (!profileId) {
      setFieldErrors((prev) => ({ ...prev, profileId: "Select profile to reassign" }));
      return;
    }
    if (!toStationId) {
      setFieldErrors((prev) => ({ ...prev, toStationId: "Select target workstation" }));
      return;
    }
    if (fromStationId === toStationId) {
      setFieldErrors((prev) => ({
        ...prev,
        toStationId: "Target station must be different from source station",
      }));
      return;
    }

    setLoading(true);
    try {
      await api.post("/stations/reassign-profile", {
        profileId,
        fromStationId,
        toStationId,
        shift: shift !== "none" ? shift : undefined,
        isPrimary,
        note: note.trim() || undefined,
      });

      toast.success("Profile transferred to new workstation successfully.");
      await refreshSession();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      const msg = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <ArrowRightLeft className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Transfer Profile Between Workstations
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Atomically hand off a platform profile from one workstation to another for shift rotation or re-allocation.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Station Handoff Visual Route */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/60">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Origin Station
              </span>
              <p className="text-xs font-bold text-foreground line-clamp-1">
                {fromStation?.name || "Select Source"}
              </p>
              {fromStation && (
                <Badge variant="outline" className="text-[9px] font-mono py-0">
                  {fromStation.code}
                </Badge>
              )}
            </div>

            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <ArrowRight className="size-4" />
            </div>

            <div className="space-y-0.5 text-right">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Destination Station
              </span>
              <p className="text-xs font-bold text-foreground line-clamp-1">
                {targetStation?.name || "Select Target"}
              </p>
              {targetStation && (
                <Badge variant="outline" className="text-[9px] font-mono py-0">
                  {targetStation.code}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* From Station */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Source Workstation <span className="text-destructive">*</span>
              </Label>
              <Select
                value={fromStationId}
                onValueChange={(val: string | null) => {
                  if (val) {
                    setFromStationId(val);
                    setProfileId("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select origin station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Station */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Destination Workstation <span className="text-destructive">*</span>
              </Label>
              <Select
                value={toStationId}
                onValueChange={(val: string | null) => {
                  if (val) setToStationId(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target station" />
                </SelectTrigger>
                <SelectContent>
                  {stations
                    .filter((s) => s.id !== fromStationId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {fieldErrors.toStationId && (
                <p className="text-[11px] text-destructive">{fieldErrors.toStationId}</p>
              )}
            </div>
          </div>

          {/* Profile Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Profile to Transfer <span className="text-destructive">*</span>
            </Label>
            <Select
              value={profileId}
              onValueChange={(val: string | null) => {
                if (val) setProfileId(val);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select active profile to transfer" />
              </SelectTrigger>
              <SelectContent>
                {availableProfiles.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No active profiles on source station
                  </SelectItem>
                ) : (
                  availableProfiles.map((p) => (
                    <SelectItem key={p.profileId} value={p.profileId}>
                      <span className="flex items-center gap-2">
                        <Briefcase className="size-3.5 text-primary" />
                        <strong className="font-semibold">
                          {p.profile?.username}
                        </strong>
                        <span className="text-muted-foreground text-xs">
                          ({p.profile?.platform?.name || "Platform"})
                        </span>
                        {p.isPrimary && (
                          <Badge variant="secondary" className="text-[9px] py-0">
                            Primary
                          </Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {fieldErrors.profileId && (
              <p className="text-[11px] text-destructive">{fieldErrors.profileId}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shift */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Shift Timing</Label>
              <Select
                value={shift}
                onValueChange={(val: string | null) => {
                  if (val) setShift(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Day">Day Shift</SelectItem>
                  <SelectItem value="Night">Night Shift</SelectItem>
                  <SelectItem value="Morning">Morning Rotation</SelectItem>
                  <SelectItem value="Evening">Evening Rotation</SelectItem>
                  <SelectItem value="Rotational">Rotational / Flexible</SelectItem>
                  <SelectItem value="none">Not Specified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Primary Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Primary Profile</Label>
                <p className="text-[10px] text-muted-foreground">
                  Mark as lead profile on target station
                </p>
              </div>
              <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
            </div>
          </div>

          {/* Handoff Note */}
          <div className="space-y-1.5">
            <Label htmlFor="transfer-note" className="text-xs font-semibold">
              Handoff / Rotation Note
            </Label>
            <Textarea
              id="transfer-note"
              rows={2}
              placeholder="e.g. Reassigned for night shift client support coverage..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-3 border-t gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
              {loading && <Loader2 className="size-4 animate-spin" />}
              Transfer Profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
