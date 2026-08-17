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
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Loader2, Briefcase, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface CreateDesignationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string; code: string; parent?: { id?: string; code?: string; name?: string } | null }[];
  onSuccess: () => void;
}

export function CreateDesignationModal({
  open,
  onOpenChange,
  departments,
  onSuccess,
}: CreateDesignationModalProps) {
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [hierarchyLevel, setHierarchyLevel] = React.useState(3);
  const [isLeadership, setIsLeadership] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const handleResetForm = () => {
    setCode("");
    setName("");
    setDepartmentId("");
    setHierarchyLevel(3);
    setIsLeadership(false);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    const errors: Record<string, string> = {};
    if (!trimmedCode) errors.code = "Designation Code is required (e.g. SR_DEV)";
    if (!trimmedName) errors.name = "Job Title / Designation Name is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/organization/designations", {
        code: trimmedCode,
        name: trimmedName,
        departmentId: departmentId === "NONE" || !departmentId ? null : departmentId,
        hierarchyLevel: Number(hierarchyLevel) || 1,
        isLeadership,
      });

      toast.success(`Designation '${trimmedName}' created successfully`);
      handleResetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      if (err.issues && Array.isArray(err.issues)) {
        const mappedErrors: Record<string, string> = {};
        err.issues.forEach((issue: any) => {
          const path = issue.path?.join(".") || "form";
          mappedErrors[path] = issue.message;
        });
        setFormErrors(mappedErrors);
      } else {
        toast.error(err.message || "Failed to create designation");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDept = React.useMemo(() => {
    if (!departmentId || departmentId === "NONE") return null;
    return departments.find((d) => d.id === departmentId);
  }, [departments, departmentId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleResetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-xl sm:min-w-[560px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <Briefcase className="size-5 text-primary" />
            <DialogTitle className="text-xl font-bold">Add HR Designation</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Create an HR job title/tag for employee directory, profile badges, and department organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="max-h-[60vh] h-[360px] w-full px-6 py-2">
            <div className="space-y-4 pr-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="desig-code" className="text-xs font-semibold">
                    Designation Code <span className="text-destructive">*</span>
                  </Label>
                  <HelpTooltip text="Permanent uppercase identifier (e.g. SR_DEV_II, VP_ENG, HR_LEAD)." />
                </div>
                <Input
                  id="desig-code"
                  placeholder="e.g. SR_DEV_II, VP_ENG"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase text-xs"
                  disabled={isLoading}
                />
                {formErrors.code && (
                  <p className="text-[11px] text-destructive font-medium">{formErrors.code}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="desig-name" className="text-xs font-semibold">
                    Job Title / Name <span className="text-destructive">*</span>
                  </Label>
                  <HelpTooltip text="Official job title shown on user profile and organizational rosters." />
                </div>
                <Input
                  id="desig-name"
                  placeholder="e.g. Senior Software Engineer II"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                  disabled={isLoading}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-destructive font-medium">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="desig-dept" className="text-xs font-semibold">
                    Department
                  </Label>
                  <HelpTooltip text="Department to which this title belongs, or select Company-Wide." />
                </div>
                <Select
                  value={departmentId || "NONE"}
                  onValueChange={(val: string | null) => setDepartmentId(val === "NONE" || !val ? "" : val)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="desig-dept" className="text-xs w-full">
                    <SelectValue placeholder="Company-Wide (All Departments)">
                      {selectedDept
                        ? `${selectedDept.parent ? `${selectedDept.parent.name} → ` : ""}${selectedDept.name} (${selectedDept.code})`
                        : "Company-Wide (All Departments)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-full max-h-56">
                    <SelectItem value="NONE" className="text-xs font-medium text-muted-foreground">
                      Company-Wide (All Departments)
                    </SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.parent ? `${d.parent.name} → ` : ""}{d.name} ({d.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="desig-level" className="text-xs font-semibold">
                    Hierarchy / Seniority Level
                  </Label>
                  <HelpTooltip text="Seniority ranking level from 1 (Executive) to 10 (Junior)." />
                </div>
                <Input
                  id="desig-level"
                  type="number"
                  min={1}
                  max={10}
                  value={hierarchyLevel}
                  onChange={(e) => setHierarchyLevel(Number(e.target.value) || 1)}
                  className="text-xs"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                      <UserCheck className="size-3.5 text-amber-500" />
                      Leadership Role
                    </Label>
                    <HelpTooltip text="Flags this designation as a corporate leadership position." />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Flags this designation as a corporate leadership position.
                  </p>
                </div>
                <Switch
                  checked={isLeadership}
                  onCheckedChange={setIsLeadership}
                  disabled={isLoading}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 pt-3 border-t mt-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                handleResetForm();
                onOpenChange(false);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="size-3.5 animate-spin" />}
              Create Designation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
