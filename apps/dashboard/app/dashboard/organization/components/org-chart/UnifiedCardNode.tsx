"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  GitBranch,
  Building2,
  Users,
  Layers,
  MoreHorizontal,
  Pencil,
  UserCheck,
  UserX,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import type { UnifiedOrgNode, OrgNodeType } from "@workspace/shared";
import type { UnifiedTreeNode, DepthFilter } from "./types";

export interface UnifiedCardNodeProps {
  treeNode: UnifiedTreeNode;
  depthFilter: DepthFilter;
  expandedIds: Set<string>;
  isSelected: boolean;
  onSelect: () => void;
  onToggleExpand: (e: React.MouseEvent) => void;
  onAddChild: (parentNode: UnifiedOrgNode, childType: OrgNodeType) => void;
  onEdit: (node: UnifiedOrgNode) => void;
  onAssignLeadership: (node: UnifiedOrgNode) => void;
  onDelete: (node: UnifiedOrgNode) => void;
}

export function UnifiedCardNode({
  treeNode,
  depthFilter,
  expandedIds,
  isSelected,
  onSelect,
  onToggleExpand,
  onAddChild,
  onEdit,
  onAssignLeadership,
  onDelete,
}: UnifiedCardNodeProps) {
  const { node, depth, children } = treeNode;
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  const caps = node._capabilities || {
    canEdit: true,
    canDelete: true,
    canAssignManager: true,
    canAddSubBranch: true,
    canAddDepartment: true,
    canAddSubDepartment: true,
    canAddTeam: true,
  };

  const isBranch = node.type === "BRANCH";
  const isDepartment = node.type === "DEPARTMENT";
  const isTeam = node.type === "TEAM";

  // Visual Theme Styling by Type
  const themeConfig = React.useMemo(() => {
    if (isBranch) {
      return {
        barGradient: "bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400",
        badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        icon: <GitBranch className="size-4" />,
        typeLabel: depth === 0 ? "Enterprise Branch" : "Regional Sub-Hub",
      };
    }
    if (isDepartment) {
      return {
        barGradient: "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500",
        badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        icon: <Building2 className="size-4" />,
        typeLabel: "Department",
      };
    }
    return {
      barGradient: "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500",
      badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      icon: <Users className="size-4" />,
      typeLabel: "Team Squad",
    };
  }, [isBranch, isDepartment, depth]);

  const activeManagers = node.managers || [];
  const teamLead = node.teamLead;

  return (
    <div
      onClick={onSelect}
      className={`group w-[290px] sm:w-[320px] rounded-2xl border transition-all duration-200 text-left cursor-pointer select-none relative overflow-hidden backdrop-blur-md shrink-0 ${
        isSelected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-lg bg-card"
          : "bg-card/90 border-border/80 hover:border-primary/50 hover:bg-card hover:shadow-md"
      }`}
    >
      {/* Top Accent Gradient Bar */}
      <div className={`h-1.5 w-full ${themeConfig.barGradient}`} />

      <div className="p-4 space-y-3">
        {/* Header Row: Icon + Name + Badges */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`size-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${themeConfig.iconBg}`}
            >
              {themeConfig.icon}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/10">
                  {node.code}
                </span>
                <Badge variant="outline" className={`text-[10px] font-medium py-0 ${themeConfig.badgeBg}`}>
                  {themeConfig.typeLabel}
                </Badge>
              </div>
              <h4 className="font-bold text-foreground text-sm truncate mt-0.5" title={node.name}>
                {node.name}
              </h4>
            </div>
          </div>

          {/* Card Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:bg-accent opacity-60 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
              }
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Manage {themeConfig.typeLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Contextual Creation Actions */}
              {isBranch && caps.canAddSubBranch && (
                <DropdownMenuItem onClick={() => onAddChild(node, "BRANCH")}>
                  <Plus className="mr-2 size-4 text-indigo-500" />
                  Add Sub-Branch
                </DropdownMenuItem>
              )}
              {isBranch && caps.canAddDepartment && (
                <DropdownMenuItem onClick={() => onAddChild(node, "DEPARTMENT")}>
                  <Plus className="mr-2 size-4 text-emerald-500" />
                  Add Department
                </DropdownMenuItem>
              )}
              {isDepartment && caps.canAddSubDepartment && (
                <DropdownMenuItem onClick={() => onAddChild(node, "DEPARTMENT")}>
                  <Plus className="mr-2 size-4 text-emerald-500" />
                  Add Sub-Department
                </DropdownMenuItem>
              )}
              {isDepartment && caps.canAddTeam && (
                <DropdownMenuItem onClick={() => onAddChild(node, "TEAM")}>
                  <Plus className="mr-2 size-4 text-amber-500" />
                  Add Team Squad
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {caps.canEdit && (
                <DropdownMenuItem onClick={() => onEdit(node)}>
                  <Pencil className="mr-2 size-4 text-muted-foreground" />
                  Edit Details
                </DropdownMenuItem>
              )}

              {caps.canAssignManager && (
                <DropdownMenuItem onClick={() => onAssignLeadership(node)}>
                  <ShieldCheck className="mr-2 size-4 text-muted-foreground" />
                  {isTeam ? "Assign Team Lead" : "Manage Leadership"}
                </DropdownMenuItem>
              )}

              {caps.canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(node)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete Unit
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Leadership Pill */}
        <div className="pt-0.5">
          {isTeam ? (
            teamLead ? (
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-amber-500/10 text-xs border border-amber-500/20 text-amber-700 dark:text-amber-300">
                <UserCheck className="size-3.5 shrink-0" />
                <span className="font-medium truncate text-[11px]">{teamLead.fullName} (Lead)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/20 text-xs text-muted-foreground italic border border-dashed border-border/60">
                <UserX className="size-3.5 shrink-0" />
                <span className="text-[11px]">No active lead assigned</span>
              </div>
            )
          ) : activeManagers.length > 0 ? (
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/40 text-xs border border-border/50">
              <UserCheck className="size-3.5 text-primary shrink-0" />
              <span className="font-medium truncate text-foreground text-[11px]">
                {activeManagers[0]?.fullName}
              </span>
              {activeManagers.length > 1 && (
                <Badge variant="secondary" className="text-[9px] py-0 px-1 ml-auto">
                  +{activeManagers.length - 1}
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/20 text-xs text-muted-foreground italic border border-dashed border-border/60">
              <UserX className="size-3.5 shrink-0" />
              <span className="text-[11px]">No active managers</span>
            </div>
          )}
        </div>

        {/* Structural Metrics Footer */}
        <div className="flex items-center justify-between gap-1 pt-1 text-xs border-t border-border/50 text-muted-foreground">
          <div className="flex items-center gap-3">
            {isBranch && (
              <>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono hover:text-foreground transition-colors">
                  <Building2 className="size-3 text-emerald-500" />
                  <strong>{node.counts.departments ?? 0}</strong> depts
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono hover:text-foreground transition-colors">
                  <Layers className="size-3 text-indigo-500" />
                  <strong>{node.counts.subBranches ?? 0}</strong> subs
                </span>
              </>
            )}
            {isDepartment && (
              <>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono hover:text-foreground transition-colors">
                  <Users className="size-3 text-amber-500" />
                  <strong>{node.counts.teams ?? 0}</strong> teams
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono hover:text-foreground transition-colors">
                  <Layers className="size-3 text-emerald-500" />
                  <strong>{node.counts.subDepartments ?? 0}</strong> sub-depts
                </span>
              </>
            )}
            {isTeam && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono hover:text-foreground transition-colors">
                <Users className="size-3 text-amber-500" />
                <strong>{node.counts.members ?? 0}</strong> squad members
              </span>
            )}
          </div>

          {/* Expand / Collapse Sub-Tree Chevron Button */}
          {hasChildren && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-muted/80 text-[10px] font-semibold text-primary border bg-background/80 transition-colors shadow-2xs"
              title={isExpanded ? "Collapse children" : "Expand children"}
            >
              <span>{children.length}</span>
              {isExpanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
