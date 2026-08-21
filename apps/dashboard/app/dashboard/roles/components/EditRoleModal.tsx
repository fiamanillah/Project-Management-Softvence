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
  Pencil,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { HelpTooltip } from "@/components/HelpTooltip";
import type { RoleItem } from "./RoleTable";
import {
  RolePermissionMatrixEditor,
  type PermissionItem,
  type ScopeTypeItem,
} from "./RolePermissionMatrixEditor";

interface EditRoleModalProps {
  role: RoleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string; code: string; parent?: { id?: string; code?: string; name?: string } | null }[];
  initialTab?: "details" | "permissions";
  onSuccess: () => void;
}

export function EditRoleModal({
  role,
  open,
  onOpenChange,
  departments,
  initialTab = "details",
  onSuccess,
}: EditRoleModalProps) {
  const [activeTab, setActiveTab] = React.useState<string>(initialTab);
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
  const [isFetchingData, setIsFetchingData] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!role) return;
    setIsFetchingData(true);
    setFetchError(null);

    try {
      const [perms, scopes, rolePerms] = await Promise.all([
        api.get("/permissions"),
        api.get("/permissions/scope-types"),
        api.get(`/organization/roles/${role.id}/permissions`),
      ]);

      setPermissions(Array.isArray(perms) ? perms : []);
      setScopeTypes(Array.isArray(scopes) ? scopes : []);

      // Preload current grants
      const grantsMap: Record<string, string> = {};
      if (rolePerms && Array.isArray(rolePerms.permissions)) {
        rolePerms.permissions.forEach((grant: any) => {
          if (grant.permissionId && grant.scopeTypeId) {
            grantsMap[grant.permissionId] = grant.scopeTypeId;
          }
        });
      }
      setSelectedScopes(grantsMap);
    } catch (err: any) {
      const errMsg = err.message || "Failed to load role permissions matrix";
      setFetchError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsFetchingData(false);
    }
  }, [role]);

  // Sync role details when opened
  React.useEffect(() => {
    if (role && open) {
      setName(role.name || "");
      setDescription(role.description || "");
      setDepartmentId(role.department?.id || "");
      setHierarchyLevel(role.hierarchyLevel ?? 3);
      setIsLeadership(Boolean(role.isLeadership));
      setActiveTab(initialTab);
      setFormErrors({});
      loadData();
    }
  }, [role, open, initialTab, loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setFormErrors({});

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormErrors({ name: "Role display name is required" });
      setActiveTab("details");
      return;
    }

    const assignments = Object.entries(selectedScopes).map(([permissionId, scopeTypeId]) => ({
      permissionId,
      scopeTypeId,
    }));

    setIsLoading(true);
    try {
      await api.patch(`/organization/roles/${role.id}`, {
        name: trimmedName,
        description: description.trim() || undefined,
        departmentId: departmentId === "NONE" || !departmentId ? null : departmentId,
        hierarchyLevel: Number(hierarchyLevel) || 1,
        isLeadership,
        assignments,
      });

      toast.success(`Role '${trimmedName}' updated successfully`);
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
        toast.error(err.message || "Failed to update role");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDept = departments.find((d) => d.id === departmentId);
  const grantedCount = Object.keys(selectedScopes).length;

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl sm:min-w-[850px] h-[750px] max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              <DialogTitle className="text-xl font-bold">
                Edit Role: {role.name} ({role.code})
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify role attributes, organizational department bindings, and granular permission scope grants.
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
                        <Label htmlFor="edit-code" className="text-xs font-semibold">
                          Role Code (Immutable)
                        </Label>
                        <HelpTooltip text="Role code identifiers cannot be modified once created." />
                      </div>
                      <Input
                        id="edit-code"
                        value={role.code}
                        disabled
                        className="text-xs font-mono bg-muted text-muted-foreground cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="edit-name" className="text-xs font-semibold">
                          Role Display Name <span className="text-destructive">*</span>
                        </Label>
                        <HelpTooltip text="Human-readable title displayed on dashboard and assignment selects." />
                      </div>
                      <Input
                        id="edit-name"
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
                      <Label htmlFor="edit-description" className="text-xs font-semibold">
                        Description
                      </Label>
                      <HelpTooltip text="Details regarding the responsibilities and authority scope of this role." />
                    </div>
                    <Textarea
                      id="edit-description"
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
                        <Label htmlFor="edit-departmentId" className="text-xs font-semibold">
                          Department Scope
                        </Label>
                        <HelpTooltip text="Associate this role with a specific department or select System-Wide for global access." />
                      </div>
                      <Select
                        value={departmentId || "NONE"}
                        onValueChange={(val: string | null) => setDepartmentId(val === "NONE" || !val ? "" : val)}
                        disabled={isLoading}
                      >
                        <SelectTrigger id="edit-departmentId" className="text-xs w-full">
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
                        <Label htmlFor="edit-hierarchyLevel" className="text-xs font-semibold">
                          Hierarchy Tier Level
                        </Label>
                        <HelpTooltip text="Authority rank tier (Tier 1 = Top Executive Authority, Tier 5 = Contributor)." />
                      </div>
                      <Input
                        id="edit-hierarchyLevel"
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
                          Leadership / Managerial Authority
                        </Label>
                        <HelpTooltip text="Enables managerial scope resolution across team and organizational boundaries." />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Grants team and organizational leadership scope resolution.
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
                      onClick={loadData}
                      className="p-0 h-auto text-[11px] underline"
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : isFetchingData ? (
                <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/10 min-h-[350px]">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span className="text-xs">Loading role permissions matrix...</span>
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
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="size-3.5 animate-spin" />}
              Save Role Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
