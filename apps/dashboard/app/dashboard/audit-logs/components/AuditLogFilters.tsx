"use client";

import * as React from "react";
import type { Table } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Filter, Calendar, RefreshCw } from "lucide-react";
import {
  DataTableToolbar,
  type DataTableFeatures,
} from "@/components/data-table";
import type { AuditLogItem } from "./AuditLogTable";

export interface AuditLogFiltersProps {
  table?: Table<DataTableFeatures, AuditLogItem>;
  search: string;
  onSearchChange: (value: string) => void;
  moduleFilter: string;
  onModuleChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  onRefresh: () => void;
  onReset: () => void;
  isLoading?: boolean;
}

export function AuditLogFilters({
  table,
  search,
  onSearchChange,
  moduleFilter,
  onModuleChange,
  statusFilter,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  onRefresh,
  onReset,
  isLoading,
}: AuditLogFiltersProps) {
  const isFiltered =
    search.trim() !== "" ||
    moduleFilter !== "all" ||
    statusFilter !== "all" ||
    dateRange !== "all";

  return (
    <DataTableToolbar
      table={table}
      searchValue={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search action, actor email, IP address, entity ID..."
      isFiltered={isFiltered}
      onReset={onReset}
      showViewOptions={Boolean(table)}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 px-3 text-xs"
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      }
    >
      {/* Module Filter */}
      <Select
        value={moduleFilter}
        onValueChange={(val: any) => {
          if (val) onModuleChange(val);
        }}
      >
        <SelectTrigger className="w-[140px] sm:w-[150px] h-9 text-xs bg-background/50">
          <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Module">
            {moduleFilter === "all" ? "All Modules" : moduleFilter}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Modules</SelectItem>
          <SelectItem value="ORGANIZATION">Organization</SelectItem>
          <SelectItem value="USERS">Users</SelectItem>
          <SelectItem value="AUTH">Auth</SelectItem>
          <SelectItem value="PERMISSIONS">Permissions</SelectItem>
          <SelectItem value="Authorization">Authorization</SelectItem>
          <SelectItem value="SYSTEM">System</SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={statusFilter}
        onValueChange={(val: any) => {
          if (val) onStatusChange(val);
        }}
      >
        <SelectTrigger className="w-[130px] sm:w-[140px] h-9 text-xs bg-background/50">
          <SelectValue placeholder="Status">
            {statusFilter === "all"
              ? "All Statuses"
              : statusFilter === "SUCCESS"
                ? "SUCCESS"
                : "FAILED / DENIED"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="SUCCESS">SUCCESS</SelectItem>
          <SelectItem value="FAILED">FAILED / DENIED</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Select
        value={dateRange}
        onValueChange={(val: any) => {
          if (val) onDateRangeChange(val);
        }}
      >
        <SelectTrigger className="w-[130px] sm:w-[140px] h-9 text-xs bg-background/50">
          <Calendar className="size-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Timeframe">
            {dateRange === "all"
              ? "All Time"
              : dateRange === "today"
                ? "Today"
                : dateRange === "7days"
                  ? "Last 7 Days"
                  : "Last 30 Days"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7days">Last 7 Days</SelectItem>
          <SelectItem value="30days">Last 30 Days</SelectItem>
        </SelectContent>
      </Select>
    </DataTableToolbar>
  );
}
