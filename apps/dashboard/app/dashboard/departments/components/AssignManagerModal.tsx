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
import { api } from "@/lib/api";
import {
  assignDepartmentManagerSchema,
  type DepartmentItem,
  type DepartmentManagerItem,
} from "@workspace/shared";

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
  const [roleTitle, setRoleTitle] = React.useState("");
  const [isPrimary, setIsPrimary] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [unassigningManagerId, setUnassigningManagerId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [activeManagers, setActiveManagers] = React.useState<DepartmentManagerItem[]>([]);

  // Sync active managers from department prop
  React.useEffect(() => {
    if (department?.managers) {
      setActiveManagers(department.managers.filter((m) => !m.unassignedAt));
    } else {
      setActiveManagers([]);
    }
  }, [department]);

  const assignedUserIds = React.useMemo(() => {
    return activeManagers.map((m) => m.userId || m.user?.id).filter(Boolean) as string[];
  }, [activeManagers]);

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedUser(null);
    setRoleTitle("");
    setIsPrimary(false);
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
      roleTitle: roleTitle.trim() || undefined,
      isPrimary,
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
      const newManager = await api.post<DepartmentManagerItem>(
        `/organization/departments/${department.id}/managers`,
        validationResult.data,
      );

      toast.success("Department leadership position assigned successfully!");

      // Update local state immediately
      setActiveManagers((prev) => {
        let updated = prev;
        if (isPrimary) {
          updated = updated.map((m) => ({ ...m, isPrimary: false }));
        }
        return [newManager, ...updated];
      });

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
      toast.success("Department leadership position unassigned successfully!");
      setActiveManagers((prev) => prev.filter((m) => m.id !== managerId));
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
      <DialogContent className="w-[95vw] sm:max-w-lg sm:min-w-[560px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserCheck className="size-5 text-primary" /> Manage Department Leadership
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Assign multiple department heads, directors, or managers for{" "}
            <span className="font-semibold text-foreground">{department?.name}</span> (
            <span className="font-mono text-primary font-bold">{department?.code}</span>).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5">
          {/* Active Managers Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Leadership Team ({activeManagers.length})
              </h4>
              <Badge variant="outline" className="text-[11px] font-normal">
                {activeManagers.length} Active
              </Badge>
            </div>

            {activeManagers.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeManagers.map((mgr) => {
                  const u = mgr.user;
                  const userFirstName = u?.firstName || "";
                  const userLastName = u?.lastName || "";
                  const userEmail = u?.email || "";
                  const initials =
                    (userFirstName.charAt(0) + userLastName.charAt(0)).toUpperCase() ||
                    userEmail.charAt(0).toUpperCase() ||
                    "DM";
                  const displayName =
                    `${userFirstName} ${userLastName}`.trim() || userEmail || "Manager";
                  const displayTitle = mgr.roleTitle || "Department Manager";

                  return (
                    <div
                      key={mgr.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-card/80 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-8 rounded-full border border-primary/20 shrink-0">
                          {u?.avatarUrl && <AvatarImage src={u.avatarUrl} alt={displayName} />}
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold truncate text-foreground">
                              {displayName}
                            </span>
                            {mgr.isPrimary ? (
                              <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-0.5">
                                <Crown className="size-2.5 text-amber-500" /> Primary Lead
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 text-muted-foreground">
                                {displayTitle}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate font-mono mt-0.5">
                            <span>{userEmail}</span>
                            {u?.designation?.name && (
                              <>
                                <span>&bull;</span>
                                <span className="font-sans text-foreground font-medium">{u.designation.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                        onClick={() => handleUnassign(mgr.id)}
                        disabled={unassigningManagerId === mgr.id}
                        title="Unassign Leadership Position"
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
                No leaders assigned to this department yet.
              </div>
            )}
          </div>

          {/* Assign New Manager Form */}
          <form id="assign-dept-manager-form" onSubmit={handleAssign} className="space-y-4 pt-3 border-t">
            <FieldSet>
              <FieldGroup className="space-y-3">
                <Field data-invalid={Boolean(errors.userId)}>
                  <FieldLabel htmlFor="user-select-field" className="text-xs font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-primary" /> Assign New Leadership Position
                  </FieldLabel>
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

                {/* Optional Leadership Position Title */}
                <Field>
                  <FieldLabel htmlFor="dept-role-title" className="text-xs font-semibold">
                    Position / Leadership Title (Optional)
                  </FieldLabel>
                  <Input
                    id="dept-role-title"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. Department Head, Associate Director, Technical Manager"
                    className="h-8 text-xs"
                    disabled={isSubmitting}
                  />
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {["Department Head", "Associate Director", "Operations Lead", "Engineering Lead"].map((title) => (
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

                {/* Primary Lead Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="dept-is-primary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="dept-is-primary" className="text-xs font-medium cursor-pointer select-none flex items-center gap-1">
                    <Star className="size-3 text-amber-500" /> Designate as Primary Department Head
                  </label>
                </div>
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
                    as {roleTitle || "Department Manager"}.
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
                Assign Position
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

