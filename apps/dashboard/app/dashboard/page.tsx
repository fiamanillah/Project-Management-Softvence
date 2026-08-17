"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { usePermissions, hasPermission } from "@/lib/permissions/PermissionContext";
import {
  DashboardMetricGrid,
  RecentAuditLogsWidget,
  SystemServicesWidget,
} from "./components/widget-registry";

export default function DashboardOverviewPage() {
  const permissions = usePermissions();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    usersCount: 0,
    departmentsCount: 0,
    teamsCount: 0,
    rolesCount: 0,
    designationsCount: 0,
    overridesCount: 0,
    auditLogsCount: 0,
  });
  const [recentLogs, setRecentLogs] = React.useState<any[]>([]);

  const fetchOverviewData = React.useCallback(async () => {
    setLoading(true);
    try {
      const canViewUsers = hasPermission(permissions, "auth.user.view");
      const canViewDepts = hasPermission(permissions, "organization.department.view");
      const canViewTeams = hasPermission(permissions, "organization.team.view");
      const canManageUsers = hasPermission(permissions, "auth.user.manage");

      const [usersRes, deptsRes, teamsRes, rolesRes, desigRes, overridesRes, logsRes] = await Promise.all([
        canViewUsers ? api.get("/users?limit=1").catch(() => null) : null,
        canViewDepts ? api.get("/organization/departments").catch(() => null) : null,
        canViewTeams ? api.get("/teams/stats").catch(() => null) : null,
        canViewUsers ? api.get("/organization/roles").catch(() => null) : null,
        canViewUsers ? api.get("/organization/designations").catch(() => null) : null,
        canManageUsers ? api.get("/users/overrides").catch(() => null) : null,
        canManageUsers ? api.get("/audit-logs?limit=5").catch(() => null) : null,
      ]);

      const usersTotal = usersRes?.meta?.total ?? (usersRes?.data?.length || 0);
      const deptsTotal = Array.isArray(deptsRes) ? deptsRes.length : 0;
      const teamsTotal = teamsRes?.totalTeams ?? 0;
      const rolesTotal = Array.isArray(rolesRes) ? rolesRes.length : 0;
      const desigTotal = Array.isArray(desigRes) ? desigRes.length : 0;
      const overridesTotal = Array.isArray(overridesRes) ? overridesRes.length : 0;
      const logsData = logsRes?.data || logsRes?.logs || (Array.isArray(logsRes) ? logsRes : []);
      const logsTotal = logsRes?.meta?.total ?? logsData.length;

      setStats({
        usersCount: usersTotal,
        departmentsCount: deptsTotal,
        teamsCount: teamsTotal,
        rolesCount: rolesTotal,
        designationsCount: desigTotal,
        overridesCount: overridesTotal,
        auditLogsCount: logsTotal,
      });

      setRecentLogs(logsData.slice(0, 5));
    } catch (err: any) {
      toast.error(err.message || "Failed to load system overview metrics");
    } finally {
      setLoading(false);
    }
  }, [permissions]);

  React.useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
          <p className="text-muted-foreground text-sm">
            Live overview of system users, organizational structures, permission matrix, and audit logs.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOverviewData}>
          <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Permission-Gated Metric Widgets */}
      <DashboardMetricGrid stats={stats} loading={loading} />

      {/* Activity Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <RecentAuditLogsWidget logs={recentLogs} loading={loading} />
        <SystemServicesWidget />
      </div>
    </div>
  );
}
