"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Globe,
  Building2,
  Users,
  Briefcase,
  UserCheck,
  Zap,
  Lock,
  Search,
  CheckSquare,
  Square,
  Ban,
  ShieldCheck,
  FolderGit2,
} from "lucide-react";
import { toast } from "sonner";
import { getScopeWeight } from "@workspace/shared";

export interface PermissionItem {
  id: string;
  code: string;
  module: string;
  description: string;
  supportedScopes?: string[];
  implies?: string[];
  dependsOn?: string[];
}

export interface ScopeTypeItem {
  id: string;
  code: string;
  name: string;
  resolutionStrategy: string;
}

export interface RolePermissionMatrixEditorProps {
  permissions: PermissionItem[];
  scopeTypes: ScopeTypeItem[];
  selectedScopes: Record<string, string>;
  onChange: (scopes: Record<string, string>) => void;
  isLoading?: boolean;
  disabled?: boolean;
  maxHeight?: string;
  className?: string;
}

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

export function getContainerParentCode(code: string): string | null {
  if (code.startsWith("project.") && code !== "project.view") return "project.view";
  if (code.startsWith("organization.department.") && code !== "organization.department.view") {
    return "organization.department.view";
  }
  if (code.startsWith("organization.branch.") && code !== "organization.branch.view") {
    return "organization.branch.view";
  }
  return null;
}

export function isContainerRootCode(code: string): boolean {
  return (
    code === "project.view" ||
    code === "organization.department.view" ||
    code === "organization.branch.view"
  );
}

