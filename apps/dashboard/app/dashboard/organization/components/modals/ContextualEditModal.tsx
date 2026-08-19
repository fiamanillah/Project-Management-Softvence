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
import { Textarea } from "@workspace/ui/components/textarea";
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
import { Loader2, Pencil, GitBranch, Building2, Users, MapPin, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { updateBranchSchema, updateDepartmentSchema, type UnifiedOrgNode } from "@workspace/shared";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface ContextualEditModalProps {
  node: UnifiedOrgNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allNodes: UnifiedOrgNode[];
  onSuccess: () => void;
}

export function ContextualEditModal({
  node,
  open,
  onOpenChange,
  allNodes = [],
  onSuccess,
}: ContextualEditModalProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [selectedParentId, setSelectedParentId] = React.useState<string>("NONE");
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("NONE");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const isBranch = node?.type === "BRANCH";
  const isDepartment = node?.type === "DEPARTMENT";
  const isTeam = node?.type === "TEAM";

  const { allBranches, allDepartments } = React.useMemo(() => {
    const branches: UnifiedOrgNode[] = [];
    const depts: UnifiedOrgNode[] = [];

    const collect = (item: UnifiedOrgNode) => {
      if (item.type === "BRANCH" && item.id !== node?.id) branches.push(item);
      if (item.type === "DEPARTMENT" && item.id !== node?.id) depts.push(item);
      item.children?.forEach(collect);
    };
    allNodes.forEach(collect);

    return { allBranches: branches, allDepartments: depts };
  }, [allNodes, node]);

  React.useEffect(() => {
    if (node && open) {
      setName(node.name || "");
      setDescription(node.description || "");
      setEmail(node.email || "");
      setPhone(node.phone || "");
      setAddress(node.address || "");
      setIsActive(node.isActive ?? true);
      setSelectedParentId(node.parentId || "NONE");
      setSelectedBranchId(node.branchId || "NONE");
      setErrors({});
    }
  }, [node, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!node) return;
    setErrors({});
    setIsLoading(true);

    try {
      if (isBranch) {
        const payload = {
          name: name.trim(),
          parentId: selectedParentId === "NONE" ? null : selectedParentId,
          description: description.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          isActive,
        };

        const validation = updateBranchSchema.safeParse(payload);
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.issues.forEach((issue) => {
            const field = issue.path[0]?.toString();
            if (field) fieldErrors[field] = issue.message;
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        await api.patch(`/organization/branches/${node.id}`, validation.data);
        toast.success(`Branch '${node.code}' updated successfully!`);
      } else if (isDepartment) {
        const payload = {
          name: name.trim(),
          branchId: selectedBranchId === "NONE" ? null : selectedBranchId,
          parentId: selectedParentId === "NONE" ? null : selectedParentId,
          description: description.trim() || null,
          isActive,
        };

        const validation = updateDepartmentSchema.safeParse(payload);
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.issues.forEach((issue) => {
            const field = issue.path[0]?.toString();
            if (field) fieldErrors[field] = issue.message;
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        await api.patch(`/organization/departments/${node.id}`, validation.data);
        toast.success(`Department '${node.code}' updated successfully!`);
      } else {
        // TEAM update
        if (!name.trim()) {
          setErrors({ name: "Team name is required" });
          setIsLoading(false);
          return;
        }

        await api.patch(`/organization/teams/${node.id}`, {
          name: name.trim(),
          description: description.trim() || null,
          isActive,
        });
        toast.success(`Team '${node.name}' updated successfully!`);
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update organizational unit"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl sm:min-w-[540px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="size-5 text-primary" /> Edit {node?.type}: {node?.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update title, operational status, contact information, or parent hierarchy.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="max-h-[60vh] h-[380px] w-full px-6 py-2">
            <FieldSet>
              <FieldGroup className="space-y-4 pr-2">
                {/* Immutable Code */}
                <Field>
                  <FieldLabel className="text-xs font-semibold">Unit Code (Immutable)</FieldLabel>
                  <Input
                    value={node?.code || ""}
                    disabled
                    className="bg-muted font-mono uppercase text-xs cursor-not-allowed opacity-80"
                  />
                </Field>

                {/* Branch Parent Selector */}
                {isBranch && (
                  <Field data-invalid={Boolean(errors.parentId)}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FieldLabel className="text-xs font-semibold">Parent Branch</FieldLabel>
                      <HelpTooltip text="Change parent branch. Cycle detection prevents invalid loops." />
                    </div>
                    <Select
                      value={selectedParentId}
                      onValueChange={(val: string | null) => setSelectedParentId(val || "NONE")}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="None (Top-Level Enterprise Branch)" />
                      </SelectTrigger>
                      <SelectContent className="w-full max-h-56">
                        <SelectItem value="NONE" className="text-xs text-muted-foreground">
                          None (Top-Level Enterprise Branch)
                        </SelectItem>
                        {allBranches.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-xs">
                            {b.name} ({b.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={errors.parentId} />
                  </Field>
                )}

                {/* Department Host Branch & Parent Dept Selectors */}
                {isDepartment && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field data-invalid={Boolean(errors.branchId)}>
                      <FieldLabel className="text-xs font-semibold">Host Branch</FieldLabel>
                      <Select
                        value={selectedBranchId}
                        onValueChange={(val: string | null) => setSelectedBranchId(val || "NONE")}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Corporate HQ (Global)" />
                        </SelectTrigger>
                        <SelectContent className="w-full max-h-56">
                          <SelectItem value="NONE" className="text-xs text-muted-foreground">
                            Corporate HQ (Global)
                          </SelectItem>
                          {allBranches.map((b) => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">
                              {b.name} ({b.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={errors.branchId} />
                    </Field>

                    <Field data-invalid={Boolean(errors.parentId)}>
                      <FieldLabel className="text-xs font-semibold">Parent Department</FieldLabel>
                      <Select
                        value={selectedParentId}
                        onValueChange={(val: string | null) => setSelectedParentId(val || "NONE")}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="None (Root Department)" />
                        </SelectTrigger>
                        <SelectContent className="w-full max-h-56">
                          <SelectItem value="NONE" className="text-xs text-muted-foreground">
                            None (Root Department)
                          </SelectItem>
                          {allDepartments.map((d) => (
                            <SelectItem key={d.id} value={d.id} className="text-xs">
                              {d.name} ({d.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={errors.parentId} />
                    </Field>
                  </div>
                )}

                {/* Name */}
                <Field data-invalid={Boolean(errors.name)}>
                  <FieldLabel className="text-xs font-semibold">Unit Name *</FieldLabel>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xs"
                    disabled={isLoading}
                  />
                  <FieldError errors={errors.name} />
                </Field>

                {/* Description */}
                <Field data-invalid={Boolean(errors.description)}>
                  <FieldLabel className="text-xs font-semibold">Description</FieldLabel>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isLoading}
                    rows={2}
                    className="text-xs"
                  />
                  <FieldError errors={errors.description} />
                </Field>

                {/* Branch Contact Details */}
                {isBranch && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel className="text-xs font-semibold">Email</FieldLabel>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="text-xs"
                          disabled={isLoading}
                        />
                      </Field>
                      <Field>
                        <FieldLabel className="text-xs font-semibold">Phone</FieldLabel>
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="text-xs"
                          disabled={isLoading}
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel className="text-xs font-semibold">Office Address</FieldLabel>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="text-xs"
                        disabled={isLoading}
                      />
                    </Field>
                  </>
                )}

                {/* Active Status */}
                <Field className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <FieldLabel className="text-xs font-medium cursor-pointer">
                      Operational Status
                    </FieldLabel>
                    <p className="text-[11px] text-muted-foreground">
                      Active units participate in project assignments, permissions, and dashboards.
                    </p>
                  </div>
                  <Switch
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
