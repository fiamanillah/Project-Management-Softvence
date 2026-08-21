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
  Layers,
  MoreHorizontal,
  Pencil,
  UserCheck,
  UserX,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  MapPin,
  Mail,
} from "lucide-react";
import type { BranchWithCapabilities, TreeNode, DepthFilter } from "./types";

export interface BranchCardNodeProps {
  node: TreeNode;
  depthFilter: DepthFilter;
  expandedIds: Set<string>;
  isSelected: boolean;
  onSelect: () => void;
  onToggleExpand: (e: React.MouseEvent) => void;
  onEdit: (branch: BranchWithCapabilities) => void;
  onAssignManager: (branch: BranchWithCapabilities) => void;
  onAddSubBranch: (parentBranch: BranchWithCapabilities) => void;
  onDelete: (branch: BranchWithCapabilities) => void;
}

export function BranchCardNode({
  node,
  depthFilter,
  expandedIds,
  isSelected,
  onSelect,
  onToggleExpand,
  onEdit,
  onAssignManager,
  onAddSubBranch,
  onDelete,
}: BranchCardNodeProps) {
  const { branch, depth, children } = node;
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(branch.id);
  const isRoot = depth === 0;

  const activeManagers = branch.managers?.filter((m) => !m.unassignedAt) || [];
  const caps = branch._capabilities || {
    canEdit: false,
    canDelete: false,
    canAssignManager: false,
    canCreateSubBranch: false,
  };
  const hasAnyAction =
    caps.canEdit || caps.canAssignManager || caps.canCreateSubBranch || caps.canDelete;

  return (
    <div
      onClick={onSelect}
      className={`group w-[290px] sm:w-[320px] rounded-2xl border transition-all duration-200 text-left cursor-pointer select-none relative overflow-hidden backdrop-blur-md shrink-0 ${
        isSelected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-lg bg-card"
          : isRoot
            ? "bg-gradient-to-b from-card to-card/90 shadow-md border-border hover:border-primary/50 hover:shadow-xl"
            : "bg-card/80 border-border/80 hover:border-primary/40 hover:bg-card hover:shadow-md"
      }`}
    >
      {/* Top Accent Gradient Bar */}
      <div
        className={`h-1.5 w-full ${
          isRoot
            ? "bg-gradient-to-r from-primary via-purple-500 to-teal-400"
            : depth === 1
              ? "bg-gradient-to-r from-blue-500 to-indigo-500"
              : "bg-gradient-to-r from-purple-500 to-pink-500"
        }`}
      />

      <div className="p-4 space-y-3">
        {/* Header Row: Icon + Name + Badges */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`size-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isRoot
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {isRoot ? <GitBranch className="size-4.5" /> : <Layers className="size-4" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/10">
                  {branch.code}
                </span>
                {isRoot ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0"
                  >
                    Enterprise Root
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] py-0 text-muted-foreground">
                    Level {depth} Hub
                  </Badge>
                )}
              </div>
              <h4 className="font-bold text-foreground text-sm truncate mt-0.5" title={branch.name}>
                {branch.name}
              </h4>
            </div>
          </div>

          {/* Card Actions Menu */}
          {hasAnyAction && (
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Manage Branch</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {caps.canCreateSubBranch && (
                  <DropdownMenuItem onClick={() => onAddSubBranch(branch)}>
                    <Plus className="mr-2 size-4 text-primary" />
                    Add Sub-Branch
                  </DropdownMenuItem>
                )}
                {caps.canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(branch)}>
                    <Pencil className="mr-2 size-4 text-muted-foreground" />
                    Edit Details
                  </DropdownMenuItem>
                )}
                {caps.canAssignManager && (
                  <DropdownMenuItem onClick={() => onAssignManager(branch)}>
                    <UserCheck className="mr-2 size-4 text-muted-foreground" />
                    Manage Leadership
                  </DropdownMenuItem>
                )}
                {caps.canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(branch)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete Branch
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Manager Pill */}
        <div className="pt-0.5">
          {activeManagers.length > 0 ? (
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/40 text-xs border border-border/50">
              <UserCheck className="size-3.5 text-primary shrink-0" />
              <span className="font-medium truncate text-foreground text-[11px]">
                {activeManagers[0]?.user?.firstName} {activeManagers[0]?.user?.lastName}
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
              <span className="text-[11px]">No active manager assigned</span>
            </div>
          )}
        </div>

        {/* Structural Summary Badges */}
        <div className="flex items-center justify-between gap-1 pt-1 text-xs border-t border-border/50 text-muted-foreground">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-mono hover:text-foreground transition-colors"
              title="Assigned Departments"
            >
              <Building2 className="size-3 text-primary" />
              <strong>{branch._count?.departments ?? 0}</strong> depts
            </span>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-mono hover:text-foreground transition-colors"
              title="Child Sub-Branches"
            >
              <Layers className="size-3 text-purple-500" />
              <strong>{children.length}</strong> subs
            </span>
          </div>

          {/* Expand / Collapse Sub-Tree Chevron Button */}
          {hasChildren && depthFilter !== "root" && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-muted/80 text-[10px] font-semibold text-primary border bg-background/80 transition-colors shadow-2xs"
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
