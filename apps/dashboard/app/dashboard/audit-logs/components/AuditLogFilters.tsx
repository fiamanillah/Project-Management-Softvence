"use client";

import * as React from "react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Search, X, RefreshCw, RotateCcw, Calendar, Filter } from "lucide-react";

interface AuditLogFiltersProps {
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
    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-card p-3.5 rounded-xl border border-border/80 shadow-2xs">
      {/* Search Box */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search action, actor email, IP address, entity ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-background/50 focus:bg-background"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
            title="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Select Filters Group */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Module Filter */}
        <Select value={moduleFilter} onValueChange={(val: any) => { if (val) onModuleChange(val); }}>
          <SelectTrigger className="w-[140px] sm:w-[150px] h-9 text-xs bg-background/50">
            <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            <SelectItem value="Auth">Auth</SelectItem>
            <SelectItem value="Authorization">Authorization</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Projects">Projects</SelectItem>
            <SelectItem value="BdOrders">BdOrders</SelectItem>
            <SelectItem value="Billing">Billing</SelectItem>
            <SelectItem value="System">System</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(val: any) => { if (val) onStatusChange(val); }}>
          <SelectTrigger className="w-[130px] sm:w-[140px] h-9 text-xs bg-background/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="SUCCESS">SUCCESS</SelectItem>
            <SelectItem value="FAILED">FAILED / DENIED</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Select value={dateRange} onValueChange={(val: any) => { if (val) onDateRangeChange(val); }}>
          <SelectTrigger className="w-[130px] sm:w-[140px] h-9 text-xs bg-background/50">
            <Calendar className="size-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset Filters */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5 mr-1" /> Reset
          </Button>
        )}

        {/* Refresh */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 px-3 text-xs ml-auto sm:ml-0"
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
    </div>
  );
}
