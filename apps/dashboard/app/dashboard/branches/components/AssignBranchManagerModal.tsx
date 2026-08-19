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
  assignBranchManagerSchema,
  type BranchItem,
  type BranchManagerItem,
} from "@workspace/shared";

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
  const [roleTitle, setRoleTitle] = React.useState("");
  const [isPrimary, setIsPrimary] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [unassigningManagerId, setUnassigningManagerId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [activeManagers, setActiveManagers] = React.useState<BranchManagerItem[]>([]);

  // Sync active managers from branch prop
  React.useEffect(() => {
    if (branch?.managers) {
      setActiveManagers(branch.managers.filter((m) => !m.unassignedAt));
    } else {
      setActiveManagers([]);
    }
  }, [branch]);

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
    if (!branch) return;
    setErrors({});

    const validationResult = assignBranchManagerSchema.safeParse({
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
      const newManager = await api.post<BranchManagerItem>(
        `/organization/branches/${branch.id}/managers`,
        validationResult.data,
      );

      toast.success("Branch leadership position assigned successfully!");

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

      toast.success("Branch leadership position unassigned successfully!");
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
      <DialogContent className="w-[95vw] sm:max-w-lg p-6 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserCheck className="size-5 text-primary" /> Manage Branch Leadership
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Assign multiple executive directors or branch managers for{" "}
            <span className="font-semibold text-foreground">{branch?.name} ({branch?.code})</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 flex-1 overflow-y-auto py-2 pr-1">
          {/* Active Managers Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Leadership Team ({activeManagers.length})
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Branch: {branch?.code}
              </Badge>
            </div>

            {activeManagers.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed text-xs text-muted-foreground bg-muted/20">
                <UserX className="size-4 shrink-0 text-muted-foreground/60" />
                <span>No active leaders currently assigned to this branch.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeManagers.map((mgr) => {
                  const u = mgr.user;
                  const fullName =
                    `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
                    u?.email ||
                    "Assigned Manager";
                  const initials = (u?.firstName?.charAt(0) || "") + (u?.lastName?.charAt(0) || "") || "BM";
                  const isUnassigning = unassigningManagerId === mgr.id;
                  const displayTitle = mgr.roleTitle || "Branch Manager";

                  return (
                    <div
                      key={mgr.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-9 rounded-full border border-primary/20 shrink-0">
                          {u?.avatarUrl && <AvatarImage src={u.avatarUrl} alt={fullName} />}
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {initials.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {fullName}
                            </p>
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
                            <span>{u?.email}</span>
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

          {/* Assign New Manager Form */}
          <form id="assign-branch-manager-form" onSubmit={handleAssign} className="space-y-4 pt-4 border-t">
            <FieldSet>
              <FieldGroup className="space-y-3">
                <Field data-invalid={Boolean(errors.userId)}>
                  <FieldLabel htmlFor="branch-manager-search" className="text-xs font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-primary" /> Assign New Leadership Position
                  </FieldLabel>
                  <FieldDescription className="text-[11px] text-muted-foreground mb-1.5">
                    Select a user to grant executive administrative scope over this branch.
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

                {/* Optional Leadership Position Title */}
                <Field>
                  <FieldLabel htmlFor="branch-role-title" className="text-xs font-semibold">
                    Position / Leadership Title (Optional)
                  </FieldLabel>
                  <Input
                    id="branch-role-title"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. Branch Director, Assistant Manager, Regional Lead"
                    className="h-8 text-xs"
                    disabled={isSubmitting}
                  />
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {["Branch Director", "Co-Manager", "Operations Head"].map((title) => (
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
                    id="branch-is-primary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="branch-is-primary" className="text-xs font-medium cursor-pointer select-none flex items-center gap-1">
                    <Star className="size-3 text-amber-500" /> Designate as Primary Branch Lead
                  </label>
                </div>
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
            Assign Position
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

