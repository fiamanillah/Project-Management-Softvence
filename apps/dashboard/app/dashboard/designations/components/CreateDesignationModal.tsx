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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface CreateDesignationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string; code: string }[];
  onSuccess: () => void;
}

export function CreateDesignationModal({ open, onOpenChange, departments, onSuccess }: CreateDesignationModalProps) {
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [hierarchyLevel, setHierarchyLevel] = React.useState(3);
  const [isLeadership, setIsLeadership] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) {
      toast.error("Please select a department");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/admin/designations", {
        code: code.toUpperCase(),
        name,
        departmentId,
        hierarchyLevel,
        isLeadership,
      });

      toast.success("Designation created successfully!");
      onOpenChange(false);
      onSuccess();
      setCode("");
      setName("");
      setDepartmentId("");
      setHierarchyLevel(3);
      setIsLeadership(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create designation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Designation</DialogTitle>
          <DialogDescription>
            Add a new organizational role with hierarchy level and department association.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Designation Code</Label>
              <Input
                placeholder="SR_DEV"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Hierarchy Level</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={hierarchyLevel}
                onChange={(e) => setHierarchyLevel(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Designation Title</Label>
            <Input
              placeholder="Senior Software Engineer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Department</Label>
            <Select value={departmentId} onValueChange={(val: any) => val && setDepartmentId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Leadership Position</Label>
              <p className="text-xs text-muted-foreground">
                Flags leadership responsibilities for team management.
              </p>
            </div>
            <Switch checked={isLeadership} onCheckedChange={setIsLeadership} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Create Designation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
