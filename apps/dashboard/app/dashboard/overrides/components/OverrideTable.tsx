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
import { Trash2, ShieldAlert, ShieldCheck, Clock } from "lucide-react";
import {
  features,
  type DataTableFeatures,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";

export interface OverrideItem {
  id: string;
  isDeny: boolean;
  reason?: string;
  expiresAt?: string;
  createdAt: string;
  user: { id: string; email: string; firstName?: string; lastName?: string };
  permission: { id: string; code: string; module: string; description: string };
  granter: { id: string; email: string; firstName?: string; lastName?: string };
}

interface OverrideTableProps {
  overrides: OverrideItem[];
  onRevoke: (id: string) => void;
}

const columnHelper = createColumnHelper<DataTableFeatures, OverrideItem>();

export function OverrideTable({ overrides, onRevoke }: OverrideTableProps) {
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
          `${row.user.firstName || ""} ${row.user.lastName || ""} ${row.user.email}`.trim(),
        {
          id: "user",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="User" />
          ),
          cell: ({ row }) => {
            const ov = row.original;
            return (
              <div className="flex flex-col">
                <span className="font-bold text-sm">
                  {ov.user.firstName || ov.user.lastName
                    ? `${ov.user.firstName || ""} ${ov.user.lastName || ""}`
                    : ov.user.email}
                </span>
                <span className="text-xs text-muted-foreground">{ov.user.email}</span>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) => `${row.permission.code} ${row.permission.module}`,
        {
          id: "permission",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Permission / Module" />
          ),
          cell: ({ row }) => {
            const ov = row.original;
            return (
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold">
                  {ov.permission.code}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {ov.permission.module}
                </span>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor("isDeny", {
        id: "overrideType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Override Type" />
        ),
        cell: ({ row }) => {
          const ov = row.original;
          return ov.isDeny ? (
            <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1">
              <ShieldAlert className="size-3" /> Explicit DENY
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
              <ShieldCheck className="size-3" /> Hand-GRANT
            </Badge>
          );
        },
      }),

      columnHelper.accessor("expiresAt", {
        id: "expiration",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Expiration / Reason" />
        ),
        cell: ({ row }) => {
          const ov = row.original;
          return (
            <div className="flex flex-col text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />{" "}
                {ov.expiresAt
                  ? new Date(ov.expiresAt).toLocaleDateString()
                  : "Permanent"}
              </span>
              {ov.reason && (
                <span className="italic truncate max-w-xs">{ov.reason}</span>
              )}
            </div>
          );
        },
      }),

      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Action</div>,
        cell: ({ row }) => {
          const ov = row.original;
          return (
            <div className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:text-rose-700"
                onClick={() => onRevoke(ov.id)}
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
    data: overrides,
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
        searchKey="user"
        searchPlaceholder="Search overrides by user..."
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
                  No user permission overrides configured.
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
