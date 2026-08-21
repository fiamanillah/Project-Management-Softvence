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
  Users,
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
  ShieldCheck,
} from "lucide-react";
import type { UnifiedOrgNode, OrgNodeType } from "@workspace/shared";
import {
  features,
  type DataTableFeatures,
  DataTableColumnHeader,
  DataTableToolbar,
  DataTablePagination,
  UnitLeadershipStack,
} from "@/components/data-table";

interface UnifiedOrgTableProps {
  nodes: UnifiedOrgNode[];
  onAddChild: (parentNode: UnifiedOrgNode, childType: OrgNodeType) => void;
  onEdit: (node: UnifiedOrgNode) => void;
  onAssignLeadership: (node: UnifiedOrgNode) => void;
  onDelete: (node: UnifiedOrgNode) => void;
  // Toolbar integration props
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  typeFilter?: "all" | "BRANCH" | "DEPARTMENT" | "TEAM";
  onTypeFilterChange?: (val: "all" | "BRANCH" | "DEPARTMENT" | "TEAM") => void;
  statusFilter?: "all" | "active" | "inactive";
  onStatusFilterChange?: (val: "all" | "active" | "inactive") => void;
  viewMode?: "tree" | "chart";
  onViewModeChange?: (val: "tree" | "chart") => void;
}

export interface FlattenedOrgRow {
  node: UnifiedOrgNode;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  parentName?: string;
}

const columnHelper = createColumnHelper<DataTableFeatures, FlattenedOrgRow>();

