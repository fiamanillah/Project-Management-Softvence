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

interface CreateDesignationModalProps {
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

export function CreateDesignationModal({
  open,
  onOpenChange,
  departments,
  onSuccess,
}: CreateDesignationModalProps) {
  const [activeTab, setActiveTab] = React.useState("details");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
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
    setDepartmentId("");
    setHierarchyLevel(3);
    setIsLeadership(false);
    setSelectedScopes({});
    setSearchQuery("");
    setActiveTab("details");
    setFormErrors({});
    setFetchError(null);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!code.trim()) errors.code = "Designation code is required";
    if (!name.trim()) errors.name = "Designation title is required";
    if (!departmentId) errors.departmentId = "Please select a department";
    if (hierarchyLevel < 1 || hierarchyLevel > 10) errors.hierarchyLevel = "Hierarchy level must be between 1 and 10";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly.");
      setActiveTab("details");
      return;
    }

    setIsLoading(true);
    try {
      const assignments = Object.entries(selectedScopes)
        .filter(([_, scopeTypeId]) => Boolean(scopeTypeId))
        .map(([permissionId, scopeTypeId]) => ({
          permissionId,
          scopeTypeId,
        }));

      await api.post("/organization/designations", {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        departmentId,
        hierarchyLevel,
        isLeadership,
        assignments,
      });

      toast.success("Designation created successfully with initial permissions!");
      onOpenChange(false);
      onSuccess();
      handleResetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to create designation");
    } finally {
      setIsLoading(false);
    }
  };

  // Group & Filter permissions by module
  const filteredPermissions = React.useMemo(() => {
    if (!searchQuery.trim()) return permissions;
    const q = searchQuery.toLowerCase();
    return permissions.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.module && p.module.toLowerCase().includes(q)),
    );
  }, [permissions, searchQuery]);

  const groupedModules = React.useMemo(() => {
    const map: Record<string, PermissionItem[]> = {};
    for (const p of filteredPermissions) {
      const mod = p.module || "General";
      if (!map[mod]) map[mod] = [];
      map[mod].push(p);
    }
    return map;
  }, [filteredPermissions]);

  const configuredCount = Object.keys(selectedScopes).length;
  const totalFilteredCount = filteredPermissions.length;
  const isAllFilteredChecked = totalFilteredCount > 0 && filteredPermissions.every((p) => Boolean(selectedScopes[p.id]));

  const handleToggleAllFiltered = (shouldInclude: boolean) => {
    setSelectedScopes((prev) => {
      const copy = { ...prev };
      for (const p of filteredPermissions) {
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

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleResetForm();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="size-5 text-primary" /> Create New Designation
          </DialogTitle>
          <DialogDescription>
            Configure organizational role metadata and grant initial task permission access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="details" className="gap-2">
                <UserCheck className="size-4" /> Designation Details
                {Object.keys(formErrors).length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 font-bold">
                    !
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="permissions" className="gap-2">
                <ShieldCheck className="size-4" /> Permissions & Access
                {configuredCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30 font-bold">
                    {configuredCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DETAILS */}
            <TabsContent value="details" className="space-y-4 pt-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="designation-code" className="text-xs font-medium">Designation Code <span className="text-destructive">*</span></Label>
                  <Input
                    id="designation-code"
                    placeholder="SR_DEV"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (formErrors.code) setFormErrors((prev) => ({ ...prev, code: "" }));
                    }}
                    aria-invalid={Boolean(formErrors.code)}
                    className={formErrors.code ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {formErrors.code && (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {formErrors.code}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hierarchy-level" className="text-xs font-medium">Hierarchy Level (1-10) <span className="text-destructive">*</span></Label>
                  <Input
                    id="hierarchy-level"
                    type="number"
                    min={1}
                    max={10}
                    value={hierarchyLevel}
                    onChange={(e) => {
                      setHierarchyLevel(Number(e.target.value));
                      if (formErrors.hierarchyLevel) setFormErrors((prev) => ({ ...prev, hierarchyLevel: "" }));
                    }}
                    aria-invalid={Boolean(formErrors.hierarchyLevel)}
                    className={formErrors.hierarchyLevel ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {formErrors.hierarchyLevel && (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {formErrors.hierarchyLevel}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="designation-title" className="text-xs font-medium">Designation Title <span className="text-destructive">*</span></Label>
                <Input
                  id="designation-title"
                  placeholder="Senior Software Engineer"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  aria-invalid={Boolean(formErrors.name)}
                  className={formErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="size-3" /> {formErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department-select" className="text-xs font-medium">Department <span className="text-destructive">*</span></Label>
                {(() => {
                  const selectedDept = departments.find((d) => d.id === departmentId);
                  return (
                    <Select
                      value={departmentId}
                      onValueChange={(val: string | null) => {
                        if (val) {
                          setDepartmentId(val);
                          if (formErrors.departmentId) setFormErrors((prev) => ({ ...prev, departmentId: "" }));
                        }
                      }}
                    >
                      <SelectTrigger
                        id="department-select"
                        aria-invalid={Boolean(formErrors.departmentId)}
                        className={`w-full ${formErrors.departmentId ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      >
                        <SelectValue placeholder="Select department">
                          {selectedDept
                            ? selectedDept.parent
                              ? `${selectedDept.parent.name} ↳ ${selectedDept.name} (${selectedDept.code})`
                              : `${selectedDept.name} (${selectedDept.code})`
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="w-full">
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.parent ? `${dept.parent.name} ↳ ${dept.name} (${dept.code})` : `${dept.name} (${dept.code})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
                {formErrors.departmentId && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="size-3" /> {formErrors.departmentId}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3 shadow-xs">
                <div className="space-y-0.5">
                  <Label htmlFor="leadership-switch" className="text-sm font-medium cursor-pointer">Leadership Position</Label>
                  <p className="text-xs text-muted-foreground">
                    Flags leadership responsibilities for team management.
                  </p>
                </div>
                <Switch id="leadership-switch" checked={isLeadership} onCheckedChange={setIsLeadership} />
              </div>
            </TabsContent>

            {/* TAB 2: PERMISSION MATRIX */}
            <TabsContent value="permissions" className="flex-1 flex flex-col min-h-0 pt-3 gap-3 overflow-hidden">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search permissions or modules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {totalFilteredCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs gap-1"
                      onClick={() => handleToggleAllFiltered(!isAllFilteredChecked)}
                    >
                      {isAllFilteredChecked ? (
                        <>
                          <Square className="size-3.5" /> Unselect Filtered ({totalFilteredCount})
                        </>
                      ) : (
                        <>
                          <CheckSquare className="size-3.5" /> Select Filtered ({totalFilteredCount})
                        </>
                      )}
                    </Button>
                  )}
                  {configuredCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedScopes({})}
                    >
                      Clear All ({configuredCount})
                    </Button>
                  )}
                </div>
              </div>

              {fetchError ? (
                <Alert variant="destructive" className="my-4 shrink-0">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Error Loading Permissions</AlertTitle>
                  <AlertDescription className="flex items-center justify-between mt-2">
                    <span>{fetchError}</span>
                    <Button type="button" variant="outline" size="sm" onClick={loadPermissionData} className="gap-1.5 text-xs">
                      <RefreshCw className="size-3.5" /> Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : isFetchingPermissions ? (
                <div className="h-48 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Loading permission definitions...</span>
                </div>
              ) : scopeTypes.length === 0 ? (
                <Alert variant="destructive" className="my-4 shrink-0">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Scope Types Missing</AlertTitle>
                  <AlertDescription className="mt-1 text-xs">
                    No permission scope types were found in system configuration. Please contact your system administrator.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[460px] max-h-[calc(90vh-300px)] min-h-[300px] w-full border rounded-lg p-3 bg-card/50 overflow-y-auto">
                  <div className="space-y-5 pr-2">
                    {Object.keys(groupedModules).length === 0 ? (
                      <p className="text-xs text-center text-muted-foreground py-6">
                        No permissions found matching search filter.
                      </p>
                    ) : (
                      Object.entries(groupedModules).map(([moduleName, perms]) => {
                        const allModuleChecked = perms.length > 0 && perms.every((p) => Boolean(selectedScopes[p.id]));
                        const someModuleChecked = perms.some((p) => Boolean(selectedScopes[p.id]));
                        const isModuleIndeterminate = someModuleChecked && !allModuleChecked;

                        return (
                          <div key={moduleName} className="space-y-2">
                            <div className="flex items-center justify-between border-b pb-1.5 pt-1">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={allModuleChecked}
                                  indeterminate={isModuleIndeterminate}
                                  onCheckedChange={() =>
                                    handleToggleModule(perms, !allModuleChecked)
                                  }
                                  id={`module-${moduleName}`}
                                />
                                <Label
                                  htmlFor={`module-${moduleName}`}
                                  className="font-bold text-xs tracking-wide text-primary flex items-center gap-1.5 cursor-pointer select-none"
                                >
                                  <Badge variant="outline" className="text-[11px]">{moduleName}</Badge>
                                  <span className="text-[11px] text-muted-foreground font-normal">
                                    ({perms.length} actions)
                                  </span>
                                </Label>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-muted-foreground hover:text-primary px-2"
                                onClick={() => handleToggleModule(perms, !allModuleChecked)}
                              >
                                {allModuleChecked ? (
                                  <span className="flex items-center gap-1"><Square className="size-3" /> Unselect Module</span>
                                ) : (
                                  <span className="flex items-center gap-1"><CheckSquare className="size-3" /> Select Module</span>
                                )}
                              </Button>
                            </div>

                            <div className="grid gap-2">
                              {perms.map((p) => {
                                const currentScopeId = selectedScopes[p.id] || "NONE";
                                const isChecked = Boolean(selectedScopes[p.id]);

                                return (
                                  <div
                                    key={p.id}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-md border transition-colors gap-2 ${
                                      isChecked
                                        ? "bg-primary/5 border-primary/40 shadow-2xs"
                                        : "bg-card hover:bg-accent/30 border-border/60"
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) =>
                                          handleTogglePermission(p, Boolean(checked))
                                        }
                                        id={`perm-${p.id}`}
                                        className="mt-0.5"
                                      />
                                      <Label
                                        htmlFor={`perm-${p.id}`}
                                        className="space-y-0.5 cursor-pointer select-none flex-1 min-w-0"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono font-semibold text-xs text-foreground">
                                            {p.code}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                          {p.description}
                                        </p>
                                      </Label>
                                    </div>

                                    <div className="w-full sm:w-64 shrink-0 pl-6 sm:pl-0">
                                      {(() => {
                                        const selectedScope = scopeTypes.find((st) => st.id === currentScopeId);
                                        const availableScopeTypes =
                                          p.supportedScopes && p.supportedScopes.length > 0
                                            ? scopeTypes.filter((st) =>
                                                p.supportedScopes!.includes(st.resolutionStrategy || st.code),
                                              )
                                            : scopeTypes;

                                        return (
                                          <Select
                                            value={currentScopeId}
                                            onValueChange={(val: string | null) => handleScopeChange(p.id, val)}
                                          >
                                            <SelectTrigger className="w-full h-8 text-xs">
                                              <SelectValue placeholder="No Access (Not Included)">
                                                {currentScopeId === "NONE" ? (
                                                  <span className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Ban className="size-3.5 text-rose-500 shrink-0" />
                                                    <span>No Access (Not Included)</span>
                                                  </span>
                                                ) : selectedScope ? (
                                                  <span className="flex items-center gap-1.5 font-medium">
                                                    {getScopeIcon(selectedScope.resolutionStrategy)}
                                                    <span>{selectedScope.name}</span>
                                                  </span>
                                                ) : undefined}
                                              </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="w-full">
                                              <SelectItem value="NONE" className="text-rose-600 dark:text-rose-400 font-medium">
                                                <div className="flex items-center gap-1.5">
                                                  <Ban className="size-3.5 text-rose-500 shrink-0" />
                                                  <span>No Access (Not Included)</span>
                                                </div>
                                              </SelectItem>
                                              {availableScopeTypes.map((st) => (
                                                <SelectItem key={st.id} value={st.id}>
                                                  <div className="flex items-center gap-1.5">
                                                    {getScopeIcon(st.resolutionStrategy)}
                                                    <span>{st.name}</span>
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isFetchingPermissions}>
              {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Create Designation {configuredCount > 0 ? `(${configuredCount} Permissions)` : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
