"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Users,
  Building2,
  UsersRound,
  ShieldCheck,
  Briefcase,
  KeyRound,
  FileSpreadsheet,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { usePermissions, hasPermission } from "@/lib/permissions/PermissionContext";

export interface MetricCardConfig {
  id: string;
  title: string;
  permission?: string;
  description: string;
  icon: LucideIcon;
  href: string;
  getValue: (stats: any) => number | string;
}

export const METRIC_WIDGETS: MetricCardConfig[] = [
  {
    id: "users",
    title: "Users Management",
    permission: "auth.user.view",
    description: "Active system users & accounts",
    icon: Users,
    href: "/dashboard/users",
    getValue: (stats) => stats.usersCount ?? 0,
  },
  {
    id: "departments",
    title: "Departments",
    permission: "organization.department.view",
    description: "Active departments & units",
    icon: Building2,
    href: "/dashboard/departments",
    getValue: (stats) => stats.departmentsCount ?? 0,
  },
  {
    id: "teams",
    title: "Teams",
    permission: "organization.team.view",
    description: "Active teams & operational rosters",
    icon: UsersRound,
    href: "/dashboard/teams",
    getValue: (stats) => stats.teamsCount ?? 0,
  },
  {
    id: "roles",
    title: "Roles & Security Matrix",
    permission: "auth.user.view",
    description: "Authorization roles & permission scopes",
    icon: ShieldCheck,
    href: "/dashboard/roles",
    getValue: (stats) => stats.rolesCount ?? 0,
  },
  {
    id: "designations",
    title: "Designations",
    permission: "auth.user.view",
    description: "Corporate job titles & employee tiers",
    icon: Briefcase,
    href: "/dashboard/designations",
    getValue: (stats) => stats.designationsCount ?? 0,
  },
  {
    id: "overrides",
    title: "Overrides & Delegations",
    permission: "auth.user.manage",
    description: "Explicit hand-grants & overrides",
    icon: KeyRound,
    href: "/dashboard/overrides",
    getValue: (stats) => stats.overridesCount ?? 0,
  },
  {
    id: "audit-logs",
    title: "Security Audit Logs",
    permission: "auth.user.manage",
    description: "Forensic log entries recorded",
    icon: FileSpreadsheet,
    href: "/dashboard/audit-logs",
    getValue: (stats) => stats.auditLogsCount ?? 0,
  },
];

export function DashboardMetricGrid({
  stats,
  loading,
}: {
  stats: Record<string, any>;
  loading: boolean;
}) {
  const permissions = usePermissions();

  const authorizedWidgets = METRIC_WIDGETS.filter(
    (widget) => !widget.permission || hasPermission(permissions, widget.permission),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {authorizedWidgets.map((widget) => {
        const Icon = widget.icon;
        const value = widget.getValue(stats);

        return (
          <Card key={widget.id} className="relative overflow-hidden group hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  value
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{widget.description}</p>
              <Link
                href={widget.href}
                className="inline-flex items-center text-xs font-medium text-primary hover:underline mt-3 group-hover:translate-x-0.5 transition-transform"
              >
                View Details <ArrowUpRight className="size-3 ml-1" />
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function RecentAuditLogsWidget({
  logs,
  loading,
}: {
  logs: any[];
  loading: boolean;
}) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-primary" /> Recent Security Audit Logs
        </CardTitle>
        <CardDescription className="text-xs">
          Chronological stream of authorization evaluation and administrative events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-muted-foreground border rounded-lg">
            No audit log entries recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any, idx: number) => (
              <div
                key={log.id || idx}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">
                    {log.action || log.event || "SYSTEM_EVENT"}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {log.userEmail || log.userId || "System"} • {log.ipAddress || "Internal"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {log.status || (log.allowed ? "ALLOWED" : "DENIED")}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SystemServicesWidget() {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" /> Authorization Subsystem
        </CardTitle>
        <CardDescription className="text-xs">
          Centralized Scoped Permission Engine status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20 text-xs">
          <span className="font-medium">Permission Cache Engine</span>
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            Redis L1/L2 Active
          </Badge>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20 text-xs">
          <span className="font-medium">Role & Scope Resolver</span>
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            Operational
          </Badge>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20 text-xs">
          <span className="font-medium">Audit Pipeline</span>
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            MongoDB Async Log
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
