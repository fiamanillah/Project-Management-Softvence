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
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import {
  Loader2,
  ShieldCheck,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { HelpTooltip } from "@/components/HelpTooltip";
import {
  RolePermissionMatrixEditor,
  type PermissionItem,
  type ScopeTypeItem,
} from "./RolePermissionMatrixEditor";

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string; code: string; parent?: { id?: string; code?: string; name?: string } | null }[];
  onSuccess: () => void;
}

export function CreateRoleModal({
  open,
  onOpenChange,
  departments,
  onSuccess,
}: CreateRoleModalProps) {
  const [activeTab, setActiveTab] = React.useState("details");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [hierarchyLevel, setHierarchyLevel] = React.useState(3);
  const [isLeadership, setIsLeadership] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Permission Matrix State
  const [permissions, setPermissions] = React.useState<PermissionItem[]>([]);
  const [scopeTypes, setScopeTypes] = React.useState<ScopeTypeItem[]>([]);
  const [selectedScopes, setSelectedScopes] = React.useState<Record<string, string>>({}); // permissionId -> scopeTypeId
  const [isFetchingPermissions, setIsFetchingPermissions] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const loadPermissionData = React.useCallback(async () => {
    setIsFetchingPermissions(true);
    setFetchError(null);
    try {
      const [perms, scopes] = await Promise.all([
        api.get("/permissions"),
        api.get("/permissions/scope-types"),
      ]);
      setPermissions(Array.isArray(perms) ? perms : []);
      setScopeTypes(Array.isArray(scopes) ? scopes : []);
    } catch (err: any) {
      const errMsg = err.message || "Failed to load permission definitions";
      setFetchError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsFetchingPermissions(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      loadPermissionData();
    }
  }, [open, loadPermissionData]);

  const handleResetForm = () => {
    setCode("");
    setName("");
    setDescription("");
    setDepartmentId("");
    setHierarchyLevel(3);
    setIsLeadership(false);
    setSelectedScopes({});
    setFormErrors({});
    setActiveTab("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    const errors: Record<string, string> = {};
    if (!trimmedCode) errors.code = "Role Code is required (e.g. DEV_LEAD)";
    if (!trimmedName) errors.name = "Role Name is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setActiveTab("details");
      return;
    }

    const assignments = Object.entries(selectedScopes).map(([permissionId, scopeTypeId]) => ({
      permissionId,
      scopeTypeId,
    }));

    setIsLoading(true);
    try {
      await api.post("/organization/roles", {
        code: trimmedCode,
        name: trimmedName,
        description: description.trim() || undefined,
        departmentId: departmentId === "NONE" || !departmentId ? null : departmentId,
        hierarchyLevel: Number(hierarchyLevel) || 1,
        isLeadership,
        assignments,
      });

      toast.success(`Role '${trimmedName}' created successfully`);
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
        toast.error(err.message || "Failed to create role");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDept = departments.find((d) => d.id === departmentId);
  const grantedCount = Object.keys(selectedScopes).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleResetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-5xl sm:min-w-[850px] h-[750px] max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <DialogTitle className="text-xl font-bold">Create Organizational Role</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Define a new organizational role with fine-grained scoped permission policies.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 min-h-0 flex flex-col overflow-hidden px-6"
          >
            <TabsList className="grid w-full grid-cols-2 mb-3 shrink-0">
              <TabsTrigger value="details" className="text-xs">
                Role Details & Hierarchy
              </TabsTrigger>
              <TabsTrigger value="permissions" className="text-xs flex items-center gap-1.5">
                Permissions & Scopes
                {grantedCount > 0 && (
                  <span className="ml-1 bg-primary/20 text-primary font-mono text-[10px] px-1.5 py-0.2 rounded-full">
                    {grantedCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ROLE DETAILS */}
            <TabsContent value="details" className="flex-1 min-h-0 overflow-hidden space-y-4 focus-visible:outline-none">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {Object.keys(formErrors).length > 0 && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="size-4" />
                      <AlertTitle className="text-xs">Form Validation Error</AlertTitle>
                      <AlertDescription className="text-[11px]">
                        Please check the required fields before submitting.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="code" className="text-xs font-semibold">
                          Role Code <span className="text-destructive">*</span>
                        </Label>
                        <HelpTooltip text="Unique identifier in screaming snake case (e.g., DEV_LEAD, QA_ENGINEER)." />
                      </div>
                      <Input
                        id="code"
                        placeholder="DEV_LEAD"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className={`text-xs font-mono ${formErrors.code ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        disabled={isLoading}
                      />
                      {formErrors.code && (
                        <span className="text-[11px] text-destructive">{formErrors.code}</span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="name" className="text-xs font-semibold">
                          Role Display Name <span className="text-destructive">*</span>
                        </Label>
                        <HelpTooltip text="Human-readable title displayed on dashboard and assignment selects." />
                      </div>
                      <Input
                        id="name"
                        placeholder="Developer Lead"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`text-xs ${formErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        disabled={isLoading}
                      />
                      {formErrors.name && (
                        <span className="text-[11px] text-destructive">{formErrors.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="description" className="text-xs font-semibold">
                        Description
                      </Label>
                      <HelpTooltip text="Optional details regarding the responsibilities and scope of this role." />
                    </div>
                    <Textarea
                      id="description"
                      placeholder="Responsible for leading engineering sub-teams and reviewing code artifacts..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="text-xs resize-none"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="departmentId" className="text-xs font-semibold">
                          Department Scope
                        </Label>
                        <HelpTooltip text="Associate this role with a specific department, or select System-Wide for global access." />
                      </div>
                      <Select
                        value={departmentId || "NONE"}
                        onValueChange={(val: string | null) => setDepartmentId(val === "NONE" || !val ? "" : val)}
                        disabled={isLoading}
                      >
                        <SelectTrigger id="departmentId" className="text-xs w-full">
                          <SelectValue placeholder="System-Wide (No specific department)">
                            {selectedDept
                              ? `${selectedDept.parent ? `${selectedDept.parent.name} → ` : ""}${selectedDept.name} (${selectedDept.code})`
                              : "System-Wide (Global / Across All Departments)"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="w-full max-h-56">
                          <SelectItem value="NONE" className="text-xs font-medium text-muted-foreground">
                            System-Wide (Global / Across All Departments)
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
                        <Label htmlFor="hierarchyLevel" className="text-xs font-semibold">
                          Hierarchy Tier Level
                        </Label>
                        <HelpTooltip text="Authority rank tier (Level 1 = Top Executive Authority, Level 5 = Base Contributor)." />
                      </div>
                      <Input
                        id="hierarchyLevel"
                        type="number"
                        min={1}
                        max={10}
                        value={hierarchyLevel}
                        onChange={(e) => setHierarchyLevel(Number(e.target.value) || 1)}
                        className="text-xs"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                          <UserCheck className="size-3.5 text-amber-500" />
                          Leadership / Managerial Role
                        </Label>
                        <HelpTooltip text="Grants authority flags qualifying user for leadership and departmental scope strategies." />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Grants team and organizational leadership authority flags.
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
            </TabsContent>

            {/* TAB 2: PERMISSION MATRIX */}
            <TabsContent value="permissions" className="flex-1 min-h-0 flex flex-col overflow-hidden pb-2 focus-visible:outline-none">
              {fetchError ? (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="size-4" />
                  <AlertTitle className="text-xs">Failed to load permissions</AlertTitle>
                  <AlertDescription className="text-[11px]">
                    {fetchError}{" "}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={loadPermissionData}
                      className="p-0 h-auto text-[11px] underline"
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : isFetchingPermissions ? (
                <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/10 min-h-[350px]">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span className="text-xs">Loading permission registry catalogue...</span>
                  </div>
                </div>
              ) : (
                <RolePermissionMatrixEditor
                  permissions={permissions}
                  scopeTypes={scopeTypes}
                  selectedScopes={selectedScopes}
                  onChange={setSelectedScopes}
                  disabled={isLoading}
                />
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="p-6 pt-3 border-t mt-auto shrink-0">
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
              Create Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
