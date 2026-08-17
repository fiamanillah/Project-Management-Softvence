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
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { UserSearchSelect, type UserItem } from "@/components/user-search-select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type {
  ProjectItem,
  ProjectLookups,
  ProjectDetailItem,
} from "@workspace/shared";
import {
  UsersRound,
  Building2,
  UserPlus,
  Trash2,
  Loader2,
  Shield,
  Layers,
  CheckCircle2,
} from "lucide-react";

interface ManageProjectMembersModalProps {
  project: ProjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: ProjectLookups | null;
  onSuccess: () => void;
}

interface MemberDraft {
  userId: string;
  user?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  roleId: string;
  note?: string | null;
}

export function ManageProjectMembersModal({
  project,
  open,
  onOpenChange,
  lookups,
  onSuccess,
}: ManageProjectMembersModalProps) {
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>([]);
  const [members, setMembers] = React.useState<MemberDraft[]>([]);
  const [loading, setLoading] = React.useState(false);

  // New member draft inputs
  const [draftUserId, setDraftUserId] = React.useState("");
  const [draftUserObj, setDraftUserObj] = React.useState<UserItem | null>(null);
  const [draftRoleId, setDraftRoleId] = React.useState("");

  const caps = project?._capabilities;

  React.useEffect(() => {
    if (open && project) {
      // Load current active team IDs
      const currentTeamIds = project.teamAssignments
        ? project.teamAssignments.filter((ta) => !ta.unassignedAt).map((ta) => ta.teamId)
        : [];
      setSelectedTeamIds(currentTeamIds);

      // Load current active user members
      const currentMembers: MemberDraft[] = project.userAssignments
        ? project.userAssignments
            .filter((ua) => !ua.unassignedAt)
            .map((ua) => ({
              userId: ua.userId,
              user: ua.user,
              roleId: ua.roleId,
              note: ua.note,
            }))
        : [];
      setMembers(currentMembers);

      setDraftUserId("");
      setDraftUserObj(null);
      setDraftRoleId(lookups?.assignmentRoles[0]?.id || "");
    }
  }, [open, project, lookups]);

  if (!project) return null;

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  };

  const handleAddMember = () => {
    if (!draftUserId) {
      toast.error("Please select a user to assign");
      return;
    }
    if (!draftRoleId) {
      toast.error("Please select an assignment role");
      return;
    }
    if (members.some((m) => m.userId === draftUserId)) {
      toast.error("This user is already assigned to this project");
      return;
    }

    setMembers((prev) => [
      ...prev,
      {
        userId: draftUserId,
        user: draftUserObj
          ? {
              id: draftUserObj.id,
              employeeId: draftUserObj.employeeId || "",
              firstName: draftUserObj.firstName || "",
              lastName: draftUserObj.lastName || "",
              email: draftUserObj.email,
            }
          : undefined,
        roleId: draftRoleId,
      },
    ]);

    setDraftUserId("");
    setDraftUserObj(null);
  };

  const handleRemoveMember = (userId: string) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const handleRoleChange = (userId: string, newRoleId: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, roleId: newRoleId } : m)),
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Save team allocations if user has reassignment permission
      if (caps?.canReassign) {
        await api.post(`/projects/${project.id}/teams`, { teamIds: selectedTeamIds });
      }

      // 2. Save member assignments if user has manage_members permission
      if (caps?.canManageMembers) {
        await api.post(`/projects/${project.id}/members`, {
          members: members.map((m) => ({
            userId: m.userId,
            roleId: m.roleId,
            note: m.note,
          })),
        });
      }

      toast.success("Project team and member roster updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update roster");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <UsersRound className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Manage Teams & Members</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Allocate project teams and assign individual engineers and leads
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* SECTION 1: TEAM ALLOCATION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" /> Allocated Teams
              </h4>
              <span className="text-[11px] text-muted-foreground">
                {selectedTeamIds.length} team(s) selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-muted/20 rounded-lg border">
              {lookups?.teams.map((team) => {
                const isSelected = selectedTeamIds.includes(team.id);
                return (
                  <button
                    type="button"
                    key={team.id}
                    onClick={() => handleToggleTeam(team.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-semibold"
                        : "bg-card hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <UsersRound className="size-3.5 shrink-0" />
                      <div className="truncate">
                        <p className="truncate">{team.name}</p>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          {team.department?.name}
                        </p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: INDIVIDUAL MEMBER ASSIGNMENTS */}
          <div className="space-y-3.5 pt-2 border-t">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UserPlus className="size-3.5 text-purple-500" /> Individual Member Assignments
            </h4>

            {/* Add member input row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-muted/30 p-3 rounded-xl border">
              <div className="sm:col-span-6 space-y-1">
                <Label className="text-xs">Select User</Label>
                <UserSearchSelect
                  value={draftUserId}
                  onValueChange={(id, u) => {
                    setDraftUserId(id);
                    setDraftUserObj(u);
                  }}
                  excludeUserIds={members.map((m) => m.userId)}
                  placeholder="Search user by name or email..."
                  triggerClassName="h-9 text-xs"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <Label className="text-xs">Assignment Role</Label>
                <Select value={draftRoleId} onValueChange={(val: string | null) => setDraftRoleId(val || "")}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Role">
                      {lookups?.assignmentRoles.find((role) => role.id === draftRoleId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {lookups?.assignmentRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id} className="text-xs">
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Button
                  type="button"
                  onClick={handleAddMember}
                  className="w-full h-9 text-xs gap-1"
                >
                  <UserPlus className="size-3.5" /> Add
                </Button>
              </div>
            </div>

            {/* Active Members Roster */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Active Project Roster ({members.length})
              </Label>
              {members.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto p-1 bg-muted/20 rounded-lg border">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-2.5 bg-card rounded-lg border text-xs gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-7 border">
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                            {member.user?.firstName?.[0] || "U"}
                            {member.user?.lastName?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <p className="font-medium text-foreground truncate">
                            {member.user ? `${member.user.firstName} ${member.user.lastName}` : "User"}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {member.user?.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={member.roleId}
                          onValueChange={(val: string | null) => val && handleRoleChange(member.userId, val)}
                        >
                          <SelectTrigger className="h-7 text-[11px] w-32">
                            <SelectValue>
                              {lookups?.assignmentRoles.find((role) => role.id === member.roleId)?.name}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {lookups?.assignmentRoles.map((role) => (
                              <SelectItem key={role.id} value={role.id} className="text-xs">
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.userId)}
                          className="size-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic p-3 text-center bg-muted/10 rounded-lg border">
                  No individual users assigned yet.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Saving Roster...
              </>
            ) : (
              "Save Roster"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
