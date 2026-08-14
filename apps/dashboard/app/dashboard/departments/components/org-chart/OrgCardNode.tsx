"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Building2,
  GitFork,
  MoreHorizontal,
  Pencil,
  UserCheck,
  UserX,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { DepartmentWithCapabilities } from "../DepartmentTable";
import type { TreeNode, DepthFilter } from "./types";

export interface OrgCardNodeProps {
  node: TreeNode;
  depthFilter: DepthFilter;
  expandedIds: Set<string>;
  isSelected: boolean;
  onSelect: () => void;
  onToggleExpand: (e: React.MouseEvent) => void;
  onEdit: (department: DepartmentWithCapabilities) => void;
  onAssignManager: (department: DepartmentWithCapabilities) => void;
  onAddSubDepartment: (parentDepartment: DepartmentWithCapabilities) => void;
  onDelete: (department: DepartmentWithCapabilities) => void;
}

export function OrgCardNode({
  node,
  depthFilter,
  expandedIds,
  isSelected,
  onSelect,
  onToggleExpand,
  onEdit,
  onAssignManager,
  onAddSubDepartment,
  onDelete,
}: OrgCardNodeProps) {
  const { department, depth, children } = node;
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(department.id);
  const isRoot = depth === 0;

  const activeManagers = department.managers?.filter((m) => !m.unassignedAt) || [];
  const caps = department._capabilities || { canEdit: true, canDelete: true, canAssignManager: true };
  const hasAnyAction = caps.canEdit || caps.canAssignManager || caps.canDelete;

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
            ? "bg-gradient-to-r from-primary via-emerald-500 to-teal-400"
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
              {isRoot ? <Building2 className="size-4.5" /> : <GitFork className="size-4" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/10">
                  {department.code}
                </span>
                {isRoot ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0"
                  >
                    Root
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] py-0 text-muted-foreground">
                    Level {depth}
                  </Badge>
                )}
              </div>
              <h4 className="font-bold text-foreground text-sm truncate mt-0.5" title={department.name}>
                {department.name}
              </h4>
            </div>
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {department.isActive ? (
              <span
                className="flex size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"
                title="Active"
              />
            ) : (
              <span
                className="flex size-2 rounded-full bg-muted-foreground ring-4 ring-muted-foreground/20"
                title="Inactive"
              />
            )}

            {hasAnyAction && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  className="size-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors cursor-pointer outline-none"
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAddSubDepartment(department)}>
                    <Plus className="mr-2 size-4 text-primary" />
                    Add Sub-Department
                  </DropdownMenuItem>
                  {caps.canEdit && (
                    <DropdownMenuItem onClick={() => onEdit(department)}>
                      <Pencil className="mr-2 size-4 text-muted-foreground" />
                      Edit Details
                    </DropdownMenuItem>
                  )}
                  {caps.canAssignManager && (
                    <DropdownMenuItem onClick={() => onAssignManager(department)}>
                      <UserCheck className="mr-2 size-4 text-muted-foreground" />
                      Assign Manager
                    </DropdownMenuItem>
                  )}
                  {caps.canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(department)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete Department
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Leadership & Manager Info */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
          <div className="flex items-center gap-1.5 truncate">
            {activeManagers.length > 0 && activeManagers[0] ? (
              <div className="flex items-center gap-1 text-foreground font-medium truncate">
                <UserCheck className="size-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {`${activeManagers[0].user?.firstName || ""} ${activeManagers[0].user?.lastName || ""}`.trim() ||
                    activeManagers[0].user?.email ||
                    "Manager"}
                </span>
                {activeManagers.length > 1 && (
                  <Badge variant="secondary" className="text-[9px] py-0 px-1">
                    +{activeManagers.length - 1}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground italic flex items-center gap-1 text-[11px]">
                <UserX className="size-3" /> No Manager
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0 font-mono">
            <span title="Roles">
              <strong className="text-foreground">{department._count?.designations ?? 0}</strong> roles
            </span>
            <span>&bull;</span>
            <span title="Teams">
              <strong className="text-foreground">{department._count?.teams ?? 0}</strong> teams
            </span>
          </div>
        </div>

        {/* Bottom Expand Sub-Units Bar if Has Children */}
        {hasChildren && depthFilter !== "root" && (
          <div
            onClick={onToggleExpand}
            className="flex items-center justify-between p-1.5 px-2 rounded-xl bg-muted/40 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors text-xs font-medium cursor-pointer border border-transparent hover:border-primary/20"
          >
            <div className="flex items-center gap-1.5">
              <GitFork className="size-3.5 text-primary" />
              <span>
                {children.length} Sub-department{children.length === 1 ? "" : "s"}
              </span>
            </div>
            {isExpanded ? (
              <ChevronDown className="size-3.5 text-primary" />
            ) : (
              <ChevronRight className="size-3.5 text-primary" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
