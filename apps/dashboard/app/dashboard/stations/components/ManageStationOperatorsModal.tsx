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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { UserSearchSelect, type UserItem } from "@/components/user-search-select";
import { api, handleFormApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  UserPlus,
  Users,
  Trash2,
  Loader2,
  ShieldCheck,
  Clock,
  Briefcase,
  Monitor,
} from "lucide-react";
import type {
  StationItem,
  StationRoleItem,
  StationUserAssignmentItem,
} from "@workspace/shared";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface ManageStationOperatorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: StationItem | null;
  stationRoles: StationRoleItem[];
  onSuccess: () => void;
}

export function ManageStationOperatorsModal({
  open,
  onOpenChange,
  station,
  stationRoles,
  onSuccess,
}: ManageStationOperatorsModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Form State
  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null);
  const [roleId, setRoleId] = React.useState<string>("");
  const [shift, setShift] = React.useState<string>("Day");
  const [note, setNote] = React.useState<string>("");

  const [assignedUsers, setAssignedUsers] = React.useState<
    StationUserAssignmentItem[]
  >([]);

  const fetchFreshStation = React.useCallback(async () => {
    if (!station) return;
    setLoading(true);
    try {
      const res = await api.get<StationItem>(`/stations/${station.id}`);
      const stn = (res as any)?.data !== undefined ? (res as any).data : res;
      setAssignedUsers(stn?.assignedUsers || []);
    } catch (err) {
      console.warn("Failed to fetch fresh station operators:", err);
    } finally {
      setLoading(false);
    }
  }, [station]);

  React.useEffect(() => {
    if (open && station) {
      setSelectedUser(null);
      setShift("Day");
      setNote("");
      if (stationRoles.length > 0 && stationRoles[0]) {
        setRoleId(stationRoles[0].id);
      }
      fetchFreshStation();
    }
  }, [open, station, stationRoles, fetchFreshStation]);

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station || !selectedUser || !roleId) {
      toast.error("Please select a user and assignment role");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/stations/${station.id}/users`, {
        userId: selectedUser.id,
        roleId,
        shift: shift !== "none" ? shift : undefined,
        note: note.trim() || undefined,
      });

      toast.success(
        `User ${selectedUser.firstName || selectedUser.email} assigned to workstation.`
      );
      setSelectedUser(null);
      setNote("");
      await fetchFreshStation();
      onSuccess();
    } catch (err: any) {
      const msg = handleFormApiError(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignUser = async (userId: string, userName: string) => {
    if (!station) return;
    try {
      await api.delete(`/stations/${station.id}/users/${userId}`);
      toast.info(`Operator ${userName} unassigned from workstation.`);
      await fetchFreshStation();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to unassign user");
    }
  };

  if (!station) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full min-w-[min(100vw-2rem,44rem)] sm:min-w-[620px] md:min-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <Users className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Workstation Shift Operators: {station.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Authorize operators to log in and conduct shifts on workstation ({station.code}).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-130px)] px-6 py-5">
          <div className="space-y-6">
            {/* New Assignment Section */}
            <form
              onSubmit={handleAssignUser}
              className="p-4 rounded-xl border bg-muted/30 space-y-3"
            >
              <div className="flex items-center gap-2 pb-2 border-b">
                <UserPlus className="size-4 text-purple-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Assign New Operator
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Team Member</Label>
                <UserSearchSelect
                  value={selectedUser?.id || ""}
                  onValueChange={(_userId, user) => setSelectedUser(user)}
                  placeholder="Search by name, email, or employee ID..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Station Role</Label>
                  <Select
                    value={roleId}
                    onValueChange={(val: string | null) => {
                      if (val) setRoleId(val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role">
                        {stationRoles.find((r) => r.id === roleId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {stationRoles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} {r.canManageProfiles ? "(Manage Profiles)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Assigned Shift</Label>
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
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Note / Desk Directive</Label>
                <Input
                  placeholder="e.g. Lead morning shift coordinator..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !selectedUser}
                  className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {submitting && <Loader2 className="size-3.5 animate-spin" />}
                  Assign Operator
                </Button>
              </div>
            </form>

            {/* Active Operators Roster */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Active Assigned Operators ({assignedUsers.length})
                </span>
              </div>

              {loading ? (
                <div className="py-8 text-center">
                  <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : assignedUsers.length === 0 ? (
                <div className="py-6 text-center border rounded-xl bg-card">
                  <p className="text-xs text-muted-foreground">
                    No operators are currently assigned to this workstation.
                  </p>
                </div>
              ) : (
                <div className="divide-y border rounded-xl bg-card overflow-hidden">
                  {assignedUsers.map((au) => {
                    const displayName =
                      au.user?.firstName || au.user?.lastName
                        ? `${au.user?.firstName || ""} ${au.user?.lastName || ""}`.trim()
                        : au.user?.email || "Unknown User";

                    return (
                      <div
                        key={au.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 border">
                            <AvatarImage src={au.user?.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs font-bold">
                              {displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {displayName}
                              </span>
                              {au.role && (
                                <Badge variant="secondary" className="text-[10px] py-0">
                                  {au.role.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>{au.user?.email}</span>
                              {au.shift && (
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3 text-muted-foreground" />
                                  {au.shift} Shift
                                </span>
                              )}
                            </div>
                            {au.note && (
                              <p className="text-[11px] text-muted-foreground italic mt-0.5">
                                "{au.note}"
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleUnassignUser(au.userId, displayName)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
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
