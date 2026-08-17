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
import { HelpTooltip } from "@/components/HelpTooltip";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

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

  const selectedParent = React.useMemo(() => {
    if (!parentId || parentId === "NONE") return null;
    return validParentDepartments.find((d) => d.id === parentId) || departments.find((d) => d.id === parentId);
  }, [validParentDepartments, departments, parentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl sm:min-w-[540px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="size-5 text-primary" /> Edit Department Details
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update department title, parent hierarchy branch, and operational status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="max-h-[60vh] h-[360px] w-full px-6 py-2">
            <FieldSet>
              <FieldGroup className="space-y-4 pr-2">
                {/* Readonly Code Field */}
                <Field>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FieldLabel className="text-xs font-semibold">Department Code</FieldLabel>
                    <HelpTooltip text="Permanent unique identifier code. Cannot be modified after creation." />
                  </div>
                  <Input
                    value={department?.code || ""}
                    disabled
                    className="font-mono font-bold bg-muted/50 text-xs"
                  />
                </Field>

                {/* Editable Name Field */}
                <Field data-invalid={Boolean(errors.name)}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FieldLabel htmlFor="edit-dept-name" className="text-xs font-semibold">
                      Department Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <HelpTooltip text="Official title of the department displayed on organization views." />
                  </div>
                  <Input
                    id="edit-dept-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    className="text-xs"
                    autoComplete="off"
                    disabled={isLoading}
                  />
                  <FieldError errors={errors.name} />
                </Field>

                {/* Parent Department Selection */}
                <Field data-invalid={Boolean(errors.parentId)}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FieldLabel htmlFor="edit-dept-parent" className="text-xs font-semibold">
                      Parent Department (Hierarchy Tier)
                    </FieldLabel>
                    <HelpTooltip text="Parent department to nest under. Circular references are automatically excluded." />
                  </div>
                  <Select
                    value={parentId}
                    onValueChange={(val: string | null) => setParentId(val || "NONE")}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="edit-dept-parent" className="w-full text-xs">
                      <SelectValue placeholder="None (Top-Level Department)">
                        {selectedParent
                          ? `${selectedParent.name} (${selectedParent.code})`
                          : "None (Top-Level Department)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="w-full max-h-56">
                      <SelectItem value="NONE" className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          <span>None (Top-Level Department)</span>
                        </div>
                      </SelectItem>
                      {validParentDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <GitFork className="size-3.5 text-primary" />
                            <span>{dept.name} ({dept.code})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={errors.parentId} />
                </Field>

                {/* Status Switch */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <FieldLabel className="text-xs font-semibold cursor-pointer">
                        Active Operational Status
                      </FieldLabel>
                      <HelpTooltip text="Inactive departments are archived and prevent team assignments." />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Enable or disable operational availability for this department.
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={isLoading}
                  />
                </div>
              </FieldGroup>
            </FieldSet>
          </ScrollArea>

          <DialogFooter className="p-6 pt-3 border-t mt-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="size-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
