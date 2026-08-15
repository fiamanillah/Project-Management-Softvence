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
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Eye,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Globe,
  Database,
} from "lucide-react";
import {
  features,
  type DataTableFeatures,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";
import { AuditLogFilters, type AuditLogFiltersProps } from "./AuditLogFilters";
import type { AuditLogPaginationProps } from "./AuditLogPagination";

export interface AuditLogItem {
  _id: string;
  auditId?: string;
  module: string;
  action: string;
  entityTable?: string;
  entityId?: string;
  actor?: {
    id?: string;
    email?: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  ipAddress?: string;
  userAgent?: string;
  httpContext?: {
    method?: string;
    path?: string;
    statusCode?: number;
    durationMs?: number;
    requestId?: string;
    query?: Record<string, any>;
    params?: Record<string, any>;
    requestBody?: Record<string, any>;
  };
  changes?: {
    before?: any;
    after?: any;
    diff?: any;
  };
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
  metadata?: any;
  createdAt: string;
}

interface AuditLogTableProps {
  logs: AuditLogItem[];
  onViewDetails: (log: AuditLogItem) => void;
  isLoading?: boolean;
  filterProps?: Omit<AuditLogFiltersProps, "table">;
  paginationProps?: Omit<AuditLogPaginationProps, "isLoading">;
}

const columnHelper = createColumnHelper<DataTableFeatures, AuditLogItem>();

export function AuditLogTable({
  logs,
  onViewDetails,
  isLoading,
  filterProps,
  paginationProps,
}: AuditLogTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});

  const getModuleBadge = (module: string) => {
    switch (module?.toUpperCase()) {
      case "AUTH":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "AUTHORIZATION":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "ORGANIZATION":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      case "USERS":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "PERMISSIONS":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "SYSTEM":
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getMethodBadge = (method?: string) => {
    switch (method?.toUpperCase()) {
      case "GET":
        return "bg-blue-500/15 text-blue-600 border-blue-500/30";
      case "POST":
        return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
      case "PUT":
      case "PATCH":
        return "bg-amber-500/15 text-amber-600 border-amber-500/30";
      case "DELETE":
        return "bg-rose-500/15 text-rose-600 border-rose-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getInitials = (email?: string) => {
    if (!email) return "SYS";
    return email.substring(0, 2).toUpperCase();
  };

  const columns = React.useMemo(() => {
    return columnHelper.columns([
      columnHelper.accessor("createdAt", {
        id: "timestamp",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Timestamp" />
        ),
        cell: ({ row }) => {
          const createdAt = row.original.createdAt;
          return (
            <div className="flex flex-col text-xs text-muted-foreground whitespace-nowrap">
              <span className="font-mono font-medium text-foreground text-[11px]">
                {new Date(createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <Clock className="size-3 text-muted-foreground/70" />
                {new Date(createdAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          );
        },
      }),

      columnHelper.accessor("action", {
        id: "action",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Module / Action" />
        ),
        cell: ({ row }) => {
          const log = row.original;
          return (
            <div className="flex flex-col items-start gap-1">
              <span className="font-mono font-bold text-xs text-foreground tracking-tight">
                {log.action}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-1.5 font-medium ${getModuleBadge(log.module)}`}
              >
                {log.module}
              </Badge>
            </div>
          );
        },
      }),

      columnHelper.accessor(
        (row) => row.actor?.email || "System",
        {
          id: "actor",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Actor" />
          ),
          cell: ({ row }) => {
            const log = row.original;
            const actorEmail = log.actor?.email || "System";
            return (
              <div className="flex items-center gap-2">
                <Avatar className="size-7 border border-border">
                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                    {getInitials(actorEmail)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col max-w-[150px] sm:max-w-[200px]">
                  <span
                    className="text-xs font-semibold text-foreground truncate"
                    title={actorEmail}
                  >
                    {actorEmail}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {log.actor?.role || "Staff"}
                  </span>
                </div>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) => `${row.entityTable || ""} ${row.entityId || ""}`,
        {
          id: "entity",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Target Entity" />
          ),
          cell: ({ row }) => {
            const log = row.original;
            return log.entityTable ? (
              <div className="flex flex-col text-xs font-mono gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground text-[11px]">
                    {log.entityTable}
                  </span>
                  {log.changes?.diff && Object.keys(log.changes.diff).length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary"
                    >
                      +{Object.keys(log.changes.diff).length} diff
                    </Badge>
                  )}
                </div>
                <span
                  className="text-[10px] text-muted-foreground truncate max-w-[120px]"
                  title={log.entityId}
                >
                  {log.entityId}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            );
          },
        }
      ),

      columnHelper.accessor(
        (row) => row.actor?.ipAddress || row.ipAddress || "127.0.0.1",
        {
          id: "context",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Context / IP" />
          ),
          cell: ({ row }) => {
            const log = row.original;
            const ip = log.actor?.ipAddress || log.ipAddress || "127.0.0.1";
            return (
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-1.5">
                  {log.httpContext?.method && (
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono px-1 py-0 ${getMethodBadge(log.httpContext.method)}`}>
                      {log.httpContext.method}
                    </Badge>
                  )}
                  <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                    <Globe className="size-3 text-muted-foreground/70" /> {ip}
                  </span>
                </div>
              </div>
            );
          },
        }
      ),

      columnHelper.accessor("status", {
        id: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const status = row.original.status;
          return status === "SUCCESS" ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] font-semibold py-0.5">
              <CheckCircle2 className="size-3" /> SUCCESS
            </Badge>
          ) : (
            <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 text-[10px] font-semibold py-0.5">
              <ShieldAlert className="size-3" /> FAILED
            </Badge>
          );
        },
      }),

      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const log = row.original;
          return (
            <div className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(log)}
                className="h-8 px-2 text-xs font-medium hover:bg-primary/10 hover:text-primary"
              >
                <Eye className="size-3.5 mr-1" /> Details
              </Button>
            </div>
          );
        },
      }),
    ]);
  }, [onViewDetails]);

  // Configure server-aware pagination state
  const paginationState = React.useMemo(() => {
    const page = paginationProps ? paginationProps.currentPage - 1 : 0;
    const size = paginationProps ? paginationProps.limit : (logs.length || 20);
    return {
      pageIndex: Math.max(0, page),
      pageSize: Math.max(1, size),
    };
  }, [paginationProps?.currentPage, paginationProps?.limit, logs.length]);

  const table = useTable({
    features,
    data: logs,
    columns,
    getRowId: (row) => row._id,
    rowCount: paginationProps?.totalItems ?? logs.length,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: paginationState,
    },
  });

  return (
    <div className="space-y-3">
      {/* Unified Search, Filter & Column Selection Toolbar */}
      {filterProps ? (
        <AuditLogFilters
          table={table}
          search={filterProps.search}
          onSearchChange={filterProps.onSearchChange}
          moduleFilter={filterProps.moduleFilter}
          onModuleChange={filterProps.onModuleChange}
          statusFilter={filterProps.statusFilter}
          onStatusChange={filterProps.onStatusChange}
          dateRange={filterProps.dateRange}
          onDateRangeChange={filterProps.onDateRangeChange}
          onRefresh={filterProps.onRefresh}
          onReset={filterProps.onReset}
          isLoading={filterProps.isLoading}
        />
      ) : (
        <DataTableToolbar table={table} />
      )}

      {/* TanStack Table Container */}
      <div className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
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
            {isLoading ? (
              Array.from({ length: Math.min(10, paginationProps?.limit || 10) }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-24 rounded-md" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-7 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-7 w-20 ml-auto rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground text-sm"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                    <Database className="size-8 text-muted-foreground/60" />
                    <p className="font-medium text-foreground">
                      No security audit logs found
                    </p>
                    <p className="text-xs">
                      Try adjusting your search terms or filter parameters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {paginationProps && (
        <DataTablePagination
          table={table}
          currentPage={paginationProps.currentPage}
          totalPages={paginationProps.totalPages}
          totalItems={paginationProps.totalItems}
          limit={paginationProps.limit}
          onPageChange={paginationProps.onPageChange}
          onLimitChange={paginationProps.onLimitChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
