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
import { Input } from "@workspace/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  ShieldCheck,
  Building,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Search,
} from "lucide-react";
import {
  features,
  type DataTableFeatures,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
} from "@/components/data-table";

export interface DesignationCapabilities {
  canEdit?: boolean;
  canDelete?: boolean;
  canManageMatrix?: boolean;
}

export interface DesignationItem {
  id: string;
  code: string;
  name: string;
  hierarchyLevel: number;
  isLeadership: boolean;
  department?: {
    id: string;
    code: string;
    name: string;
  };
  _count?: {
    permissions?: number;
    users?: number;
  };
  _capabilities?: DesignationCapabilities;
}

interface DesignationTableProps {
  designations: DesignationItem[];
  onEdit: (designation: DesignationItem, initialTab?: "details" | "permissions") => void;
  onDelete?: (designation: DesignationItem) => void;
}

const columnHelper = createColumnHelper<DataTableFeatures, DesignationItem>();

export function DesignationTable({
  designations,
  onEdit,
  onDelete,
}: DesignationTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = React.useMemo(() => {
    return columnHelper.columns([
      columnHelper.accessor(
        (row) => `${row.name} ${row.code}`,
        {
          id: "designation",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Designation Code & Name" />
          ),
          cell: ({ row }) => {
            const desig = row.original;
            return (
              <div className="flex flex-col">
                <span className="font-bold text-sm text-foreground">{desig.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{desig.code}</span>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) => row.department?.name || "System",
        {
          id: "department",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Department" />
          ),
          cell: ({ row }) => (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building className="size-3.5" />
              <span>{row.original.department?.name || "System"}</span>
            </div>
          ),
        }
      ),

      columnHelper.accessor("hierarchyLevel", {
        id: "level",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Level / Leadership" />
        ),
        cell: ({ row }) => {
          const desig = row.original;
          return (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Level {desig.hierarchyLevel}
              </Badge>
              {desig.isLeadership && (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold">
                  Leadership
                </Badge>
              )}
            </div>
          );
        },
      }),

      columnHelper.accessor(
        (row) => row._count?.permissions ?? 0,
        {
          id: "grants",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Assigned Grants & Users" />
          ),
          cell: ({ row }) => {
            const desig = row.original;
            return (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-primary">
                  {desig._count?.permissions || 0} Permissions Granted
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Users className="size-3" />
                  {desig._count?.users || 0} Active User{(desig._count?.users ?? 0) === 1 ? "" : "s"}
                </span>
              </div>
            );
          },
        }
      ),

      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right w-[90px]">Actions</div>,
        cell: ({ row }) => {
          const desig = row.original;
          const caps = desig._capabilities || {
            canEdit: true,
            canDelete: true,
            canManageMatrix: true,
          };
          const hasAnyAction =
            caps.canEdit || caps.canManageMatrix || caps.canDelete;

          return (
            <div className="flex items-center justify-end">
              {hasAnyAction ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:bg-accent"
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Manage Designation</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {caps.canEdit && (
                      <DropdownMenuItem
                        onClick={() => onEdit(desig, "details")}
                        className="cursor-pointer"
                      >
                        <Pencil className="mr-2 size-4 text-muted-foreground" />
                        Edit Designation
                      </DropdownMenuItem>
                    )}
                    {caps.canManageMatrix && (
                      <DropdownMenuItem
                        onClick={() => onEdit(desig, "permissions")}
                        className="cursor-pointer"
                      >
                        <ShieldCheck className="mr-2 size-4 text-muted-foreground" />
                        Permission Matrix
                      </DropdownMenuItem>
                    )}
                    {caps.canDelete && onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => onDelete(desig)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete Designation
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
  }, [onEdit, onDelete]);

  const table = useTable({
    features,
    data: designations,
    columns,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <DataTableToolbar
        table={table}
        searchKey="designation"
        searchPlaceholder="Search designations by name or code..."
      />

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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/20 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-muted-foreground text-sm"
                >
                  No designations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Table Pagination */}
      <DataTablePagination table={table} />
    </div>
  );
}
