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
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@workspace/ui/components/field";
import { Badge } from "@workspace/ui/components/badge";
import { UserSearchSelect, type UserItem } from "@/components/user-search-select";
import { Loader2, UserCheck, UserX, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import type { UnifiedOrgNode } from "@workspace/shared";

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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [unassigningId, setUnassigningId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");

  const isBranch = node?.type === "BRANCH";
  const isDepartment = node?.type === "DEPARTMENT";
  const isTeam = node?.type === "TEAM";

  const activeManagers = node?.managers || [];
  const assignedUserIds = activeManagers.map((m) => m.userId);

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedUser(null);
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
        await api.post(`/organization/branches/${node.id}/managers`, { userId: selectedUserId });
        toast.success("Branch manager assigned successfully!");
      } else if (isDepartment) {
        await api.post(`/organization/departments/${node.id}/managers`, { userId: selectedUserId });
        toast.success("Department manager assigned successfully!");
      } else {
        // Team member assignment
        await api.post(`/organization/teams/${node.id}/members`, { userId: selectedUserId });
        toast.success("Team member assigned successfully!");
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
        toast.success("Branch manager unassigned successfully!");
      } else if (isDepartment) {
        await api.delete(`/organization/departments/${node.id}/managers/${managerId}`);
        toast.success("Department manager unassigned successfully!");
      }
      onSuccess();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to unassign leadership"));
    } finally {
      setUnassigningId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg p-6 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserCheck className="size-5 text-primary" /> Manage Leadership & Leads
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Assign executive leads or operational heads for{" "}
            <span className="font-semibold text-foreground">{node?.name} ({node?.code})</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 flex-1 overflow-y-auto py-2 pr-1">
          {/* Active Leaders Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Active Leadership ({isTeam ? (node?.teamLead ? 1 : 0) : activeManagers.length})
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Scope: {node?.code}
              </Badge>
            </div>

            {isTeam ? (
              node?.teamLead ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {node.teamLead.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{node.teamLead.fullName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{node.teamLead.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">
                    Squad Lead
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed text-xs text-muted-foreground bg-muted/20">
                  <UserX className="size-4 shrink-0 text-muted-foreground/60" />
                  <span>No active team lead assigned to this squad.</span>
                </div>
              )
            ) : activeManagers.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed text-xs text-muted-foreground bg-muted/20">
                <UserX className="size-4 shrink-0 text-muted-foreground/60" />
                <span>No active managers currently assigned to this unit.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {activeManagers.map((mgr) => {
                  const isUnassigning = unassigningId === mgr.id;

                  return (
                    <div
                      key={mgr.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {mgr.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{mgr.fullName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">{mgr.email}</p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isUnassigning || isSubmitting}
                        onClick={() => handleUnassign(mgr.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 size-8 p-0 shrink-0"
                        title="Unassign Leadership"
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
                    <ShieldCheck className="size-3.5 text-primary" /> Assign New Executive / Lead
                  </FieldLabel>
                  <FieldDescription className="text-[11px] text-muted-foreground mb-1.5">
                    Search and select a user to grant leadership scope over this organizational unit.
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
