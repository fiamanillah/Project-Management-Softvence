"use client";

import * as React from "react";
import {
  useTable,
  createColumnHelper,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table";
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
  LayoutList,
  Network,
} from "lucide-react";
import type { DepartmentItem } from "@workspace/shared";
import {
  features,
  type DataTableFeatures,
  DataTableColumnHeader,
  DataTableToolbar,
} from "@/components/data-table";

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
  // Toolbar integration props
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  statusFilter?: "all" | "active" | "inactive";
  onStatusFilterChange?: (val: "all" | "active" | "inactive") => void;
  viewMode?: "tree" | "chart";
  onViewModeChange?: (val: "tree" | "chart") => void;
  totalUnitsCount?: number;
  activeUnitsCount?: number;
}

export interface FlattenedDepartmentRow {
  department: DepartmentWithCapabilities;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  isLastChild: boolean;
  parentName?: string;
}

const columnHelper = createColumnHelper<DataTableFeatures, FlattenedDepartmentRow>();

export function DepartmentTable({
  departments,
  onEdit,
  onAssignManager,
  onAddSubDepartment,
  onDelete,
  searchQuery,
  onSearchChange,
  statusFilter = "all",
  onStatusFilterChange,
  viewMode = "tree",
  onViewModeChange,
  totalUnitsCount,
  activeUnitsCount,
}: DepartmentTableProps) {
  // Track expanded branches
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => {
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

    const rows: FlattenedDepartmentRow[] = [];

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

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});

  // Define table columns
  const columns = React.useMemo(() => {
    return columnHelper.columns([
      columnHelper.accessor((row) => row.department.name, {
        id: "department",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Department & Hierarchy" />
        ),
        cell: ({ row }) => {
          const { department: dept, depth, hasChildren, childCount } = row.original;
          const isExpanded = expandedIds.has(dept.id);

          return (
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${depth * 24}px` }}
            >
              {depth > 0 && (
                <CornerDownRight className="size-4 text-muted-foreground/60 shrink-0" />
              )}

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
                      depth === 0
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground/90"
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
          );
        },
      }),

      columnHelper.accessor((row) => row.department.code, {
        id: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Code" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono font-bold bg-muted/30">
            {row.original.department.code}
          </Badge>
        ),
      }),

      columnHelper.accessor((row) => row.department.parent?.name || "Root Org", {
        id: "hierarchyUnit",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Hierarchy Unit" />
        ),
        cell: ({ row }) => {
          const dept = row.original.department;
          return dept.parent ? (
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
          );
        },
      }),

      columnHelper.accessor((row) => (row.department.isActive ? "Active" : "Inactive"), {
        id: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const dept = row.original.department;
          return dept.isActive ? (
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
          );
        },
      }),

      columnHelper.accessor(
        (row) =>
          row.department.managers
            ?.filter((m) => !m.unassignedAt)
            .map((m) => `${m.user?.firstName || ""} ${m.user?.lastName || ""} ${m.user?.email || ""}`)
            .join(", ") || "Unassigned",
        {
          id: "managers",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Active Manager(s)" />
          ),
          cell: ({ row }) => {
            const activeManagers =
              row.original.department.managers?.filter((m) => !m.unassignedAt) || [];

            return activeManagers.length > 0 ? (
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
            );
          },
        }
      ),

      columnHelper.accessor((row) => row.department._count?.subDepartments ?? row.childCount, {
        id: "subDepartments",
        header: () => <div className="text-center">Sub-Depts</div>,
        cell: ({ row }) => {
          const dept = row.original.department;
          return (
            <div className="flex justify-center">
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-mono text-xs"
                title="Sub-Departments"
              >
                <GitFork className="size-3 text-primary" />
                {dept._count?.subDepartments ?? row.original.childCount}
              </div>
            </div>
          );
        },
      }),

      columnHelper.accessor((row) => row.department._count?.designations ?? 0, {
        id: "designations",
        header: () => <div className="text-center">Designations</div>,
        cell: ({ row }) => {
          const dept = row.original.department;
          return (
            <div className="flex justify-center">
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-mono text-xs"
                title="Designations"
              >
                <Shield className="size-3 text-primary" />
                {dept._count?.designations ?? 0}
              </div>
            </div>
          );
        },
      }),

      columnHelper.accessor((row) => row.department._count?.teams ?? 0, {
        id: "teams",
        header: () => <div className="text-center">Teams</div>,
        cell: ({ row }) => {
          const dept = row.original.department;
          return (
            <div className="flex justify-center">
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-mono text-xs"
                title="Teams"
              >
                <Users className="size-3 text-primary" />
                {dept._count?.teams ?? 0}
              </div>
            </div>
          );
        },
      }),

      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const dept = row.original.department;
          const caps = dept._capabilities || {
            canEdit: true,
            canDelete: true,
            canAssignManager: true,
          };
          const hasAnyAction =
            caps.canEdit || caps.canAssignManager || caps.canDelete;

          return (
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
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:bg-accent"
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
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
          );
        },
      }),
    ]);
  }, [expandedIds, onAddSubDepartment, onEdit, onAssignManager, onDelete]);

  const table = useTable({
    features,
    data: flattenedRows,
    columns,
    getRowId: (row) => row.department.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const totalCount = totalUnitsCount ?? departments.length;
  const activeCount = activeUnitsCount ?? departments.filter((d) => d.isActive).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-3">
      {/* Unified Single Toolbar: Search, Status Filter Pills, Tree Controls, View Mode Switcher, and Columns Toggle */}
      <DataTableToolbar
        table={table}
        searchKey={typeof onSearchChange === "function" ? undefined : "department"}
        searchValue={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search code or name..."
        onReset={() => {
          if (onSearchChange) onSearchChange("");
          if (onStatusFilterChange) onStatusFilterChange("all");
        }}
        isFiltered={Boolean((searchQuery && searchQuery.trim() !== "") || statusFilter !== "all")}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tree Branch Expand / Collapse Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAll}
                className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
              >
                Expand All
              </Button>
              <span className="text-border">|</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
              >
                Collapse All
              </Button>
            </div>

            {/* View Mode Toggle */}
            {onViewModeChange && (
              <>
                <span className="text-border hidden sm:inline">|</span>
                <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
                  <Button
                    variant={viewMode === "tree" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onViewModeChange("tree")}
                    className={`h-7 text-xs px-2.5 gap-1.5 ${
                      viewMode === "tree"
                        ? "shadow-2xs font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    <LayoutList className="size-3.5" />
                    <span>Tree Table</span>
                  </Button>
                  <Button
                    variant={viewMode === "chart" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onViewModeChange("chart")}
                    className={`h-7 text-xs px-2.5 gap-1.5 ${
                      viewMode === "chart"
                        ? "shadow-2xs font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Network className="size-3.5" />
                    <span>Org Chart</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        }
      >
        {/* Status Filter Pills */}
        {onStatusFilterChange && (
          <div className="flex items-center gap-1">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusFilterChange("all")}
              className="h-8 text-xs"
            >
              All ({totalCount})
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusFilterChange("active")}
              className="h-8 text-xs"
            >
              Active ({activeCount})
            </Button>
            <Button
              variant={statusFilter === "inactive" ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusFilterChange("inactive")}
              className="h-8 text-xs"
            >
              Inactive ({inactiveCount})
            </Button>
          </div>
        )}

        {/* Tree Hierarchy Stats Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-[11px] text-muted-foreground">
          <Layers className="size-3.5 text-primary shrink-0" />
          <span>
            <strong>{rootCount}</strong> Root &bull; <strong>{subCount}</strong> Sub-Depts
          </span>
        </div>
      </DataTableToolbar>

      {/* TanStack Table Container */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-muted-foreground text-sm"
                >
                  No departments found matching the filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const depth = row.original.depth;
                return (
                  <TableRow
                    key={row.id}
                    className={`hover:bg-muted/20 transition-colors ${
                      depth > 0 ? "bg-muted/10" : ""
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
