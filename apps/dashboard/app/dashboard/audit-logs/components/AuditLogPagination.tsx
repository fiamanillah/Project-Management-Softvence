"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface AuditLogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  isLoading?: boolean;
}

export function AuditLogPagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
  isLoading,
}: AuditLogPaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalItems);

  // Generate pagination window
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-3 rounded-xl border border-border/80 text-xs shadow-2xs">
      {/* Range and limit selector */}
      <div className="flex items-center gap-4 text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        <span>
          Showing <strong className="font-semibold text-foreground font-mono">{startItem}</strong> to{" "}
          <strong className="font-semibold text-foreground font-mono">{endItem}</strong> of{" "}
          <strong className="font-semibold text-foreground font-mono">{totalItems}</strong> logs
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] hidden sm:inline">Rows per page:</span>
          <Select
            value={String(limit)}
            onValueChange={(val: any) => {
              if (val) onLimitChange(Number(val));
            }}
          >
            <SelectTrigger className="h-8 w-16 text-xs bg-background/50 font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <Button
          variant="outline"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1 || isLoading}
          title="First Page"
        >
          <ChevronsLeft className="size-4" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          title="Previous Page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Page Buttons */}
        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) =>
            typeof p === "number" ? (
              <Button
                key={idx}
                variant={currentPage === p ? "default" : "outline"}
                size="sm"
                className={`size-8 p-0 text-xs font-mono font-medium ${
                  currentPage === p ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                }`}
                onClick={() => onPageChange(p)}
                disabled={isLoading}
              >
                {p}
              </Button>
            ) : (
              <span key={idx} className="px-1 text-muted-foreground font-mono">
                {p}
              </span>
            ),
          )}
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          title="Next Page"
        >
          <ChevronRight className="size-4" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages || isLoading}
          title="Last Page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
