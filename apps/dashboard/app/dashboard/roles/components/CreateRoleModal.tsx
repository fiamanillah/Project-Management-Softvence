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
import { Checkbox } from "@workspace/ui/components/checkbox";
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
import { Badge } from "@workspace/ui/components/badge";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import {
  Loader2,
  ShieldCheck,
  UserCheck,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  RefreshCw,
  Ban,
  Globe,
  Building2,
  Users,
  Briefcase,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { HelpTooltip } from "@/components/HelpTooltip";

function getScopeIcon(strategy?: string) {
  switch (strategy) {
    case "Global":
      return <Globe className="size-3.5 text-blue-500 shrink-0" />;
    case "OwnDepartment":
    case "ExplicitDepartments":
      return <Building2 className="size-3.5 text-amber-500 shrink-0" />;
    case "OwnTeam":
    case "ExplicitTeams":
      return <Users className="size-3.5 text-emerald-500 shrink-0" />;
    case "OwnProject":
    case "ExplicitProjects":
      return <Briefcase className="size-3.5 text-indigo-500 shrink-0" />;
    case "OwnProfile":
      return <UserCheck className="size-3.5 text-purple-500 shrink-0" />;
    default:
      return <Zap className="size-3.5 text-primary shrink-0" />;
  }
}

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string; code: string; parent?: { id?: string; code?: string; name?: string } | null }[];
  onSuccess: () => void;
}

interface PermissionItem {
  id: string;
  code: string;
  module: string;
  description: string;
  supportedScopes?: string[];
}

interface ScopeTypeItem {
  id: string;
  code: string;
  name: string;
  resolutionStrategy: string;
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
  const [searchQuery, setSearchQuery] = React.useState("");

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

  const getPermissionDefaultScopeId = React.useCallback(
    (perm: PermissionItem) => {
      const available =
        perm.supportedScopes && perm.supportedScopes.length > 0
          ? scopeTypes.filter((st) =>
              perm.supportedScopes!.includes(st.resolutionStrategy || st.code),
            )
          : scopeTypes;
      return available[0]?.id || (scopeTypes[0]?.id ?? null);
    },
    [scopeTypes],
  );

  const handleTogglePermission = (perm: PermissionItem, isChecked: boolean) => {
    setSelectedScopes((prev) => {
      const copy = { ...prev };
      if (isChecked) {
        if (!copy[perm.id]) {
          const defaultScopeId = getPermissionDefaultScopeId(perm);
          if (!defaultScopeId) {
            toast.error("No valid scope types available. Unable to enable permission.");
            return prev;
          }
          copy[perm.id] = defaultScopeId;
        }
      } else {
        delete copy[perm.id];
      }
      return copy;
    });
  };

  const handleScopeChange = (permissionId: string, scopeTypeId: string | null) => {
    setSelectedScopes((prev) => {
      const copy = { ...prev };
      if (!scopeTypeId || scopeTypeId === "NONE") {
        delete copy[permissionId];
      } else {
        copy[permissionId] = scopeTypeId;
      }
      return copy;
    });
  };

  const handleToggleModule = (perms: PermissionItem[], shouldInclude: boolean) => {
    setSelectedScopes((prev) => {
      const copy = { ...prev };
      for (const p of perms) {
        if (shouldInclude) {
          if (!copy[p.id]) {
            const defaultScopeId = getPermissionDefaultScopeId(p);
            if (defaultScopeId) {
              copy[p.id] = defaultScopeId;
            }
          }
        } else {
          delete copy[p.id];
        }
      }
      return copy;
    });
  };

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
    setSearchQuery("");
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

