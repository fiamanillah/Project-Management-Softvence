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
import { Loader2, Pencil, UserCheck, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import type { DesignationItem } from "./DesignationTable";

interface EditDesignationModalProps {
  designation: DesignationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string; code: string; parent?: { id?: string; code?: string; name?: string } | null }[];
  onSuccess: () => void;
}

export function EditDesignationModal({
  designation,
  open,
  onOpenChange,
  departments,
  onSuccess,
}: EditDesignationModalProps) {
  const [name, setName] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [hierarchyLevel, setHierarchyLevel] = React.useState(3);
  const [isLeadership, setIsLeadership] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open && designation) {
      setName(designation.name);
      setDepartmentId(designation.department?.id || "");
      setHierarchyLevel(designation.hierarchyLevel || 3);
      setIsLeadership(Boolean(designation.isLeadership));
      setFormErrors({});
    }
  }, [open, designation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designation) return;

    setFormErrors({});
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormErrors({ name: "Job Title / Name is required" });
      return;
    }

    setIsLoading(true);
    try {
      await api.put(`/organization/designations/${designation.id}`, {
        name: trimmedName,
        departmentId: departmentId === "NONE" || !departmentId ? null : departmentId,
        hierarchyLevel: Number(hierarchyLevel) || 1,
        isLeadership,
      });

      toast.success(`Designation '${trimmedName}' updated successfully`);
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
        toast.error(err.message || "Failed to update designation");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDept = React.useMemo(() => {
    if (!departmentId || departmentId === "NONE") return null;
    return departments.find((d) => d.id === departmentId);
  }, [departments, departmentId]);

  if (!designation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl sm:min-w-[560px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <Pencil className="size-5 text-primary" />
            <DialogTitle className="text-xl font-bold">Edit Designation: {designation.code}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Update employee job title metadata, department association, and hierarchy level.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="max-h-[60vh] h-[360px] w-full px-6 py-2">
            <div className="space-y-4 pr-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="edit-desig-code" className="text-xs font-semibold">
                    Designation Code (Immutable)
                  </Label>
                  <HelpTooltip text="Permanent designation code. Cannot be modified." />
                </div>
                <Input
                  id="edit-desig-code"
                  value={designation.code}
                  disabled
                  className="font-mono uppercase text-xs bg-muted"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="edit-desig-name" className="text-xs font-semibold">
                    Job Title / Name <span className="text-destructive">*</span>
                  </Label>
                  <HelpTooltip text="Job title as shown across employee profile badges." />
                </div>
                <Input
                  id="edit-desig-name"
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
                  <Label htmlFor="edit-desig-dept" className="text-xs font-semibold">
                    Department
                  </Label>
                  <HelpTooltip text="Associated department or Company-Wide." />
                </div>
                <Select
                  value={departmentId || "NONE"}
                  onValueChange={(val: string | null) => setDepartmentId(val === "NONE" || !val ? "" : val)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="edit-desig-dept" className="text-xs w-full">
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
                  <Label htmlFor="edit-desig-level" className="text-xs font-semibold">
                    Hierarchy / Seniority Level
                  </Label>
                  <HelpTooltip text="Level ranking from 1 (Top Level) to 10." />
                </div>
                <Input
                  id="edit-desig-level"
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
