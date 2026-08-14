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
import type { DesignationItem } from "./DesignationTable";

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
}

interface ScopeTypeItem {
  id: string;
  code: string;
  name: string;
  resolutionStrategy: string;
}

interface PermissionMatrixModalProps {
  designation: DesignationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PermissionMatrixModal({
  designation,
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

  const loadMatrixData = React.useCallback(async () => {
    if (!designation) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const [perms, scopes, desigData] = await Promise.all([
        api.get("/permissions"),
        api.get("/permissions/scope-types"),
        api.get(`/organization/designations/${designation.id}/permissions`),
      ]);

      setAllPermissions(Array.isArray(perms) ? perms : []);
      setScopeTypes(Array.isArray(scopes) ? scopes : []);

      // Build mapping of existing permissions -> scopeTypeId
      const mapping: Record<string, string> = {};
      if (desigData && Array.isArray(desigData.permissions)) {
        for (const item of desigData.permissions) {
          mapping[item.permissionId] = item.scopeTypeId;
        }
      }
      setSelectedScopes(mapping);
    } catch (err: any) {
      const errMsg = err.message || "Failed to load permission matrix data";
      setFetchError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [designation]);

  React.useEffect(() => {
    if (open && designation) {
      loadMatrixData();
      setSearchQuery("");
    }
  }, [open, designation, loadMatrixData]);

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

  const handleSave = async () => {
    if (!designation) return;
    setIsSaving(true);
    try {
      const assignments = Object.entries(selectedScopes)
        .filter(([_, scopeTypeId]) => Boolean(scopeTypeId))
        .map(([permissionId, scopeTypeId]) => ({
          permissionId,
          scopeTypeId,
        }));

      await api.put(`/organization/designations/${designation.id}/permissions`, {
        assignments,
      });

      toast.success(`Permissions matrix updated & cache invalidated for ${designation.name}`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save permission matrix");
    } finally {
      setIsSaving(false);
    }
  };

  // Group & Filter permissions by module
  const filteredPermissions = React.useMemo(() => {
    if (!searchQuery.trim()) return allPermissions;
    const q = searchQuery.toLowerCase();
    return allPermissions.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.module && p.module.toLowerCase().includes(q)),
    );
  }, [allPermissions, searchQuery]);

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

  if (!designation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" /> Permission Matrix: {designation.name} ({designation.code})
            {configuredCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[11px] px-2 py-0 bg-primary/20 text-primary border-primary/30 font-bold">
                {configuredCount} Active Grants
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Toggle permissions using checkboxes and select scope boundaries. Changes invalidate cache immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 py-1">
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
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="size-4" />
            <AlertTitle>Error Loading Permissions</AlertTitle>
            <AlertDescription className="flex items-center justify-between mt-2">
              <span>{fetchError}</span>
              <Button type="button" variant="outline" size="sm" onClick={loadMatrixData} className="gap-1.5 text-xs">
                <RefreshCw className="size-3.5" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading permission matrix...</span>
          </div>
        ) : scopeTypes.length === 0 ? (
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="size-4" />
            <AlertTitle>Scope Types Missing</AlertTitle>
            <AlertDescription className="mt-1 text-xs">
              No permission scope types were found in system configuration. Please contact your system administrator.
            </AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="flex-1 min-h-[360px] max-h-[calc(90vh-220px)] w-full pr-3 border rounded-lg p-3 bg-card/50">
            <div className="space-y-6 pr-2">
              {Object.keys(groupedModules).length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-8">
                  No permissions found matching search criteria.
                </p>
              ) : (
                Object.entries(groupedModules).map(([moduleName, perms]) => {
                  const allModuleChecked = perms.length > 0 && perms.every((p) => Boolean(selectedScopes[p.id]));
                  const someModuleChecked = perms.some((p) => Boolean(selectedScopes[p.id]));
                  const isModuleIndeterminate = someModuleChecked && !allModuleChecked;

                  return (
                    <div key={moduleName} className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-1.5 pt-1">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allModuleChecked}
                            indeterminate={isModuleIndeterminate}
                            onCheckedChange={() =>
                              handleToggleModule(perms, !allModuleChecked)
                            }
                            id={`matrix-mod-${moduleName}`}
                          />
                          <Label
                            htmlFor={`matrix-mod-${moduleName}`}
                            className="font-bold text-sm tracking-wide text-primary flex items-center gap-2 cursor-pointer select-none"
                          >
                            <Badge variant="outline">{moduleName}</Badge>
                            <span className="text-xs text-muted-foreground font-normal">
                              ({perms.length} actions)
                            </span>
                          </Label>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] text-muted-foreground hover:text-primary px-2"
                          onClick={() => handleToggleModule(perms, !allModuleChecked)}
                        >
                          {allModuleChecked ? (
                            <span className="flex items-center gap-1"><Square className="size-3.5" /> Unselect Module</span>
                          ) : (
                            <span className="flex items-center gap-1"><CheckSquare className="size-3.5" /> Select Module</span>
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
                              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-colors gap-3 ${
                                isChecked
                                  ? "bg-primary/5 border-primary/40 shadow-2xs"
                                  : "bg-card hover:bg-accent/30 border-border/60"
                              }`}
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    handleTogglePermission(p, Boolean(checked))
                                  }
                                  id={`matrix-perm-${p.id}`}
                                  className="mt-0.5"
                                />
                                <Label
                                  htmlFor={`matrix-perm-${p.id}`}
                                  className="space-y-0.5 cursor-pointer select-none flex-1 min-w-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs font-mono text-foreground">
                                      {p.code}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground break-words">{p.description}</p>
                                </Label>
                              </div>

                              <div className="w-full sm:w-72 shrink-0 pl-7 sm:pl-0">
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
                                      <SelectTrigger className="w-full h-9 text-xs">
                                        <SelectValue placeholder="No Access (Not Included)">
                                          {currentScopeId === "NONE" ? (
                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                              <Ban className="size-3.5 text-rose-500 shrink-0" />
                                              <span>No Access (Not Included)</span>
                                            </span>
                                          ) : selectedScope ? (
                                            <span className="flex items-center gap-1.5 font-medium">
                                              {getScopeIcon(selectedScope.resolutionStrategy)}
                                              <span>{selectedScope.name} ({selectedScope.resolutionStrategy})</span>
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
                                              <span>{st.name} ({st.resolutionStrategy})</span>
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

        <DialogFooter className="pt-4 border-t flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="size-4 text-blue-500" />
            <span>Updates update DB grants & clear Redis designation cache.</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading} className="gap-2">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Matrix {configuredCount > 0 ? `(${configuredCount})` : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
