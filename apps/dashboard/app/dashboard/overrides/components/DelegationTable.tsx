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
import { Trash2, Calendar } from "lucide-react";
import {
  features,
  type DataTableFeatures,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";

export interface DelegationItem {
  id: string;
  scope: string;
  validFrom: string;
  validUntil: string;
  delegator: { id: string; email: string; firstName?: string; lastName?: string };
  delegatee: { id: string; email: string; firstName?: string; lastName?: string };
}

interface DelegationTableProps {
  delegations: DelegationItem[];
  onRevoke: (id: string) => void;
}

const columnHelper = createColumnHelper<DataTableFeatures, DelegationItem>();

export function DelegationTable({ delegations, onRevoke }: DelegationTableProps) {
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
        (row) =>
          `${row.delegator.firstName || ""} ${row.delegator.lastName || ""} ${row.delegator.email}`.trim(),
        {
          id: "delegator",
          header: ({ column }) => (
            <DataTableColumnHeader
              column={column}
              title="Delegator (Inherited From)"
            />
          ),
          cell: ({ row }) => {
            const del = row.original;
            return (
              <div className="flex flex-col">
                <span className="font-bold text-sm">
                  {del.delegator.firstName || del.delegator.lastName
                    ? `${del.delegator.firstName || ""} ${del.delegator.lastName || ""}`
                    : del.delegator.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {del.delegator.email}
                </span>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) =>
          `${row.delegatee.firstName || ""} ${row.delegatee.lastName || ""} ${row.delegatee.email}`.trim(),
        {
          id: "delegatee",
          header: ({ column }) => (
            <DataTableColumnHeader
              column={column}
              title="Delegatee (Recipient)"
            />
          ),
          cell: ({ row }) => {
            const del = row.original;
            return (
              <div className="flex flex-col">
                <span className="font-bold text-sm">
                  {del.delegatee.firstName || del.delegatee.lastName
                    ? `${del.delegatee.firstName || ""} ${del.delegatee.lastName || ""}`
                    : del.delegatee.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {del.delegatee.email}
                </span>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor("scope", {
        id: "scope",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Scope" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-xs">
            {row.original.scope}
          </Badge>
        ),
      }),

      columnHelper.accessor("validFrom", {
        id: "validity",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Validity Window" />
        ),
        cell: ({ row }) => {
          const del = row.original;
          return (
            <div className="flex flex-col text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />{" "}
                {new Date(del.validFrom).toLocaleDateString()} &rarr;{" "}
                {new Date(del.validUntil).toLocaleDateString()}
              </span>
            </div>
          );
        },
      }),

      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Action</div>,
        cell: ({ row }) => {
          const del = row.original;
          return (
            <div className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:text-rose-700"
                onClick={() => onRevoke(del.id)}
              >
                <Trash2 className="size-4 mr-1" /> Revoke
              </Button>
            </div>
          );
        },
      }),
    ]);
  }, [onRevoke]);

  const table = useTable({
    features,
    data: delegations,
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
        searchKey="delegator"
        searchPlaceholder="Search delegations by delegator..."
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
                  className="h-24 text-center text-muted-foreground text-sm"
                >
                  No active delegations configured.
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
