"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Users, Lock, KeyRound, FileSpreadsheet, ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function DashboardOverviewPage() {
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    usersCount: 0,
    designationsCount: 0,
    overridesCount: 0,
    auditLogsCount: 0,
  });
  const [recentLogs, setRecentLogs] = React.useState<any[]>([]);

  const fetchOverviewData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, desigRes, overridesRes, logsRes] = await Promise.all([
        api.get("/users?limit=1"),
        api.get("/organization/designations"),
        api.get("/users/overrides"),
        api.get("/audit-logs?limit=5"),
      ]);

      const usersTotal = usersRes?.meta?.totalCount ?? (usersRes?.data?.length || 0);
      const desigTotal = Array.isArray(desigRes) ? desigRes.length : 0;
      const overridesTotal = Array.isArray(overridesRes) ? overridesRes.length : 0;
      const logsData = logsRes?.data || logsRes?.logs || [];
      const logsTotal = logsRes?.meta?.totalCount ?? logsData.length;

      setStats({
        usersCount: usersTotal,
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
  }, []);

  React.useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  const cards = [
    {
      title: "Users Management",
      value: stats.usersCount,
      description: "Active system users & roles",
      icon: Users,
      href: "/dashboard/users",
    },
    {
      title: "Designations & Matrix",
      value: stats.designationsCount,
      description: "Configured roles & permission sets",
      icon: Lock,
      href: "/dashboard/designations",
    },
    {
      title: "Overrides & Delegations",
      value: stats.overridesCount,
      description: "Explicit hand-grants & overrides",
      icon: KeyRound,
      href: "/dashboard/overrides",
    },
    {
      title: "Security Audit Logs",
      value: stats.auditLogsCount,
      description: "Forensic log entries recorded",
      icon: FileSpreadsheet,
      href: "/dashboard/audit-logs",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
          <p className="text-muted-foreground text-sm">
            Live overview of system users, permission matrix, active overrides, and audit logs.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOverviewData}>
          <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Activity Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
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
                <RefreshCw className="size-5 animate-spin" />
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent audit log events found.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id || log._id} className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs">
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
                  <p className="text-sm font-medium">User & Role Admin</p>
                  <p className="text-xs text-muted-foreground">/api/v1/admin/users & Designations</p>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">Operational</Badge>
            </div>

            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Overrides Engine</p>
                  <p className="text-xs text-muted-foreground">/api/v1/admin/overrides & Delegations</p>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">Operational</Badge>
            </div>

            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Audit Logger</p>
                  <p className="text-xs text-muted-foreground">/api/v1/audit-logs & RabbitMQ Broker</p>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">Operational</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
