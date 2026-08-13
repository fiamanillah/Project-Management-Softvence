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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@workspace/ui/components/field";
import { Badge } from "@workspace/ui/components/badge";
import { Loader2, UserCheck, UserX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { assignDepartmentManagerSchema, type DepartmentItem } from "@workspace/shared";

interface AssignManagerModalProps {
  department: DepartmentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function AssignManagerModal({
  department,
  open,
  onOpenChange,
  onSuccess,
}: AssignManagerModalProps) {
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [unassigningManagerId, setUnassigningManagerId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const activeManagers = department?.managers?.filter((m) => !m.unassignedAt) || [];

  const fetchUsers = React.useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await api.get("/users");
      // Handle both array response or paginated response { items: [...] }
      const userList = Array.isArray(res) ? res : res?.items || res?.data || [];
      setUsers(userList);
    } catch (err: any) {
      toast.error(err.message || "Failed to load user list");
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      fetchUsers();
      setSelectedUserId("");
      setErrors({});
    }
  }, [open, fetchUsers]);

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
      setSelectedUserId("");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign manager");
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
    } catch (err: any) {
      toast.error(err.message || "Failed to unassign manager");
    } finally {
      setUnassigningManagerId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="size-5 text-primary" /> Department Managers
          </DialogTitle>
          <DialogDescription>
            Manage active manager assignments for{" "}
            <span className="font-semibold text-foreground">{department?.name}</span> (
            <span className="font-mono text-primary">{department?.code}</span>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Active Managers Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Currently Assigned Manager(s)
            </h4>

            {activeManagers.length > 0 ? (
              <div className="space-y-2">
                {activeManagers.map((mgr) => (
                  <div
                    key={mgr.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-card/60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="size-7 rounded-full p-0 flex items-center justify-center font-bold">
                        {mgr.user.firstName.charAt(0)}
                      </Badge>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">
                          {mgr.user.firstName} {mgr.user.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {mgr.user.email}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleUnassign(mgr.id)}
                      disabled={unassigningManagerId === mgr.id}
                    >
                      {unassigningManagerId === mgr.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      <span className="sr-only">Unassign</span>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                <UserX className="size-4 text-muted-foreground/60" />
                No manager assigned to this department.
              </div>
            )}
          </div>

          {/* Assign New Manager Form */}
          <form onSubmit={handleAssign} className="space-y-4 pt-2 border-t">
            <FieldSet>
              <FieldGroup>
                <Field data-invalid={Boolean(errors.userId)}>
                  <FieldLabel htmlFor="select-manager">Assign New Manager</FieldLabel>
                  <Select
                    value={selectedUserId}
                    onValueChange={(val: any) => {
                      if (val) {
                        setSelectedUserId(val);
                        if (errors.userId) setErrors((prev) => ({ ...prev, userId: "" }));
                      }
                    }}
                    disabled={isLoadingUsers || isSubmitting}
                  >
                    <SelectTrigger id="select-manager">
                      <SelectValue
                        placeholder={
                          isLoadingUsers ? "Loading users..." : "Select user to assign..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Assigning a new manager will set them as the primary active manager for this department.
                  </FieldDescription>
                  <FieldError errors={errors.userId} />
                </Field>
              </FieldGroup>
            </FieldSet>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
