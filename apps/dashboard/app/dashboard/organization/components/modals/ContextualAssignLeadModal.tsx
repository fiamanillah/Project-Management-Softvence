"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@workspace/ui/components/field";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { UserSearchSelect, type UserItem } from "@/components/user-search-select";
import { Loader2, UserCheck, UserX, Trash2, ShieldCheck, Crown, Star } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import type { UnifiedOrgNode, UnifiedOrgLeader, AssignmentRoleItem } from "@workspace/shared";

interface ContextualAssignLeadModalProps {
  node: UnifiedOrgNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ContextualAssignLeadModal({
  node,
  open,
  onOpenChange,
  onSuccess,
}: ContextualAssignLeadModalProps) {
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null);
  const [roleTitle, setRoleTitle] = React.useState("");
  const [isPrimary, setIsPrimary] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [unassigningId, setUnassigningId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [activeLeaders, setActiveLeaders] = React.useState<UnifiedOrgLeader[]>([]);

  const isBranch = node?.type === "BRANCH";
  const isDepartment = node?.type === "DEPARTMENT";
  const isTeam = node?.type === "TEAM";

  // Sync active leaders when node opens
  React.useEffect(() => {
    if (!node) {
      setActiveLeaders([]);
      return;
    }

    if (isTeam) {
      const leads = node.teamLeads || (node.teamLead ? [node.teamLead] : []) || node.managers || [];
      setActiveLeaders(leads);
    } else {
      setActiveLeaders(node.managers || []);
    }
  }, [node, isTeam]);

  const assignedUserIds = React.useMemo(() => {
    return activeLeaders.map((m) => m.userId).filter(Boolean);
  }, [activeLeaders]);

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedUser(null);
    setRoleTitle("");
    setIsPrimary(false);
    setError("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!node || !selectedUserId) return;
    setError("");
    setIsSubmitting(true);

    try {
      if (isBranch) {
        const newMgr = await api.post<any>(`/organization/branches/${node.id}/managers`, {
          userId: selectedUserId,
          roleTitle: roleTitle.trim() || undefined,
          isPrimary,
        });
        toast.success("Branch leadership position assigned successfully!");
        const leaderObj: UnifiedOrgLeader = {
          id: newMgr.id,
          userId: selectedUserId,
          fullName: selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}`.trim() : "Leader",
          email: selectedUser?.email || "",
          avatarUrl: selectedUser?.avatarUrl,
          employeeId: selectedUser?.employeeId,
          systemRole: selectedUser?.systemRole,
          designationName: selectedUser?.designation?.name,
          roleTitle: roleTitle.trim() || "Branch Manager",
          isPrimary,
        };
        setActiveLeaders((prev) => (isPrimary ? [leaderObj, ...prev.map((l) => ({ ...l, isPrimary: false }))] : [leaderObj, ...prev]));
      } else if (isDepartment) {
        const newMgr = await api.post<any>(`/organization/departments/${node.id}/managers`, {
          userId: selectedUserId,
          roleTitle: roleTitle.trim() || undefined,
          isPrimary,
        });
        toast.success("Department leadership position assigned successfully!");
        const leaderObj: UnifiedOrgLeader = {
          id: newMgr.id,
          userId: selectedUserId,
          fullName: selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}`.trim() : "Leader",
          email: selectedUser?.email || "",
          avatarUrl: selectedUser?.avatarUrl,
          employeeId: selectedUser?.employeeId,
          systemRole: selectedUser?.systemRole,
          designationName: selectedUser?.designation?.name,
          roleTitle: roleTitle.trim() || "Department Manager",
          isPrimary,
        };
        setActiveLeaders((prev) => (isPrimary ? [leaderObj, ...prev.map((l) => ({ ...l, isPrimary: false }))] : [leaderObj, ...prev]));
      } else {
        // Team member assignment as lead
        const roles = await api.get<AssignmentRoleItem[]>("/teams/roles");
        const leadRole = roles.find((r) => r.qualifiesForTeamScope) || roles[0];
        if (!leadRole) throw new Error("No team lead assignment role found");

        const newMember = await api.post<any>(`/teams/${node.id}/members`, {
          userId: selectedUserId,
          roleId: leadRole.id,
          note: roleTitle.trim() || undefined,
        });
        toast.success("Team leadership assigned successfully!");
        const leaderObj: UnifiedOrgLeader = {
          id: newMember.id,
          userId: selectedUserId,
          fullName: selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}`.trim() : "Squad Lead",
          email: selectedUser?.email || "",
          avatarUrl: selectedUser?.avatarUrl,
          employeeId: selectedUser?.employeeId,
          systemRole: selectedUser?.systemRole,
          designationName: selectedUser?.designation?.name,
          roleTitle: roleTitle.trim() || leadRole.name || "Squad Lead",
          isPrimary: true,
        };
        setActiveLeaders((prev) => [leaderObj, ...prev]);
      }

      resetForm();
      onSuccess();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to assign leadership");
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async (managerId: string) => {
    if (!node) return;
    setUnassigningId(managerId);

    try {
      if (isBranch) {
        await api.delete(`/organization/branches/${node.id}/managers/${managerId}`);
        toast.success("Branch leadership unassigned successfully!");
      } else if (isDepartment) {
        await api.delete(`/organization/departments/${node.id}/managers/${managerId}`);
        toast.success("Department leadership unassigned successfully!");
      } else {
        await api.delete(`/teams/${node.id}/members/${managerId}`);
        toast.success("Team leadership unassigned successfully!");
      }
      setActiveLeaders((prev) => prev.filter((l) => l.id !== managerId));
      onSuccess();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to unassign leadership"));
    } finally {
      setUnassigningId(null);
    }
  };

  const nodeDefaultRole = isBranch ? "Branch Director" : isDepartment ? "Department Head" : "Squad Lead";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg p-6 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserCheck className="size-5 text-primary" /> Manage Leadership & Leads
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Assign multiple executive leads or operational heads for{" "}
            <span className="font-semibold text-foreground">{node?.name} ({node?.code})</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 flex-1 overflow-y-auto py-2 pr-1">
          {/* Active Leaders Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Leadership ({activeLeaders.length})
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Scope: {node?.code}
              </Badge>
            </div>

            {activeLeaders.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed text-xs text-muted-foreground bg-muted/20">
                <UserX className="size-4 shrink-0 text-muted-foreground/60" />
                <span>No active leaders currently assigned to this unit.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeLeaders.map((mgr) => {
                  const isUnassigning = unassigningId === mgr.id;
                  const displayTitle = mgr.roleTitle || nodeDefaultRole;

                  return (
                    <div
                      key={mgr.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-9 rounded-full border border-primary/20 shrink-0">
                          {mgr.avatarUrl && <AvatarImage src={mgr.avatarUrl} alt={mgr.fullName} />}
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {mgr.fullName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-semibold text-foreground truncate">{mgr.fullName}</p>
                            {mgr.isPrimary ? (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-0.5">
                                <Crown className="size-2.5 text-amber-500" /> Primary Lead
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 text-muted-foreground">
                                {displayTitle}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate font-mono mt-0.5">
                            <span>{mgr.email}</span>
                            {mgr.designationName && (
                              <>
                                <span>&bull;</span>
                                <span className="font-sans text-foreground font-medium">{mgr.designationName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isUnassigning || isSubmitting}
                        onClick={() => handleUnassign(mgr.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 size-8 p-0 shrink-0"
                        title="Unassign Leadership Position"
                      >
                        {isUnassigning ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assign New Leader Form */}
          <form id="assign-lead-form" onSubmit={handleAssign} className="space-y-4 pt-4 border-t">
            <FieldSet>
              <FieldGroup className="space-y-3">
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="leadership-user-search" className="text-xs font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-primary" /> Assign New Leadership Position
                  </FieldLabel>
                  <FieldDescription className="text-[11px] text-muted-foreground mb-1.5">
                    Select a user to grant leadership and administrative scope over this unit.
                  </FieldDescription>

                  <UserSearchSelect
                    id="leadership-user-search"
                    value={selectedUserId}
                    onValueChange={(userId, user) => {
                      setSelectedUserId(userId);
                      setSelectedUser(user);
                      setError("");
                    }}
                    placeholder="Search by user name, email, or designation..."
                    searchPlaceholder="Type name or email..."
                    excludeUserIds={assignedUserIds}
                    disabled={isSubmitting}
                  />

                  {error && <FieldError errors={error} />}
                </Field>

                {/* Optional Leadership Position Title */}
                <Field>
                  <FieldLabel htmlFor="contextual-role-title" className="text-xs font-semibold">
                    Position / Leadership Title (Optional)
                  </FieldLabel>
                  <Input
                    id="contextual-role-title"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder={`e.g. ${nodeDefaultRole}`}
                    className="h-8 text-xs"
                    disabled={isSubmitting}
                  />
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {[nodeDefaultRole, "Co-Lead", "Associate Director", "Operations Lead"].map((title) => (
                      <button
                        type="button"
                        key={title}
                        onClick={() => setRoleTitle(title)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Primary Lead Checkbox (for Branches/Departments) */}
                {!isTeam && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="contextual-is-primary"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      className="size-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="contextual-is-primary" className="text-xs font-medium cursor-pointer select-none flex items-center gap-1">
                      <Star className="size-3 text-amber-500" /> Designate as Primary Unit Lead
                    </label>
                  </div>
                )}
              </FieldGroup>
            </FieldSet>
          </form>
        </div>

        <DialogFooter className="pt-3 border-t gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Close
          </Button>
          <Button
            type="submit"
            form="assign-lead-form"
            size="sm"
            disabled={!selectedUserId || isSubmitting}
            className="gap-1.5"
          >
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
            Assign Leadership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
