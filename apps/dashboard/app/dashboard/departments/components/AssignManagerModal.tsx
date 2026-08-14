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
import { api } from "@/lib/api";
import { assignDepartmentManagerSchema, type DepartmentItem } from "@workspace/shared";

interface AssignManagerModalProps {
  department: DepartmentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignManagerModal({
  department,
  open,
  onOpenChange,
  onSuccess,
}: AssignManagerModalProps) {
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [unassigningManagerId, setUnassigningManagerId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const activeManagers = department?.managers?.filter((m) => !m.unassignedAt) || [];
  const assignedUserIds = activeManagers.map((m) => m.userId || m.user?.id).filter(Boolean) as string[];

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
    if (!department) return;
    setErrors({});

    // Validate using shared Zod schema
    const validationResult = assignDepartmentManagerSchema.safeParse({
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
      await api.post(`/organization/departments/${department.id}/managers`, validationResult.data);

      toast.success("Department manager assigned successfully!");
      resetForm();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign manager";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async (managerId: string) => {
    if (!department) return;
    setUnassigningManagerId(managerId);
    try {
      await api.delete(`/organization/departments/${department.id}/managers/${managerId}`);
      toast.success("Manager unassigned successfully!");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <UserCheck className="size-5 text-primary" /> Department Managers
          </DialogTitle>
          <DialogDescription className="text-xs">
            Manage active manager assignments for{" "}
            <span className="font-semibold text-foreground">{department?.name}</span> (
            <span className="font-mono text-primary">{department?.code}</span>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Active Managers Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Currently Assigned Manager(s)
              </h4>
              <Badge variant="outline" className="text-[11px] font-normal">
                {activeManagers.length} Active
              </Badge>
            </div>

            {activeManagers.length > 0 ? (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {activeManagers.map((mgr) => {
                  const userFirstName = mgr.user?.firstName || "";
                  const userLastName = mgr.user?.lastName || "";
                  const userEmail = mgr.user?.email || "";
                  const avatarChar = userFirstName
                    ? userFirstName.charAt(0).toUpperCase()
                    : userEmail
                      ? userEmail.charAt(0).toUpperCase()
                      : "?";
                  const displayName =
                    `${userFirstName} ${userLastName}`.trim() || userEmail || "Manager";

                  return (
                    <div
                      key={mgr.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-card/80 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {avatarChar}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium truncate text-foreground">
                            {displayName}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate font-mono">
                            {userEmail}
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                        onClick={() => handleUnassign(mgr.id)}
                        disabled={unassigningManagerId === mgr.id}
                      >
                        {unassigningManagerId === mgr.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5 mr-1" />
                        )}
                        <span>Unassign</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                <UserX className="size-4 text-muted-foreground/60" />
                No manager assigned to this department yet.
              </div>
            )}
          </div>

          {/* Assign New Manager Form */}
          <form onSubmit={handleAssign} className="space-y-4 pt-3 border-t">
            <FieldSet>
              <FieldGroup>
                <Field data-invalid={Boolean(errors.userId)}>
                  <FieldLabel htmlFor="user-select-field">Assign New Manager</FieldLabel>
                  <UserSearchSelect
                    id="user-select-field"
                    value={selectedUserId}
                    onValueChange={(val, user) => {
                      setSelectedUserId(val);
                      setSelectedUser(user);
                      if (errors.userId) setErrors((prev) => ({ ...prev, userId: "" }));
                    }}
                    placeholder="Search and select a user to assign..."
                    searchPlaceholder="Search by name, email, employee ID, role, designation..."
                    excludeUserIds={assignedUserIds}
                    pageSize={6}
                    disabled={isSubmitting}
                    data-invalid={Boolean(errors.userId)}
                  />
                  <FieldError errors={errors.userId} />
                </Field>
              </FieldGroup>
            </FieldSet>

            {/* Selection Confirmation Preview */}
            {selectedUser && (
              <div className="flex items-center justify-between mt-2.5 p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary shrink-0" />
                  <span>
                    Ready to assign{" "}
                    <strong className="text-foreground">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </strong>{" "}
                    as department manager.
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Close
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedUserId}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Assign Manager
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
