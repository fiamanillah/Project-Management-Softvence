import * as React from "react";
import type { ReactTable, RowData } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type { DataTableFeatures } from "./data-table-features";

interface DataTablePaginationProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
  pageSizeOptions?: number[];
  showSelectedCount?: boolean;
}

export function DataTablePagination<TData extends RowData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  showSelectedCount = true,
}: DataTablePaginationProps<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const paginationState = table.state.pagination || { pageIndex: 0, pageSize: 10 };
  const pageIndex = paginationState.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-3">
      {showSelectedCount ? (
        <div className="flex-1 text-xs text-muted-foreground">
          {selectedCount > 0 ? (
            <span>
              <strong>{selectedCount}</strong> of <strong>{totalCount}</strong> row(s) selected.
            </span>
          ) : (
            <span>
              Total <strong>{totalCount}</strong> records
            </span>
          )}
        </div>
      ) : (
        <div className="flex-1 text-xs text-muted-foreground">
          Total <strong>{totalCount}</strong> records
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="text-xs font-medium text-muted-foreground">Rows per page</p>
          <Select
            value={`${paginationState.pageSize}`}
            onValueChange={(value) => {
              if (value) {
                table.setPageSize(Number(value));
              }
            }}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue placeholder={`${paginationState.pageSize}`} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-[100px] items-center justify-center text-xs font-medium text-muted-foreground">
          Page {pageIndex + 1} of {Math.max(pageCount, 1)}
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            className="hidden size-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            title="First page"
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            title="Previous page"
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            title="Next page"
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            title="Last page"
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
