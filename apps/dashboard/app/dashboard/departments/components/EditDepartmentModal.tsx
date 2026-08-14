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
import { Switch } from "@workspace/ui/components/switch";
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@workspace/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Loader2, Pencil, Building2, GitFork } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { updateDepartmentSchema, type DepartmentItem } from "@workspace/shared";

interface EditDepartmentModalProps {
  department: DepartmentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments?: DepartmentItem[];
  onSuccess: () => void;
}

export function EditDepartmentModal({
  department,
  open,
  onOpenChange,
  departments = [],
  onSuccess,
}: EditDepartmentModalProps) {
  const [name, setName] = React.useState("");
  const [parentId, setParentId] = React.useState<string>("NONE");
  const [isActive, setIsActive] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (department) {
      setName(department.name || "");
      setParentId(department.parentId || "NONE");
      setIsActive(department.isActive ?? true);
      setErrors({});
    }
  }, [department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department) return;
    setErrors({});

    // Validate using shared Zod schema from @workspace/shared
    const validationResult = updateDepartmentSchema.safeParse({
      name: name.trim(),
      parentId: parentId === "NONE" ? null : parentId,
      isActive,
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

    setIsLoading(true);
    try {
      await api.patch(`/organization/departments/${department.id}`, validationResult.data);

      toast.success(`Department '${department.code}' updated successfully!`);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update department"));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to find all descendants of the current department to prevent cycle selection
  const descendantIds = React.useMemo(() => {
    if (!department) return new Set<string>();
    const descendants = new Set<string>();
    const queue = [department.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      for (const d of departments) {
        if (d.parentId === currentId && !descendants.has(d.id)) {
          descendants.add(d.id);
          queue.push(d.id);
        }
      }
    }
    return descendants;
  }, [department, departments]);

  const validParentDepartments = React.useMemo(() => {
    if (!department) return [];
    return departments.filter(
      (d) => d.id !== department.id && !descendantIds.has(d.id) && d.isActive,
    );
  }, [department, departments, descendantIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-primary" /> Edit Department Details
          </DialogTitle>
          <DialogDescription>
            Update department name, hierarchy parent, and operational status for code{" "}
            <span className="font-mono font-bold text-foreground">
              {department?.code}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldSet>
            <FieldGroup>
              {/* Readonly Code Field */}
              <Field>
                <FieldLabel>Department Code</FieldLabel>
                <Input
                  value={department?.code || ""}
                  disabled
                  className="font-mono font-bold bg-muted/50"
                />
                <FieldDescription>Department code cannot be modified after creation.</FieldDescription>
              </Field>

              {/* Editable Name Field */}
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="edit-dept-name">Department Name *</FieldLabel>
                <Input
                  id="edit-dept-name"
                  placeholder="Department Name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  autoComplete="off"
                />
                <FieldError errors={errors.name} />
              </Field>

              {/* Parent Department Selection */}
              <Field data-invalid={Boolean(errors.parentId)}>
                <FieldLabel htmlFor="edit-dept-parent">Parent Department</FieldLabel>
                <Select value={parentId} onValueChange={(val: string | null) => setParentId(val || "NONE")}>
                  <SelectTrigger id="edit-dept-parent" className="w-full text-xs">
                    <SelectValue placeholder="None (Top-Level Department)" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="NONE" className="text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        <span>None (Top-Level Department)</span>
                      </div>
                    </SelectItem>
                    {validParentDepartments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-1.5">
                          <GitFork className="size-3.5 text-primary" />
                          <span>{dept.name} ({dept.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Reassign the parent department. Descendants and self are excluded to prevent hierarchy cycles.
                </FieldDescription>
                <FieldError errors={errors.parentId} />
              </Field>

              {/* Active Status Switch Field */}
              <Field orientation="horizontal" className="rounded-lg border p-3 bg-muted/20">
                <div className="space-y-0.5">
                  <FieldLabel htmlFor="edit-dept-active" className="cursor-pointer">
                    Active Status
                  </FieldLabel>
                  <FieldDescription>
                    Deactivating a department preserves historical data while restricting new assignments.
                  </FieldDescription>
                </div>
                <Switch
                  id="edit-dept-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </Field>
            </FieldGroup>
          </FieldSet>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
