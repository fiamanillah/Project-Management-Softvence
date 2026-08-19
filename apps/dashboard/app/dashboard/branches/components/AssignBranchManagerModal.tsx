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
import { Loader2, UserCheck, UserX, Trash2, ShieldCheck, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { assignBranchManagerSchema, type BranchItem } from "@workspace/shared";

interface AssignBranchManagerModalProps {
  branch: BranchItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignBranchManagerModal({
  branch,
  open,
  onOpenChange,
  onSuccess,
}: AssignBranchManagerModalProps) {
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [unassigningManagerId, setUnassigningManagerId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const activeManagers = branch?.managers?.filter((m) => !m.unassignedAt) || [];
  const assignedUserIds = activeManagers
    .map((m) => m.userId || m.user?.id)
    .filter(Boolean) as string[];

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedUser(null);
    setErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;
    setErrors({});

    const validationResult = assignBranchManagerSchema.safeParse({
      userId: selectedUserId,
    });

    if (!validationResult.success) {
      const formattedErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const fieldName = issue.path[0]?.toString();
        if (fieldName) {
          formattedErrors[fieldName] = issue.message;
        }
      });
      setErrors(formattedErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/organization/branches/${branch.id}/managers`, validationResult.data);

      toast.success("Branch manager assigned successfully!");
      resetForm();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign branch manager";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async (managerId: string) => {
    if (!branch) return;
    setUnassigningManagerId(managerId);

    try {
      await api.delete(`/organization/branches/${branch.id}/managers/${managerId}`);

      toast.success("Branch manager unassigned successfully!");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unassign manager";
      toast.error(msg);
    } finally {
      setUnassigningManagerId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg p-6 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserCheck className="size-5 text-primary" /> Manage Branch Leadership
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Assign executive directors or branch managers for{" "}
            <span className="font-semibold text-foreground">{branch?.name} ({branch?.code})</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 flex-1 overflow-y-auto py-2 pr-1">
          {/* Active Managers Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Active Managers ({activeManagers.length})
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Branch Scope: {branch?.code}
              </Badge>
            </div>

            {activeManagers.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed text-xs text-muted-foreground bg-muted/20">
                <UserX className="size-4 shrink-0 text-muted-foreground/60" />
                <span>No active managers currently assigned to this branch.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {activeManagers.map((mgr) => {
                  const fullName =
                    `${mgr.user?.firstName || ""} ${mgr.user?.lastName || ""}`.trim() ||
                    mgr.user?.email ||
                    "Assigned Manager";
                  const isUnassigning = unassigningManagerId === mgr.id;

                  return (
                    <div
                      key={mgr.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {fullName}
                            </p>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                              Active Lead
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">
                            {mgr.user?.email}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isUnassigning || isSubmitting}
                        onClick={() => handleUnassign(mgr.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 size-8 p-0 shrink-0"
                        title="Unassign Manager"
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

          {/* Assign New Manager Form */}
          <form id="assign-branch-manager-form" onSubmit={handleAssign} className="space-y-4 pt-4 border-t">
            <FieldSet>
              <FieldGroup className="space-y-3">
                <Field data-invalid={Boolean(errors.userId)}>
                  <FieldLabel htmlFor="branch-manager-search" className="text-xs font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-primary" /> Assign New Branch Manager
                  </FieldLabel>
                  <FieldDescription className="text-[11px] text-muted-foreground mb-1.5">
                    Search and select a user to grant executive administrative scope over this branch.
                  </FieldDescription>

                  <UserSearchSelect
                    id="branch-manager-search"
                    value={selectedUserId}
                    onValueChange={(userId, user) => {
                      setSelectedUserId(userId);
                      setSelectedUser(user);
                      if (errors.userId) setErrors((prev) => ({ ...prev, userId: "" }));
                    }}
                    placeholder="Search by user name, email, or designation..."
                    searchPlaceholder="Type name or email..."
                    excludeUserIds={assignedUserIds}
                    disabled={isSubmitting}
                  />

                  <FieldError errors={errors.userId} />
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
            form="assign-branch-manager-form"
            size="sm"
            disabled={!selectedUserId || isSubmitting}
            className="gap-1.5"
          >
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
            Assign Manager
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
