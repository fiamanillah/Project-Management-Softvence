"use client";

import * as React from "react";
import {
  useTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type RowData,
  type SortingState,
  type Table as TableInstance,
} from "@tanstack/react-table";
import { Loader2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { features, type DataTableFeatures } from "./data-table-features";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData, any>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  toolbarContent?: (table: TableInstance<DataTableFeatures, TData>) => React.ReactNode;
  actions?: React.ReactNode;
  showPagination?: boolean;
  showToolbar?: boolean;
  showViewOptions?: boolean;
  isLoading?: boolean;
  emptyMessage?: React.ReactNode;
  pageSize?: number;
  className?: string;
  containerClassName?: string;
  getRowId?: (originalRow: TData, index: number) => string;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search records...",
  toolbarContent,
  actions,
  showPagination = true,
  showToolbar = true,
  showViewOptions = true,
  isLoading = false,
  emptyMessage = "No results found.",
  pageSize = 10,
  className,
  containerClassName,
  getRowId,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
  });

  const table = useTable({
    features,
    data,
    columns,
    getRowId,
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
    <div className={cn("space-y-4", containerClassName)}>
      {showToolbar && (
        <DataTableToolbar
          table={table}
          searchKey={searchKey}
          searchPlaceholder={searchPlaceholder}
          showSearch={Boolean(searchKey)}
          showViewOptions={showViewOptions}
          actions={actions}
        >
          {toolbarContent && toolbarContent(table)}
        </DataTableToolbar>
      )}

      <div className={cn("rounded-xl border bg-card shadow-xs overflow-hidden", className)}>
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span className="text-xs">Loading data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/30 transition-colors"
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
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && <DataTablePagination table={table} />}
    </div>
  );
}