  // Group permissions by module
  const groupedPermissions = React.useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of permissions) {
      if (
        searchQuery &&
        !p.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.module.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        continue;
      }
      const existing = map.get(p.module) || [];
      existing.push(p);
      map.set(p.module, existing);
    }
    return map;
  }, [permissions, searchQuery]);

  const selectedDept = React.useMemo(() => {
    if (!departmentId || departmentId === "NONE") return null;
    return departments.find((d) => d.id === departmentId);
  }, [departments, departmentId]);

  const enabledCount = Object.keys(selectedScopes).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleResetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-5xl sm:min-w-[820px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <DialogTitle className="text-xl font-bold">Create Security Role</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Define a new security authorization role and configure its permission scope matrix assignments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden px-6"
          >
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="details" className="text-xs font-semibold">
                1. Role Profile
              </TabsTrigger>
              <TabsTrigger value="permissions" className="text-xs font-semibold flex items-center gap-2">
                2. Permission Matrix
                {enabledCount > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-primary text-primary-foreground">
                    {enabledCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DETAILS */}
            <TabsContent value="details" className="flex-1 overflow-hidden pb-2">
              <ScrollArea className="h-[480px] w-full pr-4">
                <div className="space-y-4 pr-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="code" className="text-xs font-semibold">
                          Role Code <span className="text-destructive">*</span>
                        </Label>
                        <HelpTooltip text="Unique uppercase authorization key (e.g. DEV_LEAD, QA_ANALYST, HR_EXEC)." />
                      </div>
                      <Input
                        id="code"
                        placeholder="e.g. DEV_LEAD, QA_ANALYST"
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
                        <Label htmlFor="name" className="text-xs font-semibold">
                          Role Name <span className="text-destructive">*</span>
                        </Label>
                        <HelpTooltip text="Descriptive name of the security authorization role." />
                      </div>
                      <Input
                        id="name"
                        placeholder="e.g. Lead Software Engineer"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="text-xs"
                        disabled={isLoading}
                      />
                      {formErrors.name && (
                        <p className="text-[11px] text-destructive font-medium">{formErrors.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="description" className="text-xs font-semibold">
                        Description
                      </Label>
                      <HelpTooltip text="Optional summary of access responsibilities and administrative scope for this role." />
                    </div>
                    <Textarea
                      id="description"
                      placeholder="Summarize the authorization responsibilities and access level for this role..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="text-xs resize-none"
                      rows={2}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <TabsContent value="permissions" className="flex-1 flex flex-col overflow-hidden space-y-3 pb-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search permission code, action or module..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
                <div className="text-xs text-muted-foreground shrink-0 font-medium">
                  {enabledCount} of {permissions.length} permission(s) granted
                </div>
              </div>

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
                <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/10 min-h-[300px]">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span className="text-xs">Loading permission registry catalogue...</span>
                  </div>
                </div>
              ) : groupedPermissions.size === 0 ? (
                <div className="flex-1 flex items-center justify-center border rounded-lg text-xs text-muted-foreground min-h-[300px]">
                  No permissions found matching search filter.
                </div>
              ) : (
                <ScrollArea className="h-[460px] w-full border rounded-lg bg-card p-3">
                  <div className="space-y-6 pr-2">
                    {Array.from(groupedPermissions.entries()).map(([moduleName, perms]) => {
                      const allModuleSelected = perms.every((p) => Boolean(selectedScopes[p.id]));
                      const someModuleSelected = perms.some((p) => Boolean(selectedScopes[p.id])) && !allModuleSelected;

                      return (
                        <div key={moduleName} className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
                          {/* Module Header */}
                          <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5 rounded-md">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 hover:bg-transparent text-xs font-bold"
                                onClick={() => handleToggleModule(perms, !allModuleSelected)}
                              >
                                {allModuleSelected ? (
                                  <CheckSquare className="size-4 text-primary mr-1.5" />
                                ) : someModuleSelected ? (
                                  <Square className="size-4 text-primary fill-primary/30 mr-1.5" />
                                ) : (
                                  <Square className="size-4 text-muted-foreground mr-1.5" />
                                )}
                                <span className="uppercase tracking-wider text-[11px]">{moduleName}</span>
                              </Button>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                                {perms.filter((p) => selectedScopes[p.id]).length}/{perms.length}
                              </Badge>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-[11px] h-6 text-muted-foreground hover:text-foreground"
                              onClick={() => handleToggleModule(perms, !allModuleSelected)}
                            >
                              {allModuleSelected ? "Deselect All" : "Select All"}
                            </Button>
                          </div>

                          {/* Permission Rows */}
                          <div className="grid grid-cols-1 gap-2 pl-2">
                            {perms.map((perm) => {
                              const isGranted = Boolean(selectedScopes[perm.id]);
                              const currentScopeId = selectedScopes[perm.id] || "NONE";
                              const currentScope = scopeTypes.find((s) => s.id === currentScopeId);

                              const availableScopes =
                                perm.supportedScopes && perm.supportedScopes.length > 0
                                  ? scopeTypes.filter((st) =>
                                      perm.supportedScopes!.includes(st.resolutionStrategy || st.code),
                                    )
                                  : scopeTypes;

                              return (
                                <div
                                  key={perm.id}
                                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md border text-xs transition-colors ${
                                    isGranted ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/30"
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                    <Checkbox
                                      id={`perm-${perm.id}`}
                                      checked={isGranted}
                                      onCheckedChange={(checked) => handleTogglePermission(perm, Boolean(checked))}
                                      className="mt-0.5"
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <Label
                                        htmlFor={`perm-${perm.id}`}
                                        className="font-mono text-xs font-semibold cursor-pointer text-foreground flex items-center gap-1.5"
                                      >
                                        {perm.code}
                                      </Label>
                                      <span className="text-[11px] text-muted-foreground line-clamp-1">
                                        {perm.description}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Scope Dropdown */}
                                  <div className="flex items-center gap-2 pl-6 sm:pl-0 shrink-0">
                                    {isGranted ? (
                                      <Select
                                        value={currentScopeId}
                                        onValueChange={(val: string | null) => handleScopeChange(perm.id, val)}
                                      >
                                        <SelectTrigger className="h-7 text-xs w-[180px] bg-background">
                                          <SelectValue placeholder="Select Scope">
                                            <div className="flex items-center gap-1.5 truncate">
                                              {getScopeIcon(currentScope?.resolutionStrategy)}
                                              <span className="truncate">{currentScope?.name || "Select Scope"}</span>
                                            </div>
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="max-h-56">
                                          {availableScopes.map((st) => (
                                            <SelectItem key={st.id} value={st.id} className="text-xs">
                                              <div className="flex items-center gap-1.5">
                                                {getScopeIcon(st.resolutionStrategy)}
                                                <span>{st.name}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground/60 italic flex items-center gap-1">
                                        <Ban className="size-3" /> Denied / No Grant
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>

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
              Create Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
