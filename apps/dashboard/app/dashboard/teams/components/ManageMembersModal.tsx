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
import { Label } from "@workspace/ui/components/label";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { UserSearchSelect, type UserItem } from "@/components/user-search-select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { TeamItem, TeamMemberItem, AssignmentRoleItem } from "@workspace/shared";
import {
  UserPlus,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
  Calendar,
  Crown,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Briefcase,
  Info,
} from "lucide-react";

interface ManageMembersModalProps {
  team: TeamItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ManageMembersModal({
  team,
  open,
  onOpenChange,
  onSuccess,
}: ManageMembersModalProps) {
  const [activeTab, setActiveTab] = React.useState<"active" | "history">("active");
  const [members, setMembers] = React.useState<TeamMemberItem[]>([]);
  const [roles, setRoles] = React.useState<AssignmentRoleItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Add Member State
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [selectedUserObj, setSelectedUserObj] = React.useState<UserItem | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Search & Filter State inside modal
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  // Pagination State for Active Roster
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 6;

  // Pagination State for Past History
  const [historyPage, setHistoryPage] = React.useState(1);
  const historyPageSize = 6;

  // Inline role update & removal trackers
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null);

  const fetchTeamMembersAndRoles = React.useCallback(async () => {
    if (!team) return;
    setLoading(true);
    try {
      const [membersRes, rolesRes] = await Promise.all([
        api.get(`/teams/${team.id}/members`),
        api.get("/teams/roles"),
      ]);
      setMembers(membersRes || []);
      setRoles(rolesRes || []);
      if (rolesRes && rolesRes.length > 0 && !selectedRole) {
        // Default to a member role or first role
        const defaultRole = rolesRes.find((r: any) => !r.qualifiesForTeamScope) || rolesRes[0];
        setSelectedRole(defaultRole.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [team, selectedRole]);

  React.useEffect(() => {
    if (open && team) {
      fetchTeamMembersAndRoles();
      setSelectedUserId("");
      setSelectedUserObj(null);
      setNote("");
      setSearchQuery("");
      setRoleFilter("all");
      setCurrentPage(1);
      setHistoryPage(1);
    }
  }, [open, team, fetchTeamMembersAndRoles]);

  if (!team) return null;

  const activeMembers = members.filter((m) => !m.leftAt);
  const pastMembers = members.filter((m) => Boolean(m.leftAt));
  const activeUserIds = activeMembers.map((m) => m.userId);

  // Filter Active Members
  const filteredActiveMembers = activeMembers.filter((member) => {
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${member.user.firstName || ""} ${member.user.lastName || ""}`.toLowerCase();
    const email = (member.user.email || "").toLowerCase();
    const empId = (member.user.employeeId || "").toLowerCase();
    const roleName = (member.role.name || "").toLowerCase();
    const desigName = (member.user.designation?.name || "").toLowerCase();
    const desigDept = (member.user.designation?.department?.name || "").toLowerCase();
    const memberNote = (member.note || "").toLowerCase();

    const matchesSearch =
      !q ||
      fullName.includes(q) ||
      email.includes(q) ||
      empId.includes(q) ||
      roleName.includes(q) ||
      desigName.includes(q) ||
      desigDept.includes(q) ||
      memberNote.includes(q);

    const matchesRole =
      roleFilter === "all"
        ? true
        : roleFilter === "leads"
          ? member.role.qualifiesForTeamScope
          : member.roleId === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Filter Past Members
  const filteredPastMembers = pastMembers.filter((member) => {
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${member.user.firstName || ""} ${member.user.lastName || ""}`.toLowerCase();
    const email = (member.user.email || "").toLowerCase();
    const empId = (member.user.employeeId || "").toLowerCase();
    const roleName = (member.role.name || "").toLowerCase();

    return !q || fullName.includes(q) || email.includes(q) || empId.includes(q) || roleName.includes(q);
  });

  // Active Members Pagination
  const totalActivePages = Math.max(1, Math.ceil(filteredActiveMembers.length / pageSize));
  const paginatedActiveMembers = filteredActiveMembers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // History Pagination
  const totalHistoryPages = Math.max(1, Math.ceil(filteredPastMembers.length / historyPageSize));
  const paginatedPastMembers = filteredPastMembers.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize,
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("Please select a user to add.");
      return;
    }
    if (!selectedRole) {
      toast.error("Please select an assignment role.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/teams/${team.id}/members`, {
        userId: selectedUserId,
        roleId: selectedRole,
        note: note.trim() || undefined,
      });

      toast.success("Team member added successfully.");
      setSelectedUserId("");
      setSelectedUserObj(null);
      setNote("");
      fetchTeamMembersAndRoles();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to add team member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRoleId: string) => {
    setUpdatingMemberId(memberId);
    try {
      await api.patch(`/teams/${team.id}/members/${memberId}`, {
        roleId: newRoleId,
      });
      toast.success("Team member role updated.");
      fetchTeamMembersAndRoles();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update member role.");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMemberId(memberId);
    try {
      await api.delete(`/teams/${team.id}/members/${memberId}`);
      toast.success("Team member removed from active roster.");
      fetchTeamMembersAndRoles();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove team member.");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getInitials = (first?: string, last?: string) => {
    return `${(first?.[0] || "").toUpperCase()}${(last?.[0] || "").toUpperCase()}` || "U";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl min-w-[min(100vw-2rem,720px)] sm:min-w-[850px] lg:min-w-[960px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Users className="size-5 text-primary" /> Manage Team Roster & Members
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>Team: <strong className="text-foreground">{team.name}</strong></span>
                <span>&bull;</span>
                <span>Department: <strong className="text-foreground">{team.department.name} ({team.department.code})</strong></span>
                {team.shift && (
                  <>
                    <span>&bull;</span>
                    <Badge variant="outline" className="text-[10px] py-0">{team.shift} Shift</Badge>
                  </>
                )}
                <span>&bull;</span>
                <span>Active: <strong className="text-foreground">{activeMembers.length}</strong></span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add New Member Section */}
          <form
            onSubmit={handleAddMember}
            className="rounded-xl border bg-card/60 backdrop-blur-xs p-4.5 space-y-4 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <UserPlus className="size-4 text-primary" />
                <span>Add Team Member</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Assign engineers, leads, and members to this team
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
              {/* User Search & Select */}
              <div className="sm:col-span-5 space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <span>User</span>
                  <span className="text-destructive">*</span>
                </Label>
                <UserSearchSelect
                  value={selectedUserId}
                  onValueChange={(id, user) => {
                    setSelectedUserId(id);
                    setSelectedUserObj(user);
                  }}
                  excludeUserIds={activeUserIds}
                  placeholder="Search user by name, email, employee ID..."
                  triggerClassName="h-9 text-xs"
                />
              </div>

              {/* Assignment Role Select */}
              <div className="sm:col-span-4 space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <span>Team Assignment Role</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedRole}
                  onValueChange={(val: string | null) => setSelectedRole(val || "")}
                >
                  <SelectTrigger className="h-9 text-xs w-full">
                    <SelectValue placeholder="Select role...">
                      {roles.find((r) => r.id === selectedRole)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          {r.qualifiesForTeamScope && <Crown className="size-3 text-amber-500" />}
                          <span>{r.name}</span>
                          {r.qualifiesForTeamScope && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">(Lead)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-3">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !selectedUserId || !selectedRole}
                  className="w-full h-9 text-xs gap-1.5 font-medium shadow-2xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-3.5" />
                      <span>Add to Team</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Optional Note & Selected User Details Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
              <div className="sm:col-span-7 space-y-1">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional assignment note (e.g. Primary backend lead, assigned for Q3 deliverables)..."
                  className="h-8 text-xs bg-background/80"
                  maxLength={255}
                />
              </div>

              {selectedUserObj && (
                <div className="sm:col-span-5 flex items-center gap-2 text-xs bg-muted/40 rounded-md px-2.5 py-1.5 border">
                  <Info className="size-3.5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-foreground">Designation: </span>
                    <span className="text-muted-foreground">
                      {selectedUserObj.designation?.name || "No Designation Assigned"}
                    </span>
                    {selectedUserObj.designation?.department?.name && (
                      <span className="text-[10px] text-muted-foreground/80 font-mono ml-1">
                        ({selectedUserObj.designation.department.code})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Members List Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as any);
              setCurrentPage(1);
              setHistoryPage(1);
            }}
            className="w-full space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
              <TabsList className="grid grid-cols-2 w-full sm:w-[320px]">
                <TabsTrigger value="active" className="text-xs gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  <span>Active Roster ({activeMembers.length})</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>Past History ({pastMembers.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Search & Filter Controls */}
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-60">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                      setHistoryPage(1);
                    }}
                    placeholder="Search roster..."
                    className="h-8 pl-8 text-xs bg-card"
                  />
                </div>

                {activeTab === "active" && (
                  <Select
                    value={roleFilter}
                    onValueChange={(val: string | null) => {
                      setRoleFilter(val || "all");
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-[130px] bg-card">
                      <SelectValue placeholder="All Roles">
                        {roleFilter === "all"
                          ? "All Roles"
                          : roleFilter === "leads"
                            ? "Team Leads"
                            : roles.find((r) => r.id === roleFilter)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                      <SelectItem value="leads" className="text-xs">
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Crown className="size-3" /> Team Leads
                        </div>
                      </SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Tab 1: Active Roster */}
            <TabsContent value="active" className="mt-0 space-y-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-xs text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span>Loading team roster...</span>
                </div>
              ) : filteredActiveMembers.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed text-xs text-muted-foreground space-y-2 bg-muted/10">
                  <Users className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">
                    {searchQuery || roleFilter !== "all"
                      ? "No matching team members found"
                      : "No active members in this team"}
                  </p>
                  <p className="max-w-md mx-auto text-muted-foreground">
                    {searchQuery || roleFilter !== "all"
                      ? "Try adjusting your search query or filter options."
                      : "Use the form above to assign developers, leads, and specialists to this team."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                          <TableHead className="w-[280px]">Member</TableHead>
                          <TableHead>Designation & Department</TableHead>
                          <TableHead>Team Role</TableHead>
                          <TableHead>Joined & Notes</TableHead>
                          <TableHead className="w-[80px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedActiveMembers.map((member) => (
                          <TableRow key={member.id} className="text-xs hover:bg-muted/20 transition-colors">
                            {/* Member Identity */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="size-8.5 border shadow-2xs">
                                  <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                                    {getInitials(member.user.firstName, member.user.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-foreground">
                                      {member.user.firstName} {member.user.lastName}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      ({member.user.employeeId})
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {member.user.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Designation & Department */}
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {member.user.designation ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 font-normal bg-background">
                                      <Briefcase className="size-3 text-primary mr-1" />
                                      {member.user.designation.name}
                                    </Badge>
                                    {member.user.designation.department && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                                        {member.user.designation.department.code}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] text-muted-foreground italic w-fit">
                                    No Designation Assigned
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* Team Assignment Role (Interactive Select) */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={member.roleId}
                                  onValueChange={(newRoleId: string | null) => {
                                    if (newRoleId) handleRoleChange(member.id, newRoleId);
                                  }}
                                  disabled={updatingMemberId === member.id}
                                >
                                  <SelectTrigger className="h-7.5 text-xs w-[145px] bg-background">
                                    <SelectValue>
                                      {(() => {
                                        const currentRole = roles.find((r) => r.id === member.roleId) || member.role;
                                        return (
                                          <div className="flex items-center gap-1.5 truncate">
                                            {currentRole?.qualifiesForTeamScope && (
                                              <Crown className="size-3 text-amber-500 shrink-0" />
                                            )}
                                            <span className="truncate">{currentRole?.name || "Select Role"}</span>
                                          </div>
                                        );
                                      })()}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles.map((r) => (
                                      <SelectItem key={r.id} value={r.id} className="text-xs">
                                        <div className="flex items-center gap-1.5">
                                          {r.qualifiesForTeamScope && (
                                            <Crown className="size-3 text-amber-500" />
                                          )}
                                          <span>{r.name}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {member.role.qualifiesForTeamScope && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-0.5">
                                        <Crown className="size-2.5" /> Lead
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      This role qualifies for team leadership scope
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>

                            {/* Joined Date & Notes */}
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="size-3" />
                                  {new Date(member.joinedAt).toLocaleDateString()}
                                </span>
                                {member.note && (
                                  <p className="text-[10px] text-foreground/80 italic line-clamp-1" title={member.note}>
                                    "{member.note}"
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={removingMemberId === member.id}
                                className="size-7.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Remove from team"
                              >
                                {removingMemberId === member.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3.5" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Active Roster Pagination Bar */}
                  {filteredActiveMembers.length > pageSize && (
                    <div className="flex items-center justify-between pt-2 px-1 text-xs text-muted-foreground">
                      <span>
                        Showing {(currentPage - 1) * pageSize + 1} to{" "}
                        {Math.min(currentPage * pageSize, filteredActiveMembers.length)} of{" "}
                        {filteredActiveMembers.length} members
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronsLeft className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="size-3.5" />
                        </Button>
                        <span className="text-xs px-2 font-medium">
                          Page {currentPage} of {totalActivePages}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => setCurrentPage((p) => Math.min(totalActivePages, p + 1))}
                          disabled={currentPage === totalActivePages}
                        >
                          <ChevronRight className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => setCurrentPage(totalActivePages)}
                          disabled={currentPage === totalActivePages}
                        >
                          <ChevronsRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Past History */}
            <TabsContent value="history" className="mt-0 space-y-4">
              {filteredPastMembers.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed text-xs text-muted-foreground bg-muted/10">
                  <Clock className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-semibold text-foreground">No Historical Member Records</p>
                  <p className="max-w-md mx-auto text-muted-foreground">
                    When members are removed from this team, their assignment history, tenure, and notes are archived here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                          <TableHead className="w-[280px]">Member</TableHead>
                          <TableHead>Previous Role</TableHead>
                          <TableHead>Tenure Period</TableHead>
                          <TableHead>Historical Note</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPastMembers.map((member) => (
                          <TableRow key={member.id} className="text-xs opacity-80 hover:opacity-100 transition-opacity">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="size-8 border grayscale">
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(member.user.firstName, member.user.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-foreground">
                                    {member.user.firstName} {member.user.lastName}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {member.user.email} &bull; {member.user.employeeId}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className="text-[11px] font-normal">
                                {member.role.name}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-col text-[11px] text-muted-foreground">
                                <span>Joined: {new Date(member.joinedAt).toLocaleDateString()}</span>
                                <span>Left: {member.leftAt ? new Date(member.leftAt).toLocaleDateString() : "—"}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="text-[11px] text-muted-foreground italic">
                                {member.note || "No note recorded"}
                              </span>
                            </TableCell>

                            <TableCell className="text-right">
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                Past Member
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* History Pagination Bar */}
                  {filteredPastMembers.length > historyPageSize && (
                    <div className="flex items-center justify-between pt-2 px-1 text-xs text-muted-foreground">
                      <span>
                        Showing {(historyPage - 1) * historyPageSize + 1} to{" "}
                        {Math.min(historyPage * historyPageSize, filteredPastMembers.length)} of{" "}
                        {filteredPastMembers.length} records
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => setHistoryPage(1)}
                          disabled={historyPage === 1}
                        >
                          <ChevronsLeft className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                        >
                          <ChevronLeft className="size-3.5" />
                        </Button>
                        <span className="text-xs px-2 font-medium">
                          Page {historyPage} of {totalHistoryPages}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                          disabled={historyPage === totalHistoryPages}
                        >
                          <ChevronRight className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => setHistoryPage(totalHistoryPages)}
                          disabled={historyPage === totalHistoryPages}
                        >
                          <ChevronsRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
