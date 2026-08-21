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

export interface RoleCapabilities {
  canEdit?: boolean;
  canDelete?: boolean;
  canManageMatrix?: boolean;
}

export interface RoleItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  hierarchyLevel: number;
  isLeadership: boolean;
  department?: {
    id: string;
    code: string;
    name: string;
  } | null;
  _count?: {
    permissions?: number;
    users?: number;
  };
  _capabilities?: RoleCapabilities;
}

interface RoleTableProps {
  roles: RoleItem[];
  onEdit: (role: RoleItem, initialTab?: "details" | "permissions") => void;
  onDelete?: (role: RoleItem) => void;
}

const columnHelper = createColumnHelper<DataTableFeatures, RoleItem>();

export function RoleTable({
  roles,
  onEdit,
  onDelete,
}: RoleTableProps) {
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
          id: "role",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Role Code & Name" />
          ),
          cell: ({ row }) => {
            const role = row.original;
            return (
              <div className="flex flex-col">
                <span className="font-bold text-sm text-foreground">{role.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{role.code}</span>
                {role.description && (
                  <span className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                    {role.description}
                  </span>
                )}
              </div>
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) => row.department?.name || "System-Wide",
        {
          id: "department",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Department Scope" />
          ),
          cell: ({ row }) => (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building className="size-3.5" />
              <span>{row.original.department?.name || "System-Wide"}</span>
            </div>
          ),
        }
      ),

      columnHelper.accessor("hierarchyLevel", {
        id: "level",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Level / Authority" />
        ),
        cell: ({ row }) => {
          const role = row.original;
          return (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-medium">
                Tier {role.hierarchyLevel}
              </Badge>
              {role.isLeadership && (
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
            <DataTableColumnHeader column={column} title="Permissions & Members" />
          ),
          cell: ({ row }) => {
            const role = row.original;
            const permCount = role._count?.permissions ?? 0;
            const userCount = role._count?.users ?? 0;
            return (
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
                >
                  <ShieldCheck className="size-3" />
                  <span>{permCount} grant{permCount !== 1 ? "s" : ""}</span>
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3" />
                  <span>{userCount} user{userCount !== 1 ? "s" : ""}</span>
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
          const role = row.original;
          const caps = role._capabilities || {};

          return (
            <div className="flex items-center justify-end gap-2">
              {Boolean(caps.canManageMatrix) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
                  onClick={() => onEdit(role, "permissions")}
                >
                  <ShieldCheck className="size-3.5 mr-1" /> Matrix
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-8" />
                  }
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Actions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Role Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => onEdit(role, "details")}
                    disabled={!caps.canEdit}
                  >
                    <Pencil className="size-4 mr-2" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onEdit(role, "permissions")}
                    disabled={!caps.canManageMatrix}
                  >
                    <ShieldCheck className="size-4 mr-2" /> Permission Matrix
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete?.(role)}
                    disabled={!caps.canDelete}
                  >
                    <Trash2 className="size-4 mr-2" /> Delete Role
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }),
    ]);
  }, [onEdit, onDelete]);

  const table = useTable(
    {
      features,
      data: roles,
      columns,
      state: {
        sorting,
        columnFilters,
        columnVisibility,
        rowSelection,
        pagination,
      },
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      onPaginationChange: setPagination,
    }
  );

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchKey="role"
        searchPlaceholder="Filter roles by code or name..."
      >
        <DataTableViewOptions table={table} />
      </DataTableToolbar>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : header.column.columnDef.header instanceof Function
                      ? header.column.columnDef.header(header.getContext())
                      : header.column.columnDef.header}
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
                  className="hover:bg-muted/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {cell.column.columnDef.cell instanceof Function
                        ? cell.column.columnDef.cell(cell.getContext())
                        : (cell.getValue() as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No authorization roles found matching filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
