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
import { Loader2, GitBranch, Building2, Users, Plus, MapPin, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { createBranchSchema, createDepartmentSchema, type UnifiedOrgNode, type OrgNodeType } from "@workspace/shared";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface ContextualCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetParentNode: UnifiedOrgNode | null;
  defaultType: OrgNodeType;
  allNodes: UnifiedOrgNode[];
  onSuccess: () => void;
}

export function ContextualCreateModal({
  open,
  onOpenChange,
  targetParentNode,
  defaultType = "BRANCH",
  allNodes = [],
  onSuccess,
}: ContextualCreateModalProps) {
  const [entityType, setEntityType] = React.useState<OrgNodeType>(defaultType);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [selectedParentId, setSelectedParentId] = React.useState<string>("NONE");
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("NONE");
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("NONE");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Flatten available branches and departments
  const { allBranches, allDepartments } = React.useMemo(() => {
    const branches: UnifiedOrgNode[] = [];
    const depts: UnifiedOrgNode[] = [];

    const collect = (node: UnifiedOrgNode) => {
      if (node.type === "BRANCH") branches.push(node);
      if (node.type === "DEPARTMENT") depts.push(node);
      node.children?.forEach(collect);
    };
    allNodes.forEach(collect);

    return { allBranches: branches, allDepartments: depts };
  }, [allNodes]);

  React.useEffect(() => {
    if (open) {
      setEntityType(defaultType);
      if (targetParentNode) {
        if (targetParentNode.type === "BRANCH") {
          setSelectedBranchId(targetParentNode.id);
          setSelectedParentId(defaultType === "BRANCH" ? targetParentNode.id : "NONE");
        } else if (targetParentNode.type === "DEPARTMENT") {
          setSelectedDeptId(targetParentNode.id);
          setSelectedBranchId(targetParentNode.branchId || "NONE");
          setSelectedParentId(defaultType === "DEPARTMENT" ? targetParentNode.id : "NONE");
        }
      } else {
        setSelectedBranchId("NONE");
        setSelectedDeptId("NONE");
        setSelectedParentId("NONE");
      }
    }
  }, [open, targetParentNode, defaultType]);

  const handleReset = () => {
    setCode("");
    setName("");
    setSlug("");
    setDescription("");
    setEmail("");
    setPhone("");
    setAddress("");
    setIsActive(true);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (entityType === "BRANCH") {
        const payload = {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          parentId: selectedParentId === "NONE" ? null : selectedParentId,
          description: description.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          isActive,
        };

        const validation = createBranchSchema.safeParse(payload);
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

        await api.post("/organization/branches", validation.data);
        toast.success(`Branch '${validation.data.name}' created successfully!`);
      } else if (entityType === "DEPARTMENT") {
        const payload = {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          branchId: selectedBranchId === "NONE" ? null : selectedBranchId,
          parentId: selectedParentId === "NONE" ? null : selectedParentId,
          description: description.trim() || null,
          isActive,
        };

        const validation = createDepartmentSchema.safeParse(payload);
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

        await api.post("/organization/departments", validation.data);
        toast.success(`Department '${validation.data.name}' created successfully!`);
      } else {
        // TEAM creation
        if (!name.trim()) {
          setErrors({ name: "Team name is required" });
          setIsLoading(false);
          return;
        }
        const teamDeptId = targetParentNode?.type === "DEPARTMENT" ? targetParentNode.id : selectedDeptId;
        if (!teamDeptId || teamDeptId === "NONE") {
          setErrors({ departmentId: "Please select a host department for this team squad" });
          setIsLoading(false);
          return;
        }

        const teamSlug = slug.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

        await api.post("/organization/teams", {
          name: name.trim(),
          slug: teamSlug,
          departmentId: teamDeptId,
          description: description.trim() || null,
          isActive,
        });

        toast.success(`Team squad '${name.trim()}' created successfully!`);
      }

      handleReset();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to create organizational unit"));
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Plus className="size-5 text-primary" /> Create Organizational Unit
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {targetParentNode ? (
              <span>
                Adding unit under parent: <strong className="text-foreground">{targetParentNode.name} ({targetParentNode.code})</strong>
              </span>
            ) : (
              <span>Add a new top-level branch, global department, or squad under Betopia Group.</span>
            )}
          </DialogDescription>

          {/* Unit Type Selector Pills */}
          <div className="flex items-center gap-1.5 pt-3">
            <Button
              type="button"
              variant={entityType === "BRANCH" ? "default" : "outline"}
              size="sm"
              onClick={() => setEntityType("BRANCH")}
              className="h-8 text-xs gap-1.5 flex-1"
            >
              <GitBranch className="size-3.5" /> Branch / Sub-Hub
            </Button>
            <Button
              type="button"
              variant={entityType === "DEPARTMENT" ? "default" : "outline"}
              size="sm"
              onClick={() => setEntityType("DEPARTMENT")}
              className="h-8 text-xs gap-1.5 flex-1"
            >
              <Building2 className="size-3.5" /> Department
            </Button>
            <Button
              type="button"
              variant={entityType === "TEAM" ? "default" : "outline"}
              size="sm"
              onClick={() => setEntityType("TEAM")}
              className="h-8 text-xs gap-1.5 flex-1"
            >
              <Users className="size-3.5" /> Team Squad
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="max-h-[60vh] h-[380px] w-full px-6 py-2">
            <FieldSet>
              <FieldGroup className="space-y-4 pr-2">
                {/* BRANCH CREATION FIELDS */}
                {entityType === "BRANCH" && (
                  <>
                    <Field data-invalid={Boolean(errors.parentId)}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <FieldLabel className="text-xs font-semibold">Parent Branch Hierarchy</FieldLabel>
                        <HelpTooltip text="Select parent branch to form a hierarchical company tree, or leave as Top-Level for direct enterprise branches." />
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field data-invalid={Boolean(errors.code)}>
                        <FieldLabel className="text-xs font-semibold">Branch Code *</FieldLabel>
                        <Input
                          placeholder="e.g. BET-SA, BET-UK"
                          value={code}
                          onChange={(e) => setCode(e.target.value.toUpperCase())}
                          className="font-mono uppercase text-xs"
                          disabled={isLoading}
                        />
                        <FieldError errors={errors.code} />
                      </Field>

                      <Field data-invalid={Boolean(errors.name)}>
                        <FieldLabel className="text-xs font-semibold">Branch Name *</FieldLabel>
                        <Input
                          placeholder="e.g. Softvence Alpha"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="text-xs"
                          disabled={isLoading}
                        />
                        <FieldError errors={errors.name} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel className="text-xs font-semibold">Official Email</FieldLabel>
                        <Input
                          type="email"
                          placeholder="contact@branch.betopia.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="text-xs"
                          disabled={isLoading}
                        />
                      </Field>
                      <Field>
                        <FieldLabel className="text-xs font-semibold">Phone</FieldLabel>
                        <Input
                          placeholder="+1 (555) 019-2834"
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
                        placeholder="e.g. Level 4, Silicon Tower"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="text-xs"
                        disabled={isLoading}
                      />
                    </Field>
                  </>
                )}

                {/* DEPARTMENT CREATION FIELDS */}
                {entityType === "DEPARTMENT" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field data-invalid={Boolean(errors.branchId)}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <FieldLabel className="text-xs font-semibold">Host Branch</FieldLabel>
                          <HelpTooltip text="Select the branch this department belongs to, or Corporate HQ for global functions." />
                        </div>
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
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <FieldLabel className="text-xs font-semibold">Parent Department</FieldLabel>
                          <HelpTooltip text="Optional parent department for nested divisional sub-departments." />
                        </div>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field data-invalid={Boolean(errors.code)}>
                        <FieldLabel className="text-xs font-semibold">Department Code *</FieldLabel>
                        <Input
                          placeholder="e.g. ENG, HR, MKT"
                          value={code}
                          onChange={(e) => setCode(e.target.value.toUpperCase())}
                          className="font-mono uppercase text-xs"
                          disabled={isLoading}
                        />
                        <FieldError errors={errors.code} />
                      </Field>

                      <Field data-invalid={Boolean(errors.name)}>
                        <FieldLabel className="text-xs font-semibold">Department Name *</FieldLabel>
                        <Input
                          placeholder="e.g. Software Engineering"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="text-xs"
                          disabled={isLoading}
                        />
                        <FieldError errors={errors.name} />
                      </Field>
                    </div>
                  </>
                )}

                {/* TEAM SQUAD CREATION FIELDS */}
                {entityType === "TEAM" && (
                  <>
                    <Field data-invalid={Boolean(errors.departmentId)}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <FieldLabel className="text-xs font-semibold">Host Department *</FieldLabel>
                        <HelpTooltip text="Teams operate under a specific functional department." />
                      </div>
                      <Select
                        value={selectedDeptId}
                        onValueChange={(val: string | null) => setSelectedDeptId(val || "NONE")}
                        disabled={isLoading || targetParentNode?.type === "DEPARTMENT"}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Select Host Department" />
                        </SelectTrigger>
                        <SelectContent className="w-full max-h-56">
                          {allDepartments.map((d) => (
                            <SelectItem key={d.id} value={d.id} className="text-xs">
                              {d.name} ({d.code}) {d.branchName ? `[${d.branchName}]` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={errors.departmentId} />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field data-invalid={Boolean(errors.name)}>
                        <FieldLabel className="text-xs font-semibold">Team Name *</FieldLabel>
                        <Input
                          placeholder="e.g. Frontend Web Core"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                          }}
                          className="text-xs"
                          disabled={isLoading}
                        />
                        <FieldError errors={errors.name} />
                      </Field>

                      <Field>
                        <FieldLabel className="text-xs font-semibold">Team Slug</FieldLabel>
                        <Input
                          placeholder="e.g. frontend-web-core"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          className="font-mono text-xs"
                          disabled={isLoading}
                        />
                      </Field>
                    </div>
                  </>
                )}

                {/* Common Description */}
                <Field data-invalid={Boolean(errors.description)}>
                  <FieldLabel className="text-xs font-semibold">Description / Focus</FieldLabel>
                  <Textarea
                    placeholder="Brief description of responsibilities or operational scope..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isLoading}
                    rows={2}
                    className="text-xs"
                  />
                  <FieldError errors={errors.description} />
                </Field>

                {/* Active Status Switch */}
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
              Create {entityType === "BRANCH" ? "Branch" : entityType === "DEPARTMENT" ? "Department" : "Team Squad"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
