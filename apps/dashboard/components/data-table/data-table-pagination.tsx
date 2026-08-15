"use client";

import * as React from "react";
import type { ReactTable, Table, RowData } from "@tanstack/react-table";
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
import { cn } from "@workspace/ui/lib/utils";
import type { DataTableFeatures } from "./data-table-features";

export interface DataTablePaginationProps<TData extends RowData = any> {
  table?: ReactTable<DataTableFeatures, TData> | Table<DataTableFeatures, TData>;
  pageSizeOptions?: number[];
  showSelectedCount?: boolean;
  showPageNumbers?: boolean;
  // Optional standalone / server-side pagination props
  currentPage?: number; // 1-indexed
  totalPages?: number;
  totalItems?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function DataTablePagination<TData extends RowData = any>({
  table,
  pageSizeOptions = [10, 20, 30, 50, 100],
  showSelectedCount = true,
  showPageNumbers = true,
  currentPage: controlledCurrentPage,
  totalPages: controlledTotalPages,
  totalItems: controlledTotalItems,
  limit: controlledLimit,
  onPageChange: controlledOnPageChange,
  onLimitChange: controlledOnLimitChange,
  isLoading = false,
  className,
}: DataTablePaginationProps<TData>) {
  // Determine state values from table or controlled props
  const isServer = typeof controlledCurrentPage !== "undefined" && typeof controlledOnPageChange === "function";

  const selectedCount = table && table.getFilteredSelectedRowModel
    ? table.getFilteredSelectedRowModel().rows.length
    : 0;

  const totalCount =
    typeof controlledTotalItems === "number"
      ? controlledTotalItems
      : table && table.getFilteredRowModel
        ? table.getFilteredRowModel().rows.length
        : table && table.getRowCount
          ? table.getRowCount()
          : 0;

  const paginationState = (table as any)?.state?.pagination || {
    pageIndex: 0,
    pageSize: 10,
  };

  const pageIndex = isServer
    ? (controlledCurrentPage! - 1)
    : (paginationState.pageIndex ?? 0);

  const pageSize = isServer
    ? (controlledLimit || 20)
    : (paginationState.pageSize ?? 10);

  const pageCount = isServer
    ? Math.max(1, controlledTotalPages || Math.ceil(totalCount / pageSize) || 1)
    : Math.max(1, table?.getPageCount ? table.getPageCount() : Math.ceil(totalCount / pageSize) || 1);

  const currentDisplayPage = pageIndex + 1;

  // Calculate items range (e.g. Showing 1 to 20 of 100)
  const startItem = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalCount);

  const handlePageChange = (targetPage: number) => {
    if (isServer && controlledOnPageChange) {
      controlledOnPageChange(targetPage);
    } else if (table) {
      table.setPageIndex(targetPage - 1);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (isServer && controlledOnLimitChange) {
      controlledOnLimitChange(newSize);
    } else if (table) {
      table.setPageSize(newSize);
    }
  };

  const canPreviousPage = isServer ? currentDisplayPage > 1 : Boolean(table?.getCanPreviousPage && table.getCanPreviousPage());
  const canNextPage = isServer ? currentDisplayPage < pageCount : Boolean(table?.getCanNextPage && table.getCanNextPage());

  // Generate numbered pages window (1, 2, 3 ... 10)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (pageCount <= maxVisible) {
      for (let i = 1; i <= pageCount; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentDisplayPage - 1);
      let end = Math.min(pageCount - 1, currentDisplayPage + 1);

      if (currentDisplayPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentDisplayPage >= pageCount - 2) {
        start = pageCount - 3;
        end = pageCount - 1;
      }

      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < pageCount - 1) pages.push("...");
      pages.push(pageCount);
    }

    return pages;
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-3 rounded-xl border border-border/80 text-xs shadow-2xs",
        className
      )}
    >
      {/* Left side: Item range & Selection info */}
      <div className="flex items-center gap-4 text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        {showSelectedCount && selectedCount > 0 ? (
          <span>
            <strong className="font-semibold text-foreground font-mono">{selectedCount}</strong> of{" "}
            <strong className="font-semibold text-foreground font-mono">{totalCount}</strong> row(s) selected
          </span>
        ) : (
          <span>
            Showing <strong className="font-semibold text-foreground font-mono">{startItem}</strong> to{" "}
            <strong className="font-semibold text-foreground font-mono">{endItem}</strong> of{" "}
            <strong className="font-semibold text-foreground font-mono">{totalCount}</strong> records
          </span>
        )}

        {/* Rows per page selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] hidden sm:inline text-muted-foreground">Rows per page:</span>
          <Select
            value={`${pageSize}`}
            onValueChange={(val: any) => {
              if (val) handlePageSizeChange(Number(val));
            }}
          >
            <SelectTrigger className="h-8 w-16 text-xs bg-background/50 font-mono">
              <SelectValue placeholder={`${pageSize}`} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={`${opt}`} className="font-mono text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right side: Navigation & Numbered Page buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <Button
          variant="outline"
          size="icon"
          className="size-8 text-muted-foreground hidden lg:flex"
          onClick={() => handlePageChange(1)}
          disabled={!canPreviousPage || isLoading}
          title="First Page"
        >
          <ChevronsLeft className="size-4" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={() => handlePageChange(currentDisplayPage - 1)}
          disabled={!canPreviousPage || isLoading}
          title="Previous Page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Numbered Page Buttons */}
        {showPageNumbers ? (
          <div className="flex items-center gap-1 px-1">
            {getPageNumbers().map((p, idx) =>
              typeof p === "number" ? (
                <Button
                  key={idx}
                  variant={currentDisplayPage === p ? "default" : "outline"}
                  size="sm"
                  className={`size-8 p-0 text-xs font-mono font-medium ${
                    currentDisplayPage === p
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => handlePageChange(p)}
                  disabled={isLoading}
                >
                  {p}
                </Button>
              ) : (
                <span key={idx} className="px-1 text-muted-foreground font-mono">
                  {p}
                </span>
              )
            )}
          </div>
        ) : (
          <div className="flex w-[100px] items-center justify-center text-xs font-medium text-muted-foreground font-mono">
            Page {currentDisplayPage} of {pageCount}
          </div>
        )}

        {/* Next Page */}
        <Button
          variant="outline"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={() => handlePageChange(currentDisplayPage + 1)}
          disabled={!canNextPage || isLoading}
          title="Next Page"
        >
          <ChevronRight className="size-4" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="icon"
          className="size-8 text-muted-foreground hidden lg:flex"
          onClick={() => handlePageChange(pageCount)}
          disabled={!canNextPage || isLoading}
          title="Last Page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
