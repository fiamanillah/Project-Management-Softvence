"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
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
  Building2,
  MoreHorizontal,
  Pencil,
  UserCheck,
  UserX,
  Trash2,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  GitFork,
  CornerDownRight,
  ChevronDown,
  ChevronRight,
  Plus,
  Layers,
} from "lucide-react";
import type { DepartmentItem } from "@workspace/shared";

interface DepartmentCapabilities {
  canEdit?: boolean;
  canDelete?: boolean;
  canAssignManager?: boolean;
}

export type DepartmentWithCapabilities = DepartmentItem & {
  _capabilities?: DepartmentCapabilities;
};

interface DepartmentTableProps {
  departments: DepartmentWithCapabilities[];
  onEdit: (department: DepartmentWithCapabilities) => void;
  onAssignManager: (department: DepartmentWithCapabilities) => void;
  onAddSubDepartment?: (parentDepartment: DepartmentWithCapabilities) => void;
  onDelete: (department: DepartmentWithCapabilities) => void;
}

interface FlattenedRow {
  department: DepartmentWithCapabilities;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  isLastChild: boolean;
  parentName?: string;
}

export function DepartmentTable({
  departments,
  onEdit,
  onAssignManager,
  onAddSubDepartment,
  onDelete,
}: DepartmentTableProps) {
  // Track expanded branches
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => {
    // Expand all by default for visibility
    return new Set(departments.map((d) => d.id));
  });

  // Keep all expanded whenever departments list changes
  React.useEffect(() => {
    setExpandedIds(new Set(departments.map((d) => d.id)));
  }, [departments]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(departments.map((d) => d.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Build flattened hierarchical rows
  const { flattenedRows, rootCount, subCount } = React.useMemo(() => {
    // Map of parentId -> array of child departments
    const childrenMap = new Map<string, DepartmentWithCapabilities[]>();
    const roots: DepartmentWithCapabilities[] = [];
    let subs = 0;

    departments.forEach((d) => {
      if (d.parentId) {
        subs++;
        const currentChildren = childrenMap.get(d.parentId) || [];
        currentChildren.push(d);
        childrenMap.set(d.parentId, currentChildren);
      }
    });

    departments.forEach((d) => {
      if (!d.parentId || !departments.some((other) => other.id === d.parentId)) {
        roots.push(d);
      }
    });

    roots.sort((a, b) => a.name.localeCompare(b.name));

    const rows: FlattenedRow[] = [];

    const traverse = (
      node: DepartmentWithCapabilities,
      depth: number,
      isLast: boolean,
      parentName?: string,
    ) => {
      const children = (childrenMap.get(node.id) || []).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const hasChildren = children.length > 0;

      rows.push({
        department: node,
        depth,
        hasChildren,
        childCount: children.length,
        isLastChild: isLast,
        parentName,
      });

      if (hasChildren && expandedIds.has(node.id)) {
        children.forEach((child, index) => {
          traverse(child, depth + 1, index === children.length - 1, node.name);
        });
      }
    };

    roots.forEach((root, index) => {
      traverse(root, 0, index === roots.length - 1);
    });

    return { flattenedRows: rows, rootCount: roots.length, subCount: subs };
  }, [departments, expandedIds]);

  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border bg-card/50">
        <Building2 className="size-12 text-muted-foreground/50 mb-3" />
        <h3 className="text-base font-semibold text-foreground">No Departments Found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          No departments exist matching your query. Click "Add Department" to create your first department.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quick Tree Controls Bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <span>
            Showing <strong>{rootCount}</strong> Root Divisions &bull;{" "}
            <strong>{subCount}</strong> Sub-Departments
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
          >
            Expand All
          </Button>
          <span className="text-border">|</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
          >
            Collapse All
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[320px]">Department & Hierarchy</TableHead>
              <TableHead className="w-[110px]">Code</TableHead>
              <TableHead>Hierarchy Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active Manager(s)</TableHead>
              <TableHead className="text-center">Sub-Depts</TableHead>
              <TableHead className="text-center">Designations</TableHead>
              <TableHead className="text-center">Teams</TableHead>
              <TableHead className="text-right w-[110px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattenedRows.map((row) => {
              const { department: dept, depth, hasChildren, childCount } = row;
              const isExpanded = expandedIds.has(dept.id);
              const activeManagers = dept.managers?.filter((m) => !m.unassignedAt) || [];
              const caps = dept._capabilities || {
                canEdit: true,
                canDelete: true,
                canAssignManager: true,
              };
              const hasAnyAction = caps.canEdit || caps.canAssignManager || caps.canDelete;

              return (
                <TableRow
                  key={dept.id}
                  className={`hover:bg-muted/20 transition-colors ${
                    depth > 0 ? "bg-muted/10" : ""
                  }`}
                >
                  {/* Department Name with Tree Indentation */}
                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${depth * 24}px` }}
                    >
                      {/* Tree branch connector icon for sub-departments */}
                      {depth > 0 && (
                        <CornerDownRight className="size-4 text-muted-foreground/60 shrink-0" />
                      )}

                      {/* Expand/Collapse Button for parents */}
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(dept.id)}
                          className="size-6 rounded-md hover:bg-muted border bg-background flex items-center justify-center text-muted-foreground transition-colors shrink-0 cursor-pointer shadow-2xs"
                          title={isExpanded ? "Collapse sub-departments" : "Expand sub-departments"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-3.5 text-primary" />
                          ) : (
                            <ChevronRight className="size-3.5 text-primary" />
                          )}
                        </button>
                      ) : (
                        <div className="size-6 flex items-center justify-center shrink-0">
                          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                        </div>
                      )}

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`truncate ${
                              depth === 0 ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                            }`}
                          >
                            {dept.name}
                          </span>
                          {hasChildren && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] py-0 px-1.5 text-muted-foreground font-normal"
                            >
                              {childCount} sub
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {dept.id.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Code */}
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    <Badge variant="outline" className="font-mono font-bold bg-muted/30">
                      {dept.code}
                    </Badge>
                  </TableCell>

                  {/* Hierarchy Unit Badge */}
                  <TableCell>
                    {dept.parent ? (
                      <Badge
                        variant="outline"
                        className="bg-primary/5 text-primary border-primary/20 flex items-center gap-1 w-fit font-normal text-xs"
                      >
                        <GitFork className="size-3" />
                        <span className="truncate max-w-[140px]">{dept.parent.name}</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-secondary/60 text-secondary-foreground flex items-center gap-1 w-fit font-semibold text-xs"
                      >
                        <Building2 className="size-3 text-primary" /> Root Org
                      </Badge>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {dept.isActive ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 flex items-center gap-1 w-fit text-xs"
                      >
                        <CheckCircle2 className="size-3" /> Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground flex items-center gap-1 w-fit text-xs"
                      >
                        <XCircle className="size-3" /> Inactive
                      </Badge>
                    )}
                  </TableCell>

                  {/* Active Managers */}
                  <TableCell>
                    {activeManagers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {activeManagers.map((mgr) => {
                          const fullName =
                            `${mgr.user?.firstName || ""} ${mgr.user?.lastName || ""}`.trim() ||
                            mgr.user?.email ||
                            "Manager";
                          return (
                            <Badge
                              key={mgr.id}
                              variant="secondary"
                              className="text-xs font-normal flex items-center gap-1 py-0.5 px-2 bg-secondary/60"
                            >
                              <UserCheck className="size-3 text-primary" />
                              {fullName}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                        <UserX className="size-3" /> Unassigned
                      </span>
                    )}
                  </TableCell>

                  {/* Sub-Departments Count */}
                  <TableCell className="text-center font-mono text-xs">
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground"
                      title="Sub-Departments"
                    >
                      <GitFork className="size-3 text-primary" />
                      {dept._count?.subDepartments ?? childCount}
                    </div>
                  </TableCell>

                  {/* Designations Count */}
                  <TableCell className="text-center font-mono text-xs">
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground"
                      title="Designations"
                    >
                      <Shield className="size-3 text-primary" />
                      {dept._count?.designations ?? 0}
                    </div>
                  </TableCell>

                  {/* Teams Count */}
                  <TableCell className="text-center font-mono text-xs">
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground"
                      title="Teams"
                    >
                      <Users className="size-3 text-primary" />
                      {dept._count?.teams ?? 0}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onAddSubDepartment && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onAddSubDepartment(dept)}
                          className="size-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Add Sub-Department under this unit"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      )}

                      {hasAnyAction ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            type="button"
                            className="inline-flex items-center justify-center size-7 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors cursor-pointer outline-none"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Manage Department</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {onAddSubDepartment && (
                              <DropdownMenuItem onClick={() => onAddSubDepartment(dept)}>
                                <Plus className="mr-2 size-4 text-primary" />
                                Add Sub-Department
                              </DropdownMenuItem>
                            )}
                            {caps.canEdit && (
                              <DropdownMenuItem onClick={() => onEdit(dept)}>
                                <Pencil className="mr-2 size-4 text-muted-foreground" />
                                Edit Details
                              </DropdownMenuItem>
                            )}
                            {caps.canAssignManager && (
                              <DropdownMenuItem onClick={() => onAssignManager(dept)}>
                                <UserCheck className="mr-2 size-4 text-muted-foreground" />
                                Assign / Edit Manager
                              </DropdownMenuItem>
                            )}
                            {caps.canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => onDelete(dept)}
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Delete Department
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
