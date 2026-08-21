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
  GitBranch,
  Building2,
  MoreHorizontal,
  Pencil,
  UserCheck,
  UserX,
  Trash2,
  CheckCircle2,
  XCircle,
  CornerDownRight,
  ChevronDown,
  ChevronRight,
  Plus,
  Layers,
  LayoutList,
  Network,
} from "lucide-react";
import type { BranchWithCapabilities } from "./org-chart/types";
import {
  features,
  type DataTableFeatures,
  DataTableColumnHeader,
  DataTableToolbar,
  DataTablePagination,
  UnitLeadershipStack,
} from "@/components/data-table";

interface BranchTableProps {
  branches: BranchWithCapabilities[];
  onEdit: (branch: BranchWithCapabilities) => void;
  onAssignManager: (branch: BranchWithCapabilities) => void;
  onAddSubBranch?: (parentBranch: BranchWithCapabilities) => void;
  onDelete: (branch: BranchWithCapabilities) => void;
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

export interface FlattenedBranchRow {
  branch: BranchWithCapabilities;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  isLastChild: boolean;
  parentName?: string;
}

const columnHelper = createColumnHelper<DataTableFeatures, FlattenedBranchRow>();

export function BranchTable({
  branches,
  onEdit,
  onAssignManager,
  onAddSubBranch,
  onDelete,
  searchQuery,
  onSearchChange,
  statusFilter = "all",
  onStatusFilterChange,
  viewMode = "tree",
  onViewModeChange,
  totalUnitsCount,
  activeUnitsCount,
}: BranchTableProps) {
  // Track expanded branches
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => {
    return new Set(branches.map((b) => b.id));
  });

