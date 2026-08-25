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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { api, handleFormApiError } from "@/lib/api";
import { toast } from "sonner";
import { Edit2, Loader2, Monitor } from "lucide-react";
import type { PlatformItem, StationItem, ProfileManagementItem } from "@workspace/shared";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileManagementItem | null;
  platforms: PlatformItem[];
  stations: StationItem[];
  onSuccess: (updatedProfile: ProfileManagementItem) => void;
}

export function EditProfileModal({
  open,
  onOpenChange,
  profile,
  platforms,
  stations,
  onSuccess,
}: EditProfileModalProps) {
  const [username, setUsername] = React.useState("");
  const [platformId, setPlatformId] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [selectedStationIds, setSelectedStationIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open && profile) {
      setUsername(profile.username || "");
      setPlatformId(profile.platformId || platforms[0]?.id || "");
      setIsActive(profile.isActive ?? true);
      setSelectedStationIds(profile.stationIds || profile.assignedStations?.map((s) => s.stationId) || []);
      setFieldErrors({});
    }
  }, [open, profile, platforms]);

  const toggleStation = (stationId: string) => {
    setSelectedStationIds((prev) =>
      prev.includes(stationId)
        ? prev.filter((id) => id !== stationId)
        : [...prev, stationId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setFieldErrors({});

    if (!username.trim()) {
      setFieldErrors({ username: "Username / handle is required" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.patch<ProfileManagementItem>(`/stations/profiles/${profile.id}`, {
        username: username.trim(),
        platformId: platformId || undefined,
        isActive,
        stationIds: selectedStationIds,
      });

      const updated = (res as any)?.data !== undefined ? (res as any).data : res;
      toast.success(`Platform Profile "${updated.username || username}" updated successfully.`);
      onOpenChange(false);
      onSuccess(updated);
    } catch (err: any) {
      const msg = handleFormApiError(err, (field, errObj) => {
        setFieldErrors((prev) => ({ ...prev, [field]: errObj.message }));
      });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full min-w-[min(100vw-2rem,40rem)] sm:min-w-[560px] md:min-w-[620px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Edit2 className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Edit Platform Profile: {profile.username}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Update profile handle, platform association, and multi-workstation assignments.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 max-h-[calc(90vh-140px)] px-6 py-5">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Platform */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Origin Platform
                  </Label>
                  <Select
                    value={platformId}
                    onValueChange={(val: string | null) => {
                      if (val) setPlatformId(val);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select platform">
                        {platforms.find((p) => p.id === platformId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Profile Username / Handle <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`h-9 text-xs ${fieldErrors.username ? "border-destructive" : ""}`}
                  />
                  {fieldErrors.username && (
                    <p className="text-[11px] text-destructive">{fieldErrors.username}</p>
                  )}
                </div>
              </div>

              {/* Multi-Station Assignment */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Monitor className="size-3.5 text-primary" />
                    Assigned Workstations ({selectedStationIds.length} active)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    Check or uncheck to manage workstations hosting this profile
                  </span>
                </div>

                {stations.length === 0 ? (
                  <div className="p-4 text-center rounded-lg border bg-muted/10 text-xs text-muted-foreground">
                    No active workstations available.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto p-1">
                    {stations.map((stn) => {
                      const isSelected = selectedStationIds.includes(stn.id);
                      return (
                        <div
                          key={stn.id}
                          onClick={() => toggleStation(stn.id)}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-xs"
                              : "bg-card hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleStation(stn.id)}
                              className="size-4"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate text-foreground">
                                {stn.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {stn.code}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] py-0 px-1">
                              Assigned
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Profile Active</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Disabling this profile disables operation on all assigned workstations.
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 border-t gap-2 sm:gap-0 bg-muted/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5 text-xs">
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
