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
import { Loader2, Building2, GitBranch, GitFork } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { createDepartmentSchema, type DepartmentItem, type BranchItem } from "@workspace/shared";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface CreateDepartmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments?: DepartmentItem[];
  branches?: BranchItem[];
  defaultParentId?: string | null;
  onSuccess: () => void;
}

export function CreateDepartmentModal({
  open,
  onOpenChange,
  departments = [],
  branches = [],
  defaultParentId = null,
  onSuccess,
}: CreateDepartmentModalProps) {
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [branchId, setBranchId] = React.useState<string>("NONE");
  const [parentId, setParentId] = React.useState<string>("NONE");
  const [isActive, setIsActive] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      if (defaultParentId) {
        setParentId(defaultParentId);
      } else {
        setParentId("NONE");
      }
    }
  }, [open, defaultParentId]);

  const handleReset = () => {
    setCode("");
    setName("");
    setBranchId("NONE");
    setParentId(defaultParentId || "NONE");
    setIsActive(true);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validationResult = createDepartmentSchema.safeParse({
      code: code.trim(),
      name: name.trim(),
      branchId: branchId === "NONE" ? null : branchId,
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
      await api.post("/organization/departments", validationResult.data);

      toast.success(`Department '${validationResult.data.name}' created successfully!`);
      handleReset();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to create department"));
    } finally {
      setIsLoading(false);
    }
  };

  const activeDepartments = React.useMemo(() => {
    return departments.filter((d) => d.isActive);
  }, [departments]);

  const selectedParent = React.useMemo(() => {
    if (!parentId || parentId === "NONE") return null;
    return activeDepartments.find((d) => d.id === parentId);
  }, [activeDepartments, parentId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) handleReset();
        onOpenChange(val);
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-xl sm:min-w-[540px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Building2 className="size-5 text-primary" /> Create New Department
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add a new organizational unit or sub-department to your Betopia Group hierarchy.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="max-h-[60vh] h-[400px] w-full px-6 py-2">
            <FieldSet>
              <FieldGroup className="space-y-4 pr-2">
                {/* Branch Selection */}
                {branches.length > 0 && (
                  <Field data-invalid={Boolean(errors.branchId)}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FieldLabel htmlFor="create-dept-branch" className="text-xs font-semibold">
                        Host Branch / Subsidiary
                      </FieldLabel>
                      <HelpTooltip text="Assign this department to a specific Betopia Group branch or leave unassigned." />
                    </div>
                    <Select
                      value={branchId}
                      onValueChange={(val: string | null) => setBranchId(val || "NONE")}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="create-dept-branch" className="w-full text-xs">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent className="w-full max-h-56">
                        <SelectItem value="NONE" className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <GitBranch className="size-3.5 text-muted-foreground" />
                            <span>None (Corporate HQ / Unassigned)</span>
                          </div>
                        </SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {b.code}
                              </span>
                              <span>{b.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={errors.branchId} />
                  </Field>
                )}

                {/* Department Code Field */}
                <Field data-invalid={Boolean(errors.code)}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FieldLabel htmlFor="create-dept-code" className="text-xs font-semibold">
                      Department Code <span className="text-destructive">*</span>
                    </FieldLabel>
                    <HelpTooltip text="Unique uppercase identifier code across your company (e.g. ENG, HR, FIN, MKT)." />
                  </div>
                  <Input
                    id="create-dept-code"
                    placeholder="e.g. ENG, HR, DESIGN"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (errors.code) setErrors((prev) => ({ ...prev, code: "" }));
                    }}
                    className="font-mono uppercase text-xs"
                    autoComplete="off"
                    disabled={isLoading}
                  />
                  <FieldError errors={errors.code} />
                </Field>

                {/* Department Name Field */}
                <Field data-invalid={Boolean(errors.name)}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FieldLabel htmlFor="create-dept-name" className="text-xs font-semibold">
                      Department Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <HelpTooltip text="Full title of the department as displayed on organizational charts and reports." />
                  </div>
                  <Input
                    id="create-dept-name"
                    placeholder="e.g. Engineering & Product Architecture"
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
                    <FieldLabel htmlFor="create-dept-parent" className="text-xs font-semibold">
                      Parent Department (Hierarchy Tier)
                    </FieldLabel>
                    <HelpTooltip text="Select a parent department to nest this as a sub-unit, or select None for a top-level department." />
                  </div>
                  <Select
                    value={parentId}
                    onValueChange={(val: string | null) => setParentId(val || "NONE")}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="create-dept-parent" className="w-full text-xs">
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
                      {activeDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {dept.code}
                            </span>
                            <span>{dept.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={errors.parentId} />
                </Field>

                {/* Is Active Switch Field */}
                <Field className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <FieldLabel htmlFor="create-dept-active" className="text-xs font-medium cursor-pointer">
                      Operational Status
                    </FieldLabel>
                    <p className="text-[11px] text-muted-foreground">
                      Active departments can have roles, designations, teams, and members assigned.
                    </p>
                  </div>
                  <Switch
                    id="create-dept-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={isLoading}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </ScrollArea>

          <DialogFooter className="p-6 pt-3 border-t bg-muted/10 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                handleReset();
                onOpenChange(false);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="size-3.5 animate-spin" />}
              Create Department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