export function UnifiedOrgTable({
  nodes,
  onAddChild,
  onEdit,
  onAssignLeadership,
  onDelete,
  searchQuery,
  onSearchChange,
  typeFilter = "all",
  onTypeFilterChange,
  statusFilter = "all",
  onStatusFilterChange,
  viewMode = "tree",
  onViewModeChange,
}: UnifiedOrgTableProps) {
  // Track expanded nodes
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => {
    const ids = new Set<string>();
    const collectIds = (node: UnifiedOrgNode) => {
      ids.add(node.id);
      node.children?.forEach(collectIds);
    };
    nodes.forEach(collectIds);
    return ids;
  });

  React.useEffect(() => {
    const ids = new Set<string>();
    const collectIds = (node: UnifiedOrgNode) => {
      ids.add(node.id);
      node.children?.forEach(collectIds);
    };
    nodes.forEach(collectIds);
    setExpandedIds(ids);
  }, [nodes]);

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
    const ids = new Set<string>();
    const collectIds = (node: UnifiedOrgNode) => {
      ids.add(node.id);
      node.children?.forEach(collectIds);
    };
    nodes.forEach(collectIds);
    setExpandedIds(ids);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Build flattened hierarchical rows
  const { flattenedRows, branchCount, deptCount, teamCount } = React.useMemo(() => {
    const rows: FlattenedOrgRow[] = [];
    let branches = 0;
    let depts = 0;
    let teams = 0;

    const traverse = (node: UnifiedOrgNode, depth: number, parentName?: string) => {
      if (node.type === "BRANCH") branches++;
      if (node.type === "DEPARTMENT") depts++;
      if (node.type === "TEAM") teams++;

      const children = node.children || [];
      const hasChildren = children.length > 0;

      // Check type filter for display (if filtering by specific type, or "all")
      const matchesType = (typeFilter as string) === "all" || node.type === typeFilter;

      if (matchesType) {
        rows.push({
          node,
          depth,
          hasChildren,
          childCount: children.length,
          parentName,
        });
      }

      if (hasChildren && (expandedIds.has(node.id) || typeFilter !== "all")) {
        children.forEach((child) => {
          traverse(child, depth + 1, node.name);
        });
      }
    };

    nodes.forEach((root) => {
      traverse(root, 0);
    });

    return {
      flattenedRows: rows,
      branchCount: branches,
      deptCount: depts,
      teamCount: teams,
    };
  }, [nodes, expandedIds, typeFilter]);

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
      columnHelper.accessor((row) => row.node.name, {
        id: "unit",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Organizational Unit & Hierarchy" />
        ),
        cell: ({ row }) => {
          const { node, depth, hasChildren, childCount } = row.original;
          const isExpanded = expandedIds.has(node.id);
          const isBranch = node.type === "BRANCH";
          const isDepartment = node.type === "DEPARTMENT";

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
                  onClick={() => toggleExpand(node.id)}
                  className="size-6 rounded-md hover:bg-muted border bg-background flex items-center justify-center text-muted-foreground transition-colors shrink-0 cursor-pointer shadow-2xs"
                  title={isExpanded ? "Collapse unit children" : "Expand unit children"}
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
                        : depth === 1
                          ? "font-medium text-foreground/90"
                          : "font-normal text-foreground/80 text-xs"
                    }`}
                  >
                    {node.name}
                  </span>
                  {hasChildren && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] py-0 px-1.5 text-muted-foreground font-normal"
                    >
                      {childCount} {isBranch ? "units" : isDepartment ? "items" : "members"}
                    </Badge>
                  )}
                </div>
                {node.description ? (
                  <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                    {node.description}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ID: {node.id.substring(0, 8)}...
                  </span>
                )}
              </div>
            </div>
          );
        },
      }),

      columnHelper.accessor((row) => row.node.type, {
        id: "type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tier Type" />
        ),
        cell: ({ row }) => {
          const type = row.original.node.type;
          switch (type) {
            case "BRANCH":
              return (
                <Badge
                  variant="outline"
                  className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400 flex items-center gap-1 w-fit text-xs font-semibold"
                >
                  <GitBranch className="size-3 text-indigo-500" /> Branch
                </Badge>
              );
            case "DEPARTMENT":
              return (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 flex items-center gap-1 w-fit text-xs font-semibold"
                >
                  <Building2 className="size-3 text-emerald-500" /> Department
                </Badge>
              );
            case "TEAM":
              return (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 flex items-center gap-1 w-fit text-xs font-semibold"
                >
                  <Users className="size-3 text-amber-500" /> Team
                </Badge>
              );
            default:
              return null;
          }
        },
      }),

      columnHelper.accessor((row) => row.node.code, {
        id: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Code" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono font-bold bg-muted/30">
            {row.original.node.code}
          </Badge>
        ),
      }),

      columnHelper.accessor((row) => row.parentName || "Enterprise Root", {
        id: "parentUnit",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Parent Context" />
        ),
        cell: ({ row }) => {
          const { node, parentName } = row.original;
          if (!parentName) {
            return (
              <Badge
                variant="secondary"
                className="bg-secondary/60 text-secondary-foreground flex items-center gap-1 w-fit font-semibold text-xs"
              >
                <GitBranch className="size-3 text-primary" /> Root Holding
              </Badge>
            );
          }

          const icon =
            node.parentType === "BRANCH" ? (
              <GitBranch className="size-3 text-indigo-500" />
            ) : node.parentType === "DEPARTMENT" ? (
              <Building2 className="size-3 text-emerald-500" />
            ) : (
              <CornerDownRight className="size-3 text-muted-foreground" />
            );

          return (
            <Badge
              variant="outline"
              className="bg-muted/40 text-foreground flex items-center gap-1 w-fit font-normal text-xs"
            >
              {icon}
              <span className="truncate max-w-[130px]">{parentName}</span>
            </Badge>
          );
        },
      }),

      columnHelper.accessor((row) => (row.node.isActive ? "Active" : "Inactive"), {
        id: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const active = row.original.node.isActive;
          return active ? (
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
        (row) => {
          const n = row.node;
          if (n.teamLead) return n.teamLead.fullName;
          if (n.managers && n.managers.length > 0) {
            return n.managers.map((m) => m.fullName).join(", ");
          }
          return "Unassigned";
        },
        {
          id: "leadership",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Unit Leadership" />
          ),
          cell: ({ row }) => {
            const n = row.original.node;
            if (n.type === "TEAM") {
              return (
                <UnitLeadershipStack
                  singleLead={n.teamLead}
                  roleTitle="Team Lead"
                  showLeadBadge={true}
                  emptyLabel="No lead assigned"
                />
              );
            }

            return (
              <UnitLeadershipStack
                items={n.managers}
                roleTitle={n.type === "BRANCH" ? "Branch Manager" : "Department Manager"}
                maxVisible={3}
                showLeadBadge={true}
                emptyLabel="No leadership"
              />
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) =>
          row.node.counts?.subBranches ??
          row.node.counts?.subDepartments ??
          row.node.counts?.teams ??
          row.node.counts?.members ??
          0,
        {
          id: "childrenSummary",
          header: () => <div className="text-center">Nested Assets</div>,
          cell: ({ row }) => {
            const n = row.original.node;
            if (n.type === "BRANCH") {
              return (
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <span title="Sub-branches" className="flex items-center gap-0.5">
                    <Layers className="size-3 text-purple-500" /> {n.counts?.subBranches || 0}
                  </span>
                  <span>&bull;</span>
                  <span title="Departments" className="flex items-center gap-0.5">
                    <Building2 className="size-3 text-emerald-500" /> {n.counts?.departments || 0}
                  </span>
                </div>
              );
            }

            if (n.type === "DEPARTMENT") {
              return (
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <span title="Sub-departments" className="flex items-center gap-0.5">
                    <Layers className="size-3 text-purple-500" /> {n.counts?.subDepartments || 0}
                  </span>
                  <span>&bull;</span>
                  <span title="Teams" className="flex items-center gap-0.5">
                    <Users className="size-3 text-amber-500" /> {n.counts?.teams || 0}
                  </span>
                </div>
              );
            }

            return (
              <div className="flex justify-center">
                <span title="Members" className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                  <Users className="size-3 text-primary" /> {n.counts?.members || 0}
                </span>
              </div>
            );
          },
        }
      ),

      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const n = row.original.node;
          const caps = n._capabilities || {
            canEdit: false,
            canDelete: false,
            canAssignManager: false,
            canAddSubBranch: false,
            canAddDepartment: false,
            canAddSubDepartment: false,
            canAddTeam: false,
          };

          const canAddAny =
            caps.canAddSubBranch || caps.canAddDepartment || caps.canAddSubDepartment || caps.canAddTeam;

          return (
            <div className="flex items-center justify-end gap-1">
              {/* Quick Add Child Button */}
              {canAddAny && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title="Add child organizational unit"
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                  >
                    <Plus className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Add Child Unit</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {caps.canAddSubBranch && (
                      <DropdownMenuItem onClick={() => onAddChild(n, "BRANCH")}>
                        <GitBranch className="mr-2 size-4 text-indigo-500" />
                        Sub-Branch
                      </DropdownMenuItem>
                    )}
                    {caps.canAddDepartment && (
                      <DropdownMenuItem onClick={() => onAddChild(n, "DEPARTMENT")}>
                        <Building2 className="mr-2 size-4 text-emerald-500" />
                        Department
                      </DropdownMenuItem>
                    )}
                    {caps.canAddSubDepartment && (
                      <DropdownMenuItem onClick={() => onAddChild(n, "DEPARTMENT")}>
                        <Layers className="mr-2 size-4 text-purple-500" />
                        Sub-Department
                      </DropdownMenuItem>
                    )}
                    {caps.canAddTeam && (
                      <DropdownMenuItem onClick={() => onAddChild(n, "TEAM")}>
                        <Users className="mr-2 size-4 text-amber-500" />
                        Team
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Node Operations Dropdown */}
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
                  <DropdownMenuLabel>Manage {n.type.toLowerCase()}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {caps.canEdit && (
                    <DropdownMenuItem onClick={() => onEdit(n)}>
                      <Pencil className="mr-2 size-4 text-muted-foreground" />
                      Edit Details
                    </DropdownMenuItem>
                  )}
                  {caps.canAssignManager && (
                    <DropdownMenuItem onClick={() => onAssignLeadership(n)}>
                      <UserCheck className="mr-2 size-4 text-muted-foreground" />
                      Manage Leadership
                    </DropdownMenuItem>
                  )}
                  {caps.canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(n)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete Unit
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }),
    ]);
  }, [expandedIds, onAddChild, onEdit, onAssignLeadership, onDelete]);

  const table = useTable({
    features,
    data: flattenedRows,
    columns,
    getRowId: (row) => row.node.id,
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

  const totalCount = branchCount + deptCount + teamCount;

  return (
    <div className="space-y-3">
      {/* Single Unified Toolbar */}
      <DataTableToolbar
        table={table}
        searchKey={typeof onSearchChange === "function" ? undefined : "unit"}
        searchValue={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search unit code, name, or description across all tiers..."
        onReset={() => {
          if (onSearchChange) onSearchChange("");
          if (onTypeFilterChange) onTypeFilterChange("all");
          if (onStatusFilterChange) onStatusFilterChange("all");
        }}
        isFiltered={Boolean(
          (searchQuery && searchQuery.trim() !== "") ||
            typeFilter !== "all" ||
            statusFilter !== "all"
        )}
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
        {/* Tier Type Filter Pills */}
        {onTypeFilterChange && (
          <div className="flex items-center gap-1">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => onTypeFilterChange("all")}
              className="h-8 text-xs"
            >
              All ({totalCount})
            </Button>
            <Button
              variant={typeFilter === "BRANCH" ? "default" : "outline"}
              size="sm"
              onClick={() => onTypeFilterChange("BRANCH")}
              className="h-8 text-xs gap-1"
            >
              <GitBranch className="size-3 text-indigo-500" /> Branches ({branchCount})
            </Button>
            <Button
              variant={typeFilter === "DEPARTMENT" ? "default" : "outline"}
              size="sm"
              onClick={() => onTypeFilterChange("DEPARTMENT")}
              className="h-8 text-xs gap-1"
            >
              <Building2 className="size-3 text-emerald-500" /> Depts ({deptCount})
            </Button>
            <Button
              variant={typeFilter === "TEAM" ? "default" : "outline"}
              size="sm"
              onClick={() => onTypeFilterChange("TEAM")}
              className="h-8 text-xs gap-1"
            >
              <Users className="size-3 text-amber-500" /> Teams ({teamCount})
            </Button>
          </div>
        )}
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
                  No organizational units found matching the filter criteria.
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
