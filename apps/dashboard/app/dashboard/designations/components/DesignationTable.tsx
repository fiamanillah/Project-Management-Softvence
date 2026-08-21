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
  Building,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Briefcase,
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
  } | null;
  _count?: {
    users?: number;
  };
  _capabilities?: DesignationCapabilities;
}

interface DesignationTableProps {
  designations: DesignationItem[];
  onEdit: (designation: DesignationItem) => void;
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
            <DataTableColumnHeader column={column} title="Designation / Job Title" />
          ),
          cell: ({ row }) => {
            const desig = row.original;
            return (
              <div className="flex flex-col">
                <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Briefcase className="size-3.5 text-primary/70" />
                  {desig.name}
                </span>
                <span className="text-xs text-muted-foreground font-mono pl-5">{desig.code}</span>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) => row.department?.name || "Company-Wide",
        {
          id: "department",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Department" />
          ),
          cell: ({ row }) => (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building className="size-3.5" />
              <span>{row.original.department?.name || "Company-Wide"}</span>
            </div>
          ),
        }
      ),

      columnHelper.accessor("hierarchyLevel", {
        id: "level",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Level / Seniority" />
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
        (row) => row._count?.users ?? 0,
        {
          id: "users",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Assigned Employees" />
          ),
          cell: ({ row }) => {
            const desig = row.original;
            const userCount = desig._count?.users ?? 0;
            return (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                <span>{userCount} employee{userCount !== 1 ? "s" : ""}</span>
              </div>
            );
          },
        }
      ),

      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const desig = row.original;
          const caps = desig._capabilities || {};

          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onEdit(desig)}
                disabled={!caps.canEdit}
              >
                <Pencil className="size-3.5 mr-1" /> Edit
              </Button>

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
                  <DropdownMenuLabel>Designation Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => onEdit(desig)}
                    disabled={!caps.canEdit}
                  >
                    <Pencil className="size-4 mr-2" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete?.(desig)}
                    disabled={!caps.canDelete}
                  >
                    <Trash2 className="size-4 mr-2" /> Delete Designation
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
      data: designations,
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
        searchKey="designation"
        searchPlaceholder="Filter designations by code or job title..."
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
                  No designations found matching filter.
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
