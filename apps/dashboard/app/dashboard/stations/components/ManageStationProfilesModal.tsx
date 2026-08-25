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
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
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
  Briefcase,
  Plus,
  Trash2,
  Loader2,
  ArrowRightLeft,
  Crown,
  Clock,
  FolderKanban,
} from "lucide-react";
import type {
  StationItem,
  StationProfileAssignmentItem,
} from "@workspace/shared";
import { useStationSession } from "@/lib/station/StationContext";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import Link from "next/link";

interface ManageStationProfilesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: StationItem | null;
  onTriggerReassign?: (profile: StationProfileAssignmentItem) => void;
  onSuccess: () => void;
}

interface AvailableProfileItem {
  id: string;
  username: string;
  platform?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export function ManageStationProfilesModal({
  open,
  onOpenChange,
  station,
  onTriggerReassign,
  onSuccess,
}: ManageStationProfilesModalProps) {
  const { refreshSession } = useStationSession();
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [availableProfiles, setAvailableProfiles] = React.useState<
    AvailableProfileItem[]
  >([]);
  const [platforms, setPlatforms] = React.useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>("");
  const [isPrimary, setIsPrimary] = React.useState(false);
  const [shift, setShift] = React.useState("Day");
  const [note, setNote] = React.useState("");

  // Quick Create Inline State
  const [showQuickCreate, setShowQuickCreate] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState("");
  const [newPlatformId, setNewPlatformId] = React.useState("");
  const [creatingProfile, setCreatingProfile] = React.useState(false);

  const [activeStationProfiles, setActiveStationProfiles] = React.useState<
    StationProfileAssignmentItem[]
  >([]);

  const fetchLookupsAndStation = React.useCallback(async () => {
    if (!station) return;
    setLoading(true);
    try {
      const [stationRes, lookupsRes] = await Promise.all([
        api.get<StationItem>(`/stations/${station.id}`),
        api.get<any>("/projects/lookups"),
      ]);

      const stn = (stationRes as any)?.data !== undefined ? (stationRes as any).data : stationRes;
      setActiveStationProfiles(stn?.activeProfiles || []);

      const lookups = (lookupsRes as any)?.data !== undefined ? (lookupsRes as any).data : lookupsRes;
      if (lookups?.profiles && Array.isArray(lookups.profiles)) {
        setAvailableProfiles(lookups.profiles);
      }
      if (lookups?.platforms && Array.isArray(lookups.platforms)) {
        setPlatforms(lookups.platforms);
        if (lookups.platforms.length > 0 && !newPlatformId) {
          setNewPlatformId(lookups.platforms[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch station profiles data:", err);
    } finally {
      setLoading(false);
    }
  }, [station, newPlatformId]);

  React.useEffect(() => {
    if (open && station) {
      setSelectedProfileId("");
      setIsPrimary(false);
      setShift("Day");
      setNote("");
      setShowQuickCreate(false);
      setNewUsername("");
      fetchLookupsAndStation();
    }
  }, [open, station, fetchLookupsAndStation]);

  const handleQuickCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPlatformId || !station) {
      toast.error("Please enter a username and choose a platform");
      return;
    }

    setCreatingProfile(true);
    try {
      await api.post("/stations/profiles", {
        username: newUsername.trim(),
        platformId: newPlatformId,
        isActive: true,
        stationIds: [station.id],
      });

      toast.success(`Platform profile "${newUsername.trim()}" created and assigned.`);
      setNewUsername("");
      setShowQuickCreate(false);
      await fetchLookupsAndStation();
      await refreshSession();
      onSuccess();
    } catch (err: any) {
      const msg = handleFormApiError(err);
      toast.error(msg);
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleAssignProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station || !selectedProfileId) {
      toast.error("Please select a platform profile to assign");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/stations/${station.id}/profiles`, {
        profileId: selectedProfileId,
        isPrimary,
        shift: shift !== "none" ? shift : undefined,
        note: note.trim() || undefined,
      });

      toast.success("Platform profile assigned to workstation successfully.");
      setSelectedProfileId("");
      setNote("");
      setIsPrimary(false);
      await fetchLookupsAndStation();
      await refreshSession();
      onSuccess();
    } catch (err: any) {
      const msg = handleFormApiError(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignProfile = async (profileId: string, username: string) => {
    if (!station) return;
    try {
      await api.delete(`/stations/${station.id}/profiles/${profileId}`);
      toast.info(`Profile ${username} unassigned from workstation.`);
      await fetchLookupsAndStation();
      await refreshSession();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to unassign profile");
    }
  };

  if (!station) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full min-w-[min(100vw-2rem,44rem)] sm:min-w-[620px] md:min-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Briefcase className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Hosted Platform Profiles: {station.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Allocate client marketplace accounts (Upwork, Fiverr, Direct) to this workstation ({station.code}).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-130px)] px-6 py-5">
          <div className="space-y-6">
            {/* New Profile Assignment / Creation Form */}
            <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <Plus className="size-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {showQuickCreate ? "Create New Profile & Assign" : "Assign Platform Profile"}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuickCreate(!showQuickCreate)}
                  className="h-7 text-xs gap-1"
                >
                  {showQuickCreate ? "Select Existing" : "+ New Profile"}
                </Button>
              </div>

              {showQuickCreate ? (
                <form onSubmit={handleQuickCreateProfile} className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Platform</Label>
                      <Select
                        value={newPlatformId}
                        onValueChange={(val: string | null) => {
                          if (val) setNewPlatformId(val);
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select Platform">
                            {platforms.find((p) => p.id === newPlatformId)?.name}
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

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Profile Username / Handle</Label>
                      <Input
                        placeholder="e.g. Sales_Upwork_01"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="h-9 text-xs"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQuickCreate(false)}
                      className="text-xs h-8"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={creatingProfile || !newUsername.trim()}
                      className="gap-1.5 text-xs h-8"
                    >
                      {creatingProfile && <Loader2 className="size-3.5 animate-spin" />}
                      Create & Assign to Workstation
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAssignProfile} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Select Profile</Label>
                    <Select
                      value={selectedProfileId}
                      onValueChange={(val: string | null) => {
                        if (val) setSelectedProfileId(val);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform profile...">
                          {(() => {
                            const sel = availableProfiles.find((p) => p.id === selectedProfileId);
                            return sel ? `${sel.username} (${sel.platform?.name || "Platform"})` : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableProfiles.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No profiles found
                          </SelectItem>
                        ) : (
                          availableProfiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.username} ({p.platform?.name || "Platform"})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Shift Timing</Label>
                      <Select
                        value={shift}
                        onValueChange={(val: string | null) => {
                          if (val) setShift(val);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift">
                            {shift === "Day"
                              ? "Day Shift"
                              : shift === "Night"
                              ? "Night Shift"
                              : shift === "Morning"
                              ? "Morning Rotation"
                              : shift === "Evening"
                              ? "Evening Rotation"
                              : shift === "Rotational"
                              ? "Rotational / Flexible"
                              : shift === "none"
                              ? "Not Specified"
                              : shift}
                          </SelectValue>
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

                    <div className="flex items-center justify-between p-2 rounded-lg border bg-background">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-semibold">Primary Profile</Label>
                        <p className="text-[10px] text-muted-foreground">
                          Mark as main desk account
                        </p>
                      </div>
                      <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Assignment Note</Label>
                    <Input
                      placeholder="e.g. Primary profile for US outbound sales..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submitting || !selectedProfileId || selectedProfileId === "none"}
                      className="gap-1.5"
                    >
                      {submitting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      Assign to Workstation
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Existing Assigned Profiles List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Active Station Profiles ({activeStationProfiles.length})
                </span>
              </div>

              {activeStationProfiles.length === 0 ? (
                <div className="p-8 text-center border rounded-xl bg-muted/10 space-y-2">
                  <Briefcase className="size-8 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-xs font-medium text-foreground">
                    No platform accounts assigned
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    Assign a profile above so operators on this desk can handle incoming messages and leads.
                  </p>
                </div>
              ) : (
                <div className="divide-y border rounded-xl bg-card overflow-hidden">
                  {activeStationProfiles.map((ap) => {
                    const username = ap.profile?.username || "Unknown Profile";
                    const platformName = ap.profile?.platform?.name || "Marketplace";
                    const projectCount = ap.profile?._count?.projects ?? 0;

                    return (
                      <div
                        key={ap.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            <Briefcase className="size-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {username}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0">
                                {platformName}
                              </Badge>
                              {ap.isPrimary && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] py-0 gap-1">
                                  <Crown className="size-2.5" />
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {ap.shift && (
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3 text-muted-foreground" />
                                  {ap.shift} Shift
                                </span>
                              )}
                              <Link
                                href={`/dashboard/projects?profileId=${ap.profileId}`}
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                <FolderKanban className="size-3" />
                                {projectCount} projects
                              </Link>
                            </div>
                            {ap.note && (
                              <p className="text-[11px] text-muted-foreground italic mt-0.5">
                                "{ap.note}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onTriggerReassign && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => {
                                onOpenChange(false);
                                onTriggerReassign(ap);
                              }}
                            >
                              <ArrowRightLeft className="size-3.5" />
                              Transfer
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleUnassignProfile(ap.profileId, username)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
