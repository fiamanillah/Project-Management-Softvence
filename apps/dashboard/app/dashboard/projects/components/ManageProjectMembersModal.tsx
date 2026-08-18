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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@workspace/ui/components/tabs";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { UserSearchSelect, type UserItem } from "@/components/user-search-select";
import { TeamSearchSelect, type TeamItem } from "@/components/team-search-select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type {
  ProjectItem,
  ProjectLookups,
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
  Plus,
  Hash,
  Briefcase,
  Clock,
  Sparkles,
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
    systemRole?: string;
    designation?: {
      name?: string;
    };
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
  const [activeTab, setActiveTab] = React.useState<"teams" | "members">("teams");
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>([]);
  const [members, setMembers] = React.useState<MemberDraft[]>([]);
  const [loading, setLoading] = React.useState(false);

  // New team draft
  const [draftTeamId, setDraftTeamId] = React.useState("");
  const [draftTeamObj, setDraftTeamObj] = React.useState<TeamItem | null>(null);

  // New member draft inputs
  const [draftUserId, setDraftUserId] = React.useState("");
  const [draftUserObj, setDraftUserObj] = React.useState<UserItem | null>(null);
  const [draftRoleId, setDraftRoleId] = React.useState("");
  const [draftNote, setDraftNote] = React.useState("");

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

      setDraftTeamId("");
      setDraftTeamObj(null);
      setDraftUserId("");
      setDraftUserObj(null);
      setDraftRoleId(lookups?.assignmentRoles[0]?.id || "");
      setDraftNote("");
      setActiveTab("teams");
    }
  }, [open, project, lookups]);

  if (!project) return null;

  // Team allocation handlers
  const handleAddTeam = () => {
    if (!draftTeamId) {
      toast.error("Please search and select a team first");
      return;
    }
    if (selectedTeamIds.includes(draftTeamId)) {
      toast.error("This team is already allocated to this project");
      return;
    }

    setSelectedTeamIds((prev) => [...prev, draftTeamId]);
    toast.success(`Team allocated to project`);
    setDraftTeamId("");
    setDraftTeamObj(null);
  };

  const handleRemoveTeam = (teamId: string) => {
    setSelectedTeamIds((prev) => prev.filter((id) => id !== teamId));
  };

  // Member assignment handlers
  const handleAddMember = () => {
    if (!draftUserId) {
      toast.error("Please search and select a user to assign");
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
              systemRole: draftUserObj.systemRole,
              designation: draftUserObj.designation,
            }
          : undefined,
        roleId: draftRoleId,
        note: draftNote.trim() || null,
      },
    ]);

    toast.success("Member added to project roster");
    setDraftUserId("");
    setDraftUserObj(null);
    setDraftNote("");
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

      toast.success("Project teams and roster successfully updated");
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
      <DialogContent className="w-[94vw] sm:max-w-2xl md:min-w-[700px] max-h-[92vh] p-0 gap-0 border shadow-2xl rounded-2xl overflow-hidden bg-background flex flex-col">
        {/* MODAL HEADER */}
        <DialogHeader className="p-5 pb-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-2xs">
                <UsersRound className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  Manage Teams & Members
                  <Badge variant="outline" className="font-mono text-xs py-0.5 border-primary/30 text-primary">
                    {project.projectName}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Allocate primary operational teams and assign dedicated staff members
                </DialogDescription>
              </div>
            </div>

            {/* LIVE ROSTER STATS */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
              <Badge variant="secondary" className="gap-1 py-1 px-2.5 bg-muted/60">
                <Building2 className="size-3 text-primary" />
                <span>{selectedTeamIds.length} Teams</span>
              </Badge>
              <Badge variant="secondary" className="gap-1 py-1 px-2.5 bg-muted/60">
                <UserPlus className="size-3 text-purple-500" />
                <span>{members.length} Staff</span>
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* TABS CONTAINER */}
        <Tabs
          value={activeTab}
          onValueChange={(val: string) => setActiveTab(val as "teams" | "members")}
          className="flex-1 flex flex-col min-h-0"
        >
          {/* TAB LIST */}
          <div className="px-5 pt-3 border-b bg-muted/10 shrink-0">
            <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-muted/50 rounded-lg">
              <TabsTrigger value="teams" className="text-xs gap-2 font-semibold">
                <Building2 className="size-3.5" />
                <span>Allocated Teams</span>
                <Badge variant="secondary" className="size-5 p-0 flex items-center justify-center text-[10px] ml-1">
                  {selectedTeamIds.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="members" className="text-xs gap-2 font-semibold">
                <UserPlus className="size-3.5" />
                <span>Assigned Staff Roster</span>
                <Badge variant="secondary" className="size-5 p-0 flex items-center justify-center text-[10px] ml-1">
                  {members.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: ALLOCATED TEAMS */}
          <TabsContent value="teams" className="flex-1 flex flex-col min-h-0 p-5 space-y-4 m-0">
            {/* Search & Add Team Bar */}
            <div className="rounded-xl border bg-card/60 p-3.5 space-y-2 shadow-2xs">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" /> Search & Allocate Team
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <TeamSearchSelect
                    value={draftTeamId}
                    onValueChange={(id, team) => {
                      setDraftTeamId(id);
                      setDraftTeamObj(team);
                    }}
                    teams={lookups?.teams || []}
                    excludeTeamIds={selectedTeamIds}
                    placeholder="Search teams by name or department..."
                    triggerClassName="h-9 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddTeam}
                  disabled={!draftTeamId}
                  className="h-9 text-xs gap-1.5 px-4 shrink-0 shadow-xs"
                >
                  <Plus className="size-3.5" /> Allocate Team
                </Button>
              </div>
            </div>

            {/* List of Allocated Teams */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Allocated Teams List ({selectedTeamIds.length})
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Responsible for project deliverables
                </span>
              </div>

              <ScrollArea className="flex-1 max-h-[320px] rounded-xl border bg-muted/15 p-2.5">
                {selectedTeamIds.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedTeamIds.map((teamId) => {
                      const team = lookups?.teams.find((t) => t.id === teamId);
                      return (
                        <div
                          key={teamId}
                          className="flex items-center justify-between p-3 rounded-xl border bg-card shadow-2xs gap-2 group hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="size-8 rounded-lg border border-primary/20 shrink-0">
                              {team?.avatarUrl && (
                                <AvatarImage
                                  src={team.avatarUrl}
                                  alt={team.name}
                                  className="rounded-lg object-cover"
                                />
                              )}
                              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                                {team?.name ? team.name.slice(0, 2).toUpperCase() : "TM"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">
                                {team?.name || "Allocated Team"}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-0.5">
                                <span>{team?.department?.name || "General Department"}</span>
                                {team?.shift && (
                                  <span className="font-mono opacity-80 flex items-center gap-0.5">
                                    • <Clock className="size-2.5" /> {team.shift}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTeam(teamId)}
                            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            title="Remove Team Allocation"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-2">
                    <div className="mx-auto size-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                      <Building2 className="size-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">No Teams Allocated Yet</p>
                    <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                      Use the search menu above to find and allocate functional delivery teams to this project.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* TAB 2: INDIVIDUAL STAFF ROSTER */}
          <TabsContent value="members" className="flex-1 flex flex-col min-h-0 p-5 space-y-4 m-0">
            {/* Search & Add Member Bar */}
            <div className="rounded-xl border bg-card/60 p-3.5 space-y-2.5 shadow-2xs">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <UserPlus className="size-3.5 text-purple-500" /> Search & Assign Staff Member
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* User Search Select (Name, Email, Employee ID, Role, Designation) */}
                <div className="sm:col-span-5 min-w-0">
                  <UserSearchSelect
                    value={draftUserId}
                    onValueChange={(id, u) => {
                      setDraftUserId(id);
                      setDraftUserObj(u);
                    }}
                    excludeUserIds={members.map((m) => m.userId)}
                    placeholder="Search name, email, employee ID..."
                    triggerClassName="h-9 text-xs"
                  />
                </div>

                {/* Assignment Role Select */}
                <div className="sm:col-span-3 min-w-0">
                  <Select value={draftRoleId} onValueChange={(val: string | null) => setDraftRoleId(val || "")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Role">
                        {lookups?.assignmentRoles.find((r) => r.id === draftRoleId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {lookups?.assignmentRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id} className="text-xs font-medium">
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignment Note */}
                <div className="sm:col-span-2 min-w-0">
                  <Input
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="h-9 text-xs"
                  />
                </div>

                {/* Add Member Button */}
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!draftUserId}
                    className="w-full h-9 text-xs gap-1 shadow-xs"
                  >
                    <Plus className="size-3.5" /> Assign
                  </Button>
                </div>
              </div>
            </div>

            {/* List of Assigned Staff Members */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Assigned Project Roster ({members.length})
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Individual engineers, leads, and contributors
                </span>
              </div>

              <ScrollArea className="flex-1 max-h-[320px] rounded-xl border bg-muted/15 p-2.5">
                {members.length > 0 ? (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3 bg-card rounded-xl border shadow-2xs text-xs gap-3 hover:border-purple-500/30 transition-colors"
                      >
                        {/* User Identity Info */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="size-8 border shrink-0">
                            <AvatarFallback className="text-xs bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold">
                              {member.user?.firstName?.[0] || "U"}
                              {member.user?.lastName?.[0] || ""}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-foreground truncate">
                                {member.user ? `${member.user.firstName} ${member.user.lastName}` : "User"}
                              </p>
                              {member.user?.employeeId && (
                                <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 h-4 border-muted-foreground/30">
                                  #{member.user.employeeId}
                                </Badge>
                              )}
                              {member.user?.designation?.name && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground">
                                  {member.user.designation.name}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono truncate pt-0.5">
                              {member.user?.email}
                              {member.note && <span className="italic ml-1 text-foreground">· "{member.note}"</span>}
                            </p>
                          </div>
                        </div>

                        {/* Inline Role Selector & Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={member.roleId}
                            onValueChange={(val: string | null) => val && handleRoleChange(member.userId, val)}
                          >
                            <SelectTrigger className="h-8 text-xs w-32 font-medium">
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
                            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remove Member"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-2">
                    <div className="mx-auto size-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                      <UserPlus className="size-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">No Individual Staff Assigned</p>
                    <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                      Search and assign developers, QA engineers, and project leads using the search menu above.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* MODAL FOOTER */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground font-mono">
            {selectedTeamIds.length} team(s) • {members.length} member(s) ready to update
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs h-9 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={loading}
              className="text-xs h-9 gap-1.5 w-full sm:w-auto shadow-xs"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              Save Roster Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