  // Keep all expanded whenever branches list changes
  React.useEffect(() => {
    setExpandedIds(new Set(branches.map((b) => b.id)));
  }, [branches]);

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
    setExpandedIds(new Set(branches.map((b) => b.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Build flattened hierarchical rows
  const { flattenedRows, rootCount, subCount } = React.useMemo(() => {
    const childrenMap = new Map<string, BranchWithCapabilities[]>();
    const roots: BranchWithCapabilities[] = [];
    let subs = 0;

    branches.forEach((b) => {
      if (b.parentId) {
        subs++;
        const currentChildren = childrenMap.get(b.parentId) || [];
        currentChildren.push(b);
        childrenMap.set(b.parentId, currentChildren);
      }
    });

    branches.forEach((b) => {
      if (!b.parentId || !branches.some((other) => other.id === b.parentId)) {
        roots.push(b);
      }
    });

    roots.sort((a, b) => a.name.localeCompare(b.name));

    const rows: FlattenedBranchRow[] = [];

    const traverse = (
      node: BranchWithCapabilities,
      depth: number,
      isLast: boolean,
      parentName?: string,
    ) => {
      const children = (childrenMap.get(node.id) || []).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const hasChildren = children.length > 0;

      rows.push({
        branch: node,
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
  }, [branches, expandedIds]);

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Define table columns
  const columns = React.useMemo(() => {
    return columnHelper.columns([
      columnHelper.accessor((row) => row.branch.name, {
        id: "branch",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Branch & Hierarchy" />
        ),
        cell: ({ row }) => {
          const { branch, depth, hasChildren, childCount } = row.original;
          const isExpanded = expandedIds.has(branch.id);

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
                  onClick={() => toggleExpand(branch.id)}
                  className="size-6 rounded-md hover:bg-muted border bg-background flex items-center justify-center text-muted-foreground transition-colors shrink-0 cursor-pointer shadow-2xs"
                  title={isExpanded ? "Collapse sub-branches" : "Expand sub-branches"}
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
                    {branch.name}
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
                {branch.description ? (
                  <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                    {branch.description}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ID: {branch.id.substring(0, 8)}...
                  </span>
                )}
              </div>
            </div>
          );
        },
      }),

      columnHelper.accessor((row) => row.branch.code, {
        id: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Code" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono font-bold bg-muted/30">
            {row.original.branch.code}
          </Badge>
        ),
      }),

      columnHelper.accessor((row) => row.branch.parent?.name || "Enterprise Root", {
        id: "hierarchyUnit",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Hierarchy Unit" />
        ),
        cell: ({ row }) => {
          const b = row.original.branch;
          return b.parent ? (
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 flex items-center gap-1 w-fit font-normal text-xs"
            >
              <GitBranch className="size-3" />
              <span className="truncate max-w-[140px]">{b.parent.name}</span>
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-secondary/60 text-secondary-foreground flex items-center gap-1 w-fit font-semibold text-xs"
            >
              <GitBranch className="size-3 text-primary" /> Root Org
            </Badge>
          );
        },
      }),

      columnHelper.accessor((row) => (row.branch.isActive ? "Active" : "Inactive"), {
        id: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const b = row.original.branch;
          return b.isActive ? (
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
          row.branch.managers
            ?.filter((m) => !m.unassignedAt)
            .map((m) => `${m.user?.firstName || ""} ${m.user?.lastName || ""} ${m.user?.email || ""}`)
            .join(", ") || "Unassigned",
        {
          id: "managers",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Active Leadership" />
          ),
          cell: ({ row }) => (
            <UnitLeadershipStack
              items={row.original.branch.managers}
              roleTitle="Branch Manager"
              maxVisible={3}
              showLeadBadge={true}
              emptyLabel="No leadership"
            />
          ),
        }
      ),

      columnHelper.accessor((row) => row.branch._count?.subBranches ?? row.childCount, {
        id: "subBranches",
        header: () => <div className="text-center">Sub-Hubs</div>,
        cell: ({ row }) => {
          const b = row.original.branch;
          return (
            <div className="flex justify-center">
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-mono text-xs"
                title="Sub-Branches"
              >
                <Layers className="size-3 text-purple-500" />
                {b._count?.subBranches ?? row.original.childCount}
              </div>
            </div>
          );
        },
      }),

      columnHelper.accessor((row) => row.branch._count?.departments ?? 0, {
        id: "departments",
        header: () => <div className="text-center">Departments</div>,
        cell: ({ row }) => {
          const b = row.original.branch;
          return (
            <div className="flex justify-center">
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-mono text-xs"
                title="Departments Hosted"
              >
                <Building2 className="size-3 text-primary" />
                {b._count?.departments ?? 0}
              </div>
            </div>
          );
        },
      }),

      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const b = row.original.branch;
          const caps = b._capabilities || {
            canEdit: false,
            canDelete: false,
            canAssignManager: false,
            canCreateSubBranch: false,
          };
          const hasAnyAction =
            caps.canEdit || caps.canAssignManager || caps.canCreateSubBranch || caps.canDelete;

          return (
            <div className="flex items-center justify-end gap-1">
              {caps.canCreateSubBranch && onAddSubBranch && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onAddSubBranch(b)}
                  className="size-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  title="Add Sub-Branch under this branch"
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
                    <DropdownMenuLabel>Manage Branch</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {caps.canCreateSubBranch && onAddSubBranch && (
                      <DropdownMenuItem onClick={() => onAddSubBranch(b)}>
                        <Plus className="mr-2 size-4 text-primary" />
                        Add Sub-Branch
                      </DropdownMenuItem>
                    )}
                    {caps.canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(b)}>
                        <Pencil className="mr-2 size-4 text-muted-foreground" />
                        Edit Details
                      </DropdownMenuItem>
                    )}
                    {caps.canAssignManager && (
                      <DropdownMenuItem onClick={() => onAssignManager(b)}>
                        <UserCheck className="mr-2 size-4 text-muted-foreground" />
                        Manage Leadership
                      </DropdownMenuItem>
                    )}
                    {caps.canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(b)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete Branch
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
  }, [expandedIds, onAddSubBranch, onEdit, onAssignManager, onDelete]);

  const table = useTable({
    features,
    data: flattenedRows,
    columns,
    getRowId: (row) => row.branch.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
  });

  const totalCount = totalUnitsCount ?? branches.length;
  const activeCount = activeUnitsCount ?? branches.filter((b) => b.isActive).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-3">
      {/* Unified Single Toolbar */}
      <DataTableToolbar
        table={table}
        searchKey={typeof onSearchChange === "function" ? undefined : "branch"}
        searchValue={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search branch code, name, or purpose..."
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
            <strong>{rootCount}</strong> Primary &bull; <strong>{subCount}</strong> Sub-Branches
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
                  No branches found matching the filter criteria.
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

      {/* TanStack Pagination Toolbar */}
      <DataTablePagination table={table} />
    </div>
  );
}
