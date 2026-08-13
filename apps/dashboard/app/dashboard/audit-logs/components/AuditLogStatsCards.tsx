"use client";

import * as React from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ShieldCheck, ShieldAlert, Activity, FileSpreadsheet, Layers } from "lucide-react";

export interface AuditStatsData {
  totalLogs: number;
  logsLast24h: number;
  successCount?: number;
  failedCount?: number;
  moduleStats?: Array<{ _id: string; count: number }>;
  topActions?: Array<{ _id: string; count: number }>;
}

interface AuditLogStatsCardsProps {
  stats: AuditStatsData | null;
  isLoading?: boolean;
}

export function AuditLogStatsCards({ stats, isLoading }: AuditLogStatsCardsProps) {
  const total = stats?.totalLogs || 0;
  const last24h = stats?.logsLast24h || 0;
  const successes = stats?.successCount ?? 0;
  const failures = stats?.failedCount ?? 0;
  const successRatio = total > 0 ? Math.round((successes / total) * 100) : 100;
  const topModule = stats?.moduleStats?.[0]?._id || "Auth";

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[92px] rounded-xl border bg-card p-4 flex items-center justify-between shadow-2xs"
          >
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="size-10 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Audit Logs */}
      <Card className="shadow-xs border-border/80 bg-card hover:border-primary/30 transition-colors">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total Audit Logs</p>
            <p className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {total.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground">Permanent forensic records</p>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <FileSpreadsheet className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* 24 Hours Activity */}
      <Card className="shadow-xs border-border/80 bg-card hover:border-blue-500/30 transition-colors">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Last 24 Hours</p>
            <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
              {last24h.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground">Active security events today</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Activity className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* Success vs Failure Ratio */}
      <Card className="shadow-xs border-border/80 bg-card hover:border-emerald-500/30 transition-colors">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Success Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {successRatio}%
              </p>
              <span className="text-[11px] text-muted-foreground font-mono">
                ({failures} failed)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Security policy compliance</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {failures > 0 ? <ShieldAlert className="size-5 text-rose-500" /> : <ShieldCheck className="size-5" />}
          </div>
        </CardContent>
      </Card>

      {/* Most Active Module */}
      <Card className="shadow-xs border-border/80 bg-card hover:border-violet-500/30 transition-colors">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Primary Module</p>
            <p className="text-xl font-bold tracking-tight text-violet-600 dark:text-violet-400 font-mono truncate max-w-[130px]">
              {topModule}
            </p>
            <p className="text-[11px] text-muted-foreground">Highest event volume</p>
          </div>
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Layers className="size-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
