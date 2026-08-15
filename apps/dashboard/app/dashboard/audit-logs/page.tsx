"use client";

import * as React from "react";
import { Shield } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { AuditLogTable, type AuditLogItem } from "./components/AuditLogTable";
import { AuditLogDetailModal } from "./components/AuditLogDetailModal";
import { AuditLogStatsCards, type AuditStatsData } from "./components/AuditLogStatsCards";
import { AuditLogFilters } from "./components/AuditLogFilters";
import { AuditLogPagination } from "./components/AuditLogPagination";

export default function AuditLogsPage() {
  return (
    <RouteGuard code="auth.user.manage">
      <AuditLogsContent />
    </RouteGuard>
  );
}

function AuditLogsContent() {
  const [logs, setLogs] = React.useState<AuditLogItem[]>([]);
  const [stats, setStats] = React.useState<AuditStatsData | null>(null);

  // Filters State
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [dateRange, setDateRange] = React.useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);

  // Loading States
  const [isLoading, setIsLoading] = React.useState(true);
  const [isStatsLoading, setIsStatsLoading] = React.useState(true);

  // Detail Modal State
  const [selectedLog, setSelectedLog] = React.useState<AuditLogItem | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  // Debounce search input by 300ms
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, moduleFilter, statusFilter, dateRange]);

  // Fetch Statistics Overview
  const fetchStats = React.useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const res = await api.get(`/audit-logs/stats?_t=${Date.now()}`);
      setStats(res);
    } catch {
      // Non-critical if stats fail
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch Audit Logs with Filters & Pagination
  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(currentPage));
      queryParams.set("limit", String(limit));
      queryParams.set("_t", String(Date.now()));

      if (debouncedSearch.trim()) queryParams.set("search", debouncedSearch.trim());
      if (moduleFilter !== "all") queryParams.set("module", moduleFilter);
      if (statusFilter !== "all") queryParams.set("status", statusFilter);

      if (dateRange === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        queryParams.set("startDate", today.toISOString());
      } else if (dateRange === "7days") {
        queryParams.set("startDate", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      } else if (dateRange === "30days") {
        queryParams.set("startDate", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      }

      const res = await api.get(`/audit-logs?${queryParams.toString()}`);
      const logData = Array.isArray(res) ? res : res?.data || [];
      const meta = (res as any)?.meta || {};

      setLogs(logData);
      setTotalItems(meta.total ?? logData.length);
      setTotalPages(meta.totalPages ?? Math.max(1, Math.ceil((meta.total || logData.length) / limit)));
    } catch (err: any) {
      toast.error(err?.message || "Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, debouncedSearch, moduleFilter, statusFilter, dateRange]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefreshAll = () => {
    fetchLogs();
    fetchStats();
    toast.success("Security audit logs refreshed");
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setModuleFilter("all");
    setStatusFilter("all");
    setDateRange("all");
    setCurrentPage(1);
  };

  const handleViewDetails = (log: AuditLogItem) => {
    setSelectedLog(log);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="size-6 text-primary" /> Security Audit Logs
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Explore forensic security records, permission denials, state changes, and system events.
          </p>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <AuditLogStatsCards stats={stats} isLoading={isStatsLoading} />

      {/* Audit Log Table with Unified Search, Filters & Column Selection */}
      <AuditLogTable
        logs={logs}
        onViewDetails={handleViewDetails}
        isLoading={isLoading}
        filterProps={{
          search,
          onSearchChange: setSearch,
          moduleFilter,
          onModuleChange: setModuleFilter,
          statusFilter,
          onStatusChange: setStatusFilter,
          dateRange,
          onDateRangeChange: setDateRange,
          onRefresh: handleRefreshAll,
          onReset: handleResetFilters,
          isLoading,
        }}
      />

      {/* Server Pagination Bar */}
      <AuditLogPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        limit={limit}
        onPageChange={setCurrentPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setCurrentPage(1);
        }}
        isLoading={isLoading}
      />

      {/* Forensic Detail Modal */}
      <AuditLogDetailModal
        log={selectedLog}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
