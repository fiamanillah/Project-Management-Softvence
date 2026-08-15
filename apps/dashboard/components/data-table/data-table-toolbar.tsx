"use client";

import * as React from "react";
import type { ReactTable, Table, RowData } from "@tanstack/react-table";
import { Search, X, RotateCcw, ChevronDown, ChevronUp, Sliders } from "lucide-react";

import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { DataTableFeatures } from "./data-table-features";
import { DataTableViewOptions } from "./data-table-view-options";

export interface DataTableToolbarProps<TData extends RowData = any>
  extends React.HTMLAttributes<HTMLDivElement> {
  table?: Table<DataTableFeatures, TData> | ReactTable<DataTableFeatures, TData>;
  searchKey?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  isFiltered?: boolean;
  onReset?: () => void;
  filters?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  showViewOptions?: boolean;
  expandableContent?: React.ReactNode;
  defaultExpanded?: boolean;
}

export function DataTableToolbar<TData extends RowData = any>({
  table,
  searchKey,
  searchValue: controlledSearchValue,
  onSearchChange: controlledOnSearchChange,
  searchPlaceholder = "Search records...",
  showSearch = true,
  isFiltered: controlledIsFiltered,
  onReset,
  filters,
  children,
  actions,
  showViewOptions = true,
  expandableContent,
  defaultExpanded = false,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  // Determine if column-based search is active
  const column = table && searchKey ? table.getColumn(searchKey) : null;
  const columnSearchValue = (column?.getFilterValue() as string) ?? "";

  const isControlled = typeof controlledSearchValue !== "undefined";
  const searchValue = isControlled ? controlledSearchValue : columnSearchValue;

  const handleSearchChange = (val: string) => {
    if (controlledOnSearchChange) {
      controlledOnSearchChange(val);
    } else if (column) {
      column.setFilterValue(val);
    }
  };

  const handleClearSearch = () => {
    handleSearchChange("");
  };

  // Determine if any filters are active
  const hasColumnFilters = Boolean(
    table && (table as any).state?.columnFilters?.length > 0
  );
  const hasSearch = Boolean(searchValue && searchValue.trim() !== "");
  const isFiltered =
    typeof controlledIsFiltered === "boolean"
      ? controlledIsFiltered
      : hasSearch || hasColumnFilters;

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      if (column) column.setFilterValue("");
      if (table && table.resetColumnFilters) table.resetColumnFilters();
      if (controlledOnSearchChange) controlledOnSearchChange("");
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-2xs transition-all",
        className
      )}
      {...props}
    >
      {/* Primary Toolbar Row */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Left side: Search & Inline Filter Controls */}
        <div className="flex flex-1 flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
          {showSearch && (
            <div className="relative flex-1 min-w-[200px] max-w-full sm:max-w-xs md:max-w-sm">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-background/50 focus:bg-background"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer transition-colors"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Filters Slot */}
          {filters && (
            <div className="flex flex-wrap items-center gap-2">
              {filters}
            </div>
          )}

          {/* Children Slot (Custom Pills, Badges, Status selectors) */}
          {children && (
            <div className="flex flex-wrap items-center gap-2">
              {children}
            </div>
          )}

          {/* Expand Toggle Button for extra filters */}
          {expandableContent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-9 px-2.5 text-xs gap-1.5"
            >
              <Sliders className="size-3.5" />
              <span>More Filters</span>
              {isExpanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </Button>
          )}

          {/* Reset button */}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>

        {/* Right side: Action buttons & Column visibility menu */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0 flex-wrap">
          {actions}
          {showViewOptions && table && (
            <DataTableViewOptions table={table as Table<DataTableFeatures, TData>} />
          )}
        </div>
      </div>

      {/* Expandable Secondary Filter Area */}
      {expandableContent && isExpanded && (
        <div className="pt-3 border-t border-border/60 animate-in fade-in-0 duration-150">
          {expandableContent}
        </div>
      )}
    </div>
  );
}
