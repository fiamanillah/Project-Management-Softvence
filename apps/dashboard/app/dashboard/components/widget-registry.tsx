"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Users,
  Building2,
  Lock,
  KeyRound,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
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
    description: "Active system users & roles",
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
    id: "designations",
    title: "Designations & Matrix",
    permission: "organization.designation.view",
    description: "Configured roles & permission sets",
    icon: Lock,
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

  if (authorizedWidgets.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {authorizedWidgets.map((widget) => {
        const Icon = widget.icon;
        return (
          <Link key={widget.id} href={widget.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : widget.getValue(stats)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{widget.description}</p>
              </CardContent>
            </Card>
          </Link>
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
  const permissions = usePermissions();

  if (!hasPermission(permissions, "auth.user.manage")) {
    return null;
  }

  return (
    <Card className="lg:col-span-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Security Audit Events</CardTitle>
          <CardDescription>Live forensic log stream from MongoDB audit store</CardDescription>
        </div>
        <Link href="/dashboard/audit-logs">
          <Button variant="ghost" size="sm">
            View all <ArrowUpRight className="ml-1 size-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="py-8 flex justify-center text-muted-foreground">
            <span className="text-xs">Loading audit events...</span>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No recent audit log events found.
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id || log._id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs"
            >
              <div className="space-y-1">
                <p className="font-semibold">{log.action}</p>
                <p className="text-muted-foreground">
                  Module: {log.module} &bull; Actor: {log.actor?.email || log.actorId || "System"}
                </p>
              </div>
              <Badge variant={log.status === "SUCCESS" ? "default" : "destructive"}>
                {log.status}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function SystemServicesWidget() {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Active Microservices & Endpoints</CardTitle>
        <CardDescription>Status of API integrated modules</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">Auth & Identity</p>
              <p className="text-xs text-muted-foreground">/api/v1/auth &bull; JWT & Refresh Token</p>
            </div>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-300">Operational</Badge>
        </div>

        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">Organization & Structure</p>
              <p className="text-xs text-muted-foreground">/api/v1/organization &bull; Departments & Matrix</p>
            </div>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-300">Operational</Badge>
        </div>

        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">User Administration</p>
              <p className="text-xs text-muted-foreground">/api/v1/users &bull; Accounts & Overrides</p>
            </div>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-300">Operational</Badge>
        </div>

        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">Audit Logger</p>
              <p className="text-xs text-muted-foreground">/api/v1/audit-logs &bull; Forensic pipeline</p>
            </div>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-300">Operational</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
