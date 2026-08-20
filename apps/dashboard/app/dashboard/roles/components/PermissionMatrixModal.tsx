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
import { Badge } from "@workspace/ui/components/badge";
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
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import {
  Loader2,
  Save,
  ShieldCheck,
  Info,
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
  UserCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { RoleItem } from "./RoleTable";

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

interface PermissionItem {
  id: string;
  code: string;
  module: string;
  description: string;
  supportedScopes?: string[];
  implies?: string[];
  dependsOn?: string[];
}

interface ScopeTypeItem {
  id: string;
  code: string;
  name: string;
  resolutionStrategy: string;
}

interface PermissionMatrixModalProps {
  role: RoleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PermissionMatrixModal({
  role,
  open,
  onOpenChange,
  onSuccess,
}: PermissionMatrixModalProps) {
  const [allPermissions, setAllPermissions] = React.useState<PermissionItem[]>([]);
  const [scopeTypes, setScopeTypes] = React.useState<ScopeTypeItem[]>([]);
  const [selectedScopes, setSelectedScopes] = React.useState<Record<string, string>>({}); // permissionId -> scopeTypeId
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const fetchData = React.useCallback(async () => {
    if (!role) return;
    setIsLoading(true);
    setFetchError(null);

    try {
      const [perms, scopes, rolePerms] = await Promise.all([
        api.get("/permissions"),
        api.get("/permissions/scope-types"),
        api.get(`/organization/roles/${role.id}/permissions`),
      ]);

      setAllPermissions(Array.isArray(perms) ? perms : []);
      setScopeTypes(Array.isArray(scopes) ? scopes : []);

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
      const msg = err.message || "Failed to load permissions matrix";
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  React.useEffect(() => {
    if (open && role) {
      fetchData();
    }
  }, [open, role, fetchData]);

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

  const getPrerequisitePermissions = React.useCallback(
    (perm: PermissionItem): PermissionItem[] => {
      const codeMap = new Map<string, PermissionItem>();
      for (const p of allPermissions) {
        codeMap.set(p.code, p);
      }

      const prereqs: PermissionItem[] = [];
      const visited = new Set<string>();
      const queue = [perm];

      while (queue.length > 0) {
        const current = queue.shift()!;
        const targets = [
          ...(current.implies || []),
          ...(current.dependsOn || []),
        ];

        for (const tCode of targets) {
          if (!visited.has(tCode) && tCode !== perm.code) {
            visited.add(tCode);
            const targetPerm = codeMap.get(tCode);
            if (targetPerm) {
              prereqs.push(targetPerm);
              queue.push(targetPerm);
            }
          }
        }
      }

      return prereqs;
    },
    [allPermissions],
  );

  const getDependentPermissions = React.useCallback(
    (perm: PermissionItem): PermissionItem[] => {
      const dependents: PermissionItem[] = [];
      for (const p of allPermissions) {
        if (p.id === perm.id) continue;
        const targets = [...(p.implies || []), ...(p.dependsOn || [])];
        if (targets.includes(perm.code)) {
          dependents.push(p);
        }
      }
      return dependents;
    },
    [allPermissions],
  );

  const handleTogglePermission = (perm: PermissionItem, isChecked: boolean) => {
    setSelectedScopes((prev) => {
      const copy = { ...prev };
      if (isChecked) {
        if (!copy[perm.id]) {
          const defaultScopeId = getPermissionDefaultScopeId(perm);
          if (!defaultScopeId) {
            toast.error("No valid scope types available.");
            return prev;
          }
          copy[perm.id] = defaultScopeId;
        }

        // Auto-check all prerequisite permissions
        const prereqs = getPrerequisitePermissions(perm);
        const autoAddedCodes: string[] = [];

        for (const prereq of prereqs) {
          if (!copy[prereq.id]) {
            const prereqScopeId = getPermissionDefaultScopeId(prereq);
            if (prereqScopeId) {
              copy[prereq.id] = prereqScopeId;
              autoAddedCodes.push(prereq.code);
            }
          }
        }

        if (autoAddedCodes.length > 0) {
          toast.info(`Auto-enabled prerequisite(s): ${autoAddedCodes.slice(0, 3).join(", ")}${autoAddedCodes.length > 3 ? "..." : ""}`);
        }
      } else {
        delete copy[perm.id];

        // Cascade uncheck: uncheck any checked permissions that depend on this permission
        const dependents = getDependentPermissions(perm);
        const disabledCodes: string[] = [];

        for (const dep of dependents) {
          if (copy[dep.id]) {
            delete copy[dep.id];
            disabledCodes.push(dep.code);
          }
        }

        if (disabledCodes.length > 0) {
          toast.info(`Disabled dependent permission(s): ${disabledCodes.slice(0, 3).join(", ")}${disabledCodes.length > 3 ? "..." : ""}`);
        }
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
          // Also check prerequisites
          const prereqs = getPrerequisitePermissions(p);
          for (const prereq of prereqs) {
            if (!copy[prereq.id]) {
              const prereqScopeId = getPermissionDefaultScopeId(prereq);
              if (prereqScopeId) {
                copy[prereq.id] = prereqScopeId;
              }
            }
          }
        } else {
          delete copy[p.id];
          const dependents = getDependentPermissions(p);
          for (const dep of dependents) {
            delete copy[dep.id];
          }
        }
      }
      return copy;
    });
  };

  const handleSave = async () => {
    if (!role) return;

    const assignments = Object.entries(selectedScopes).map(([permissionId, scopeTypeId]) => ({
      permissionId,
      scopeTypeId,
    }));

    setIsSaving(true);
    try {
      await api.put(`/organization/roles/${role.id}/permissions`, {
        assignments,
      });

      toast.success(`Permission assignments for '${role.name}' saved successfully`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update permissions matrix");
    } finally {
      setIsSaving(false);
    }
  };

  const groupedPermissions = React.useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of allPermissions) {
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
  }, [allPermissions, searchQuery]);

  const enabledCount = Object.keys(selectedScopes).length;

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl sm:min-w-[850px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <DialogTitle className="text-xl font-bold">
              Permission Matrix: {role.name} ({role.code})
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure fine-grained system permission assignments and access resolution scope strategies.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-6 space-y-3 pb-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter by permission code, action or module..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
            <div className="text-xs text-muted-foreground shrink-0 font-medium">
              {enabledCount} of {allPermissions.length} permission(s) granted
            </div>
          </div>

          {fetchError ? (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="size-4" />
              <AlertTitle className="text-xs">Error Loading Permissions</AlertTitle>
              <AlertDescription className="text-[11px]">
                {fetchError}{" "}
                <Button
                  variant="link"
                  size="sm"
                  onClick={fetchData}
                  className="p-0 h-auto text-[11px] underline"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/10 min-h-[300px]">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Loading role permissions matrix...</span>
              </div>
            </div>
          ) : groupedPermissions.size === 0 ? (
            <div className="flex-1 flex items-center justify-center border rounded-lg text-xs text-muted-foreground min-h-[300px]">
              No permissions found matching search filter.
            </div>
          ) : (
            <ScrollArea className="h-[480px] w-full border rounded-lg bg-card p-3">
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
                                  id={`matrix-perm-${perm.id}`}
                                  checked={isGranted}
                                  onCheckedChange={(checked) => handleTogglePermission(perm, Boolean(checked))}
                                  className="mt-0.5"
                                />
                                <div className="flex flex-col min-w-0 gap-0.5">
                                  <Label
                                    htmlFor={`matrix-perm-${perm.id}`}
                                    className="font-mono text-xs font-semibold cursor-pointer text-foreground flex items-center gap-1.5"
                                  >
                                    {perm.code}
                                  </Label>
                                  <span className="text-[11px] text-muted-foreground line-clamp-1">
                                    {perm.description}
                                  </span>
                                  {((perm.dependsOn && perm.dependsOn.length > 0) || (perm.implies && perm.implies.length > 0)) && (
                                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                      {perm.dependsOn && perm.dependsOn.length > 0 && (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-mono">
                                          requires: {perm.dependsOn.join(", ")}
                                        </span>
                                      )}
                                      {perm.implies && perm.implies.length > 0 && (
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20 font-mono">
                                          auto-grants: {perm.implies.join(", ")}
                                        </span>
                                      )}
                                    </div>
                                  )}
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
        </div>

        <DialogFooter className="p-6 pt-3 border-t mt-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || isLoading} className="gap-1.5">
            {isSaving && <Loader2 className="size-3.5 animate-spin" />}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