export function RolePermissionMatrixEditor({
  permissions,
  scopeTypes,
  selectedScopes,
  onChange,
  isLoading = false,
  disabled = false,
  maxHeight,
  className,
}: RolePermissionMatrixEditorProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<"all" | "granted" | "containers">("all");

  // Map code to permission for quick DAG traversal
  const codeMap = React.useMemo(() => {
    const map = new Map<string, PermissionItem>();
    for (const p of permissions) {
      map.set(p.code, p);
    }
    return map;
  }, [permissions]);

  // Compute prerequisite closure
  const getPrerequisitePermissions = React.useCallback(
    (perm: PermissionItem): PermissionItem[] => {
      const prereqs: PermissionItem[] = [];
      const visited = new Set<string>();
      const queue = [perm];

      while (queue.length > 0) {
        const current = queue.shift()!;
        const targets = [
          ...(current.implies || []),
          ...(current.dependsOn || []),
        ];

        // Also add container parent as a hard prerequisite
        const parentCode = getContainerParentCode(current.code);
        if (parentCode && !targets.includes(parentCode)) {
          targets.push(parentCode);
        }

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
    [codeMap],
  );

  // Compute dependent permissions (cascade uncheck)
  const getDependentPermissions = React.useCallback(
    (perm: PermissionItem): PermissionItem[] => {
      const dependents: PermissionItem[] = [];
      for (const p of permissions) {
        if (p.id === perm.id) continue;
        const targets = [...(p.implies || []), ...(p.dependsOn || [])];
        const parentCode = getContainerParentCode(p.code);
        if (parentCode) targets.push(parentCode);

        if (targets.includes(perm.code)) {
          dependents.push(p);
        }
      }
      return dependents;
    },
    [permissions],
  );

  // Calculate default valid scope for a permission given container bounding
  const getPermissionDefaultScopeId = React.useCallback(
    (perm: PermissionItem, currentGrants: Record<string, string>): string | null => {
      const available =
        perm.supportedScopes && perm.supportedScopes.length > 0
          ? scopeTypes.filter((st) =>
              perm.supportedScopes!.includes(st.resolutionStrategy || st.code),
            )
          : scopeTypes;

      const parentCode = getContainerParentCode(perm.code);
      if (parentCode) {
        const parentPerm = codeMap.get(parentCode);
        if (parentPerm && currentGrants[parentPerm.id]) {
          const parentScopeType = scopeTypes.find((s) => s.id === currentGrants[parentPerm.id]);
          const parentWeight = getScopeWeight(parentScopeType?.resolutionStrategy);
          const bounded = available.filter(
            (st) => getScopeWeight(st.resolutionStrategy) <= parentWeight,
          );
          if (bounded.length > 0 && bounded[0]) {
            return bounded[0].id;
          }
          return currentGrants[parentPerm.id] || null;
        }
      }

      return available[0]?.id || (scopeTypes[0]?.id ?? null);
    },
    [scopeTypes, codeMap],
  );

  // Helper to get allowed scope types and container info for UI rendering
  const getScopeOptionsForPermission = React.useCallback(
    (perm: PermissionItem) => {
      const allSupported =
        perm.supportedScopes && perm.supportedScopes.length > 0
          ? scopeTypes.filter((st) =>
              perm.supportedScopes!.includes(st.resolutionStrategy || st.code),
            )
          : scopeTypes;

      const parentCode = getContainerParentCode(perm.code);
      let maxAllowedWeight = 100;
      let parentScopeName: string | null = null;
      let parentScopeStrategy: string | null = null;

      if (parentCode) {
        const parentPerm = codeMap.get(parentCode);
        if (parentPerm && selectedScopes[parentPerm.id]) {
          const parentScopeType = scopeTypes.find((s) => s.id === selectedScopes[parentPerm.id]);
          if (parentScopeType) {
            maxAllowedWeight = getScopeWeight(parentScopeType.resolutionStrategy);
            parentScopeName = parentScopeType.name;
            parentScopeStrategy = parentScopeType.resolutionStrategy;
          }
        }
      }

      const options = allSupported.map((st) => {
        const weight = getScopeWeight(st.resolutionStrategy);
        const isExceeding = weight > maxAllowedWeight;
        return {
          scope: st,
          isExceeding,
          weight,
        };
      });

      return {
        options,
        isBounded: maxAllowedWeight < 50,
        parentCode,
        parentScopeName,
        parentScopeStrategy,
      };
    },
    [scopeTypes, selectedScopes, codeMap],
  );

  // Toggle permission checkbox
  const handleTogglePermission = (perm: PermissionItem, isChecked: boolean) => {
    if (disabled) return;
    const nextScopes = { ...selectedScopes };

    if (isChecked) {
      if (!nextScopes[perm.id]) {
        const defaultScopeId = getPermissionDefaultScopeId(perm, nextScopes);
        if (!defaultScopeId) {
          toast.error("No valid scope types available.");
          return;
        }
        nextScopes[perm.id] = defaultScopeId;
      }

      // Auto-enable prerequisite permissions
      const prereqs = getPrerequisitePermissions(perm);
      const autoAddedCodes: string[] = [];

      for (const prereq of prereqs) {
        if (!nextScopes[prereq.id]) {
          const prereqScopeId = getPermissionDefaultScopeId(prereq, nextScopes);
          if (prereqScopeId) {
            nextScopes[prereq.id] = prereqScopeId;
            autoAddedCodes.push(prereq.code);
          }
        }
      }

      if (autoAddedCodes.length > 0) {
        toast.info(
          `Auto-enabled container prerequisite(s): ${autoAddedCodes.slice(0, 3).join(", ")}${autoAddedCodes.length > 3 ? "..." : ""}`,
        );
      }
    } else {
      delete nextScopes[perm.id];

      // Cascade uncheck: uncheck any checked permissions that depend on this permission
      const dependents = getDependentPermissions(perm);
      const disabledCodes: string[] = [];

      for (const dep of dependents) {
        if (nextScopes[dep.id]) {
          delete nextScopes[dep.id];
          disabledCodes.push(dep.code);
        }
      }

      if (disabledCodes.length > 0) {
        toast.info(
          `Disabled dependent sub-permission(s): ${disabledCodes.slice(0, 3).join(", ")}${disabledCodes.length > 3 ? "..." : ""}`,
        );
      }
    }

    onChange(nextScopes);
  };

  // Scope selection change with reactive auto-clamping
  const handleScopeChange = (permissionId: string, scopeTypeId: string | null) => {
    if (disabled) return;
    const nextScopes = { ...selectedScopes };

    if (!scopeTypeId || scopeTypeId === "NONE") {
      delete nextScopes[permissionId];
      onChange(nextScopes);
      return;
    }

    nextScopes[permissionId] = scopeTypeId;
    const targetPerm = permissions.find((p) => p.id === permissionId);
    if (!targetPerm) {
      onChange(nextScopes);
      return;
    }

    // If target is a container root (e.g. project.view), clamp all currently active child permissions
    const selectedScopeType = scopeTypes.find((s) => s.id === scopeTypeId);
    const targetWeight = getScopeWeight(selectedScopeType?.resolutionStrategy);

    let containerPrefix: string | null = null;
    if (targetPerm.code === "project.view") containerPrefix = "project.";
    if (targetPerm.code === "organization.department.view") containerPrefix = "organization.department.";
    if (targetPerm.code === "organization.branch.view") containerPrefix = "organization.branch.";

    let clampedCount = 0;
    if (containerPrefix) {
      for (const perm of permissions) {
        if (perm.code.startsWith(containerPrefix) && perm.code !== targetPerm.code && nextScopes[perm.id]) {
          const childScopeType = scopeTypes.find((s) => s.id === nextScopes[perm.id]);
          const childWeight = getScopeWeight(childScopeType?.resolutionStrategy);
          if (childWeight > targetWeight) {
            nextScopes[perm.id] = scopeTypeId;
            clampedCount++;
          }
        }
      }
    }

    if (clampedCount > 0) {
      toast.warning(
        `Container scope narrowed: clamped ${clampedCount} sub-permission scope(s) to ${selectedScopeType?.name || "container scope"}.`,
      );
    }

    onChange(nextScopes);
  };

  // Module toggle
  const handleToggleModule = (modulePerms: PermissionItem[], shouldInclude: boolean) => {
    if (disabled) return;
    const nextScopes = { ...selectedScopes };

    for (const p of modulePerms) {
      if (shouldInclude) {
        if (!nextScopes[p.id]) {
          const defaultScopeId = getPermissionDefaultScopeId(p, nextScopes);
          if (defaultScopeId) {
            nextScopes[p.id] = defaultScopeId;
          }
        }
        const prereqs = getPrerequisitePermissions(p);
        for (const prereq of prereqs) {
          if (!nextScopes[prereq.id]) {
            const prereqScopeId = getPermissionDefaultScopeId(prereq, nextScopes);
            if (prereqScopeId) {
              nextScopes[prereq.id] = prereqScopeId;
            }
          }
        }
      } else {
        delete nextScopes[p.id];
        const dependents = getDependentPermissions(p);
        for (const dep of dependents) {
          delete nextScopes[dep.id];
        }
      }
    }

    onChange(nextScopes);
  };

  // Filter & Group Permissions
  const groupedPermissions = React.useMemo(() => {
    const groups = new Map<string, PermissionItem[]>();

    const q = searchQuery.toLowerCase().trim();
    const filtered = permissions.filter((p) => {
      if (q) {
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesModule = p.module.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        if (!matchesCode && !matchesModule && !matchesDesc) return false;
      }

      if (filterMode === "granted" && !selectedScopes[p.id]) {
        return false;
      }
      if (filterMode === "containers" && !isContainerRootCode(p.code) && !getContainerParentCode(p.code)) {
        return false;
      }

      return true;
    });

    for (const p of filtered) {
      const list = groups.get(p.module) || [];
      list.push(p);
      groups.set(p.module, list);
    }

    return groups;
  }, [permissions, searchQuery, filterMode, selectedScopes]);

  const totalGranted = Object.keys(selectedScopes).length;

  return (
    <div className={`flex-1 min-h-0 flex flex-col gap-3 w-full ${className || ""}`}>
      {/* Top Controls Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-muted/30 p-2.5 rounded-lg border">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search permissions by code, module, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
            disabled={disabled || isLoading}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                filterMode === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({permissions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("granted")}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                filterMode === "granted"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Granted ({totalGranted})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("containers")}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                filterMode === "containers"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Containers
            </button>
          </div>

          <Badge variant="secondary" className="text-[11px] h-7 px-2 font-mono">
            <ShieldCheck className="size-3 text-primary mr-1" />
            {totalGranted} active
          </Badge>
        </div>
      </div>

      {/* Permissions Tree Area */}
      {groupedPermissions.size === 0 ? (
        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-card text-muted-foreground text-xs gap-2">
          <Ban className="size-6 text-muted-foreground/50" />
          <p>No permissions match the current search & filter criteria.</p>
        </div>
      ) : (
        <ScrollArea
          style={maxHeight ? { maxHeight } : undefined}
          className="flex-1 min-h-[320px] w-full border rounded-lg bg-card p-3 shadow-inner"
        >
          <div className="space-y-6 pr-3">
            {Array.from(groupedPermissions.entries()).map(([moduleName, perms]) => {
              const allModuleSelected = perms.every((p) => Boolean(selectedScopes[p.id]));
              const someModuleSelected =
                perms.some((p) => Boolean(selectedScopes[p.id])) && !allModuleSelected;

              // Organize into container roots and sub-features
              const containerRoots = perms.filter((p) => isContainerRootCode(p.code));
              const nonContainerRoots = perms.filter((p) => !isContainerRootCode(p.code));

              return (
                <div key={moduleName} className="space-y-2.5 border-b pb-5 last:border-b-0 last:pb-0">
                  {/* Module Header */}
                  <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 rounded-md border border-border/50">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
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
                        <span className="uppercase tracking-wider text-[11px] font-semibold">
                          {moduleName}
                        </span>
                      </Button>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                        {perms.filter((p) => selectedScopes[p.id]).length}/{perms.length}
                      </Badge>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      className="text-[11px] h-6 text-muted-foreground hover:text-foreground"
                      onClick={() => handleToggleModule(perms, !allModuleSelected)}
                    >
                      {allModuleSelected ? "Deselect All" : "Select All"}
                    </Button>
                  </div>

                  {/* Permission List / Tree */}
                  <div className="space-y-2">
                    {/* Render Container Roots First with distinct highlight */}
                    {containerRoots.map((perm) => (
                      <PermissionRow
                        key={perm.id}
                        perm={perm}
                        isContainerRoot={true}
                        isGranted={Boolean(selectedScopes[perm.id])}
                        selectedScopeId={selectedScopes[perm.id]}
                        scopeTypes={scopeTypes}
                        scopeMeta={getScopeOptionsForPermission(perm)}
                        onToggle={(checked) => handleTogglePermission(perm, checked)}
                        onScopeChange={(scopeId) => handleScopeChange(perm.id, scopeId)}
                        disabled={disabled}
                      />
                    ))}

                    {/* Render Child / Standard Permissions */}
                    {nonContainerRoots.map((perm) => {
                      const isChild = Boolean(getContainerParentCode(perm.code));
                      return (
                        <div
                          key={perm.id}
                          className={isChild ? "pl-3 border-l-2 border-primary/20 ml-2" : ""}
                        >
                          <PermissionRow
                            perm={perm}
                            isContainerRoot={false}
                            isGranted={Boolean(selectedScopes[perm.id])}
                            selectedScopeId={selectedScopes[perm.id]}
                            scopeTypes={scopeTypes}
                            scopeMeta={getScopeOptionsForPermission(perm)}
                            onToggle={(checked) => handleTogglePermission(perm, checked)}
                            onScopeChange={(scopeId) => handleScopeChange(perm.id, scopeId)}
                            disabled={disabled}
                          />
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
  );
}

interface PermissionRowProps {
  perm: PermissionItem;
  isContainerRoot: boolean;
  isGranted: boolean;
  selectedScopeId?: string;
  scopeTypes: ScopeTypeItem[];
  scopeMeta: {
    options: { scope: ScopeTypeItem; isExceeding: boolean; weight: number }[];
    isBounded: boolean;
    parentCode: string | null;
    parentScopeName: string | null;
    parentScopeStrategy: string | null;
  };
  onToggle: (checked: boolean) => void;
  onScopeChange: (scopeId: string | null) => void;
  disabled?: boolean;
}

function PermissionRow({
  perm,
  isContainerRoot,
  isGranted,
  selectedScopeId,
  scopeTypes,
  scopeMeta,
  onToggle,
  onScopeChange,
  disabled,
}: PermissionRowProps) {
  const currentScope = scopeTypes.find((s) => s.id === selectedScopeId);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border text-xs transition-all ${
        isContainerRoot
          ? isGranted
            ? "bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/20"
            : "bg-card border-primary/20 hover:border-primary/40"
          : isGranted
            ? "bg-primary/5 border-primary/25"
            : "bg-card/70 border-border/70 hover:bg-muted/30"
      }`}
    >
      {/* Left Details */}
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <Checkbox
          id={`matrix-perm-${perm.id}`}
          checked={isGranted}
          onCheckedChange={(checked) => onToggle(Boolean(checked))}
          disabled={disabled}
          className="mt-0.5"
        />

        <div className="flex flex-col min-w-0 gap-0.5 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Label
              htmlFor={`matrix-perm-${perm.id}`}
              className="font-mono text-xs font-semibold cursor-pointer text-foreground flex items-center gap-1.5"
            >
              {isContainerRoot && <FolderGit2 className="size-3.5 text-primary shrink-0" />}
              {perm.code}
            </Label>

            {isContainerRoot && (
              <Badge variant="default" className="text-[9px] py-0 px-1 font-mono tracking-tight uppercase">
                Container Root Boundary
              </Badge>
            )}

            {scopeMeta.isBounded && scopeMeta.parentScopeName && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-mono">
                <Lock className="size-2.5 shrink-0" />
                max: {scopeMeta.parentScopeName}
              </span>
            )}
          </div>

          <span className="text-[11px] text-muted-foreground line-clamp-1">{perm.description}</span>

          {/* Implies & DependsOn Tags */}
          {((perm.dependsOn && perm.dependsOn.length > 0) ||
            (perm.implies && perm.implies.length > 0)) && (
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

      {/* Right Scope Selector */}
      <div className="flex items-center gap-2 pl-6 sm:pl-0 shrink-0">
        {isGranted ? (
          <Select
            value={selectedScopeId || "NONE"}
            onValueChange={(val: string | null) => onScopeChange(val)}
            disabled={disabled}
          >
            <SelectTrigger className="h-7 text-xs w-[190px] bg-background">
              <SelectValue placeholder="Select Scope">
                <div className="flex items-center gap-1.5 truncate">
                  {getScopeIcon(currentScope?.resolutionStrategy)}
                  <span className="truncate">{currentScope?.name || "Select Scope"}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {scopeMeta.options.map(({ scope: st, isExceeding }) => (
                <SelectItem
                  key={st.id}
                  value={st.id}
                  disabled={isExceeding}
                  className={`text-xs ${isExceeding ? "opacity-50 cursor-not-allowed bg-muted/30" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-1.5">
                      {getScopeIcon(st.resolutionStrategy)}
                      <span className={isExceeding ? "line-through text-muted-foreground" : ""}>
                        {st.name}
                      </span>
                    </div>

                    {isExceeding && (
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 px-1 text-destructive border-destructive/40 flex items-center gap-0.5 ml-2"
                      >
                        <Lock className="size-2.5" /> Exceeds Container
                      </Badge>
                    )}
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
}
