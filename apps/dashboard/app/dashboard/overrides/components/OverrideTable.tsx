"use client";

import * as React from "react";
import {
  useTable,
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
import {
  features,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";
import type { OverrideItem } from "../types";
import { getOverrideColumns } from "./OverrideColumns";
import { RevokeConfirmDialog } from "./RevokeConfirmDialog";

interface OverrideTableProps {
  overrides: OverrideItem[];
  onRevoke: (id: string) => Promise<void>;
}

export function OverrideTable({ overrides, onRevoke }: OverrideTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // State for confirm modal
  const [selectedOverride, setSelectedOverride] = React.useState<OverrideItem | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handlePromptRevoke = (override: OverrideItem) => {
    setSelectedOverride(override);
    setConfirmOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!selectedOverride) return;
    await onRevoke(selectedOverride.id);
    setSelectedOverride(null);
  };

  const columns = React.useMemo(() => {
    return getOverrideColumns(handlePromptRevoke);
  }, []);

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
        searchPlaceholder="Search overrides by user name or email..."
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
                  className="h-32 text-center text-muted-foreground text-sm"
                >
                  No user permission overrides found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Table Pagination */}
      <DataTablePagination table={table} />

      {/* Revocation Confirmation Dialog */}
      <RevokeConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Revoke Permission Override"
        description={`Are you sure you want to revoke the ${
          selectedOverride?.isDeny ? "explicit DENY" : "hand-GRANT"
        } override for "${selectedOverride?.user?.email}" on permission "${
          selectedOverride?.permission?.code
        }"?`}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  );
}
