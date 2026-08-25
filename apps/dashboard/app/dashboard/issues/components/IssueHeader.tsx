"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Bug,
  Plus,
  RotateCcw,
  ShieldAlert,
  LifeBuoy,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ListOrdered,
  Layers,
} from "lucide-react";
import { useIssueStore } from "../data/issue-store";

export function IssueHeader() {
  const pathname = usePathname();
  const {
    totalOpenCount,
    blockersCount,
    criticalCount,
    resolvedTodayCount,
    setCreateModalOpen,
    resetToMockData,
  } = useIssueStore();

  const navRoutes = [
    {
      url: "/dashboard/issues",
      label: "All Issues & Defects",
      icon: Bug,
      badge: totalOpenCount > 0 ? String(totalOpenCount) : undefined,
      badgeVariant: "rose" as const,
      exact: true,
    },
    {
      url: "/dashboard/issues/tickets",
      label: "Support Tickets",
      icon: LifeBuoy,
    },
  ];

  return (
    <div className="flex flex-col border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top Bar: Title & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Issue Tracker & Defect Center
              </h1>
              {blockersCount > 0 && (
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] animate-pulse">
                  {blockersCount} P0 Blocker{blockersCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Triage defects, track project blockers, monitor SLA deadlines, and convert to agile tasks.
            </p>
          </div>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToMockData}
            className="h-9 gap-1.5 border-border/80 text-xs text-muted-foreground hover:text-foreground"
            title="Reset to default mock issues"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Demo</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-9 gap-1.5 shadow-sm bg-rose-600 hover:bg-rose-700 text-white font-semibold px-3.5 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Report Issue</span>
          </Button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 border-t border-border/40 bg-muted/20">
        <div className="flex items-center gap-3 rounded-xl bg-card p-2.5 border border-border/60 shadow-2xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <Flame className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              P0 Blockers
            </span>
            <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
              {blockersCount} active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-card p-2.5 border border-border/60 shadow-2xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              P1 Critical
            </span>
            <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
              {criticalCount} active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-card p-2.5 border border-border/60 shadow-2xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ListOrdered className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Total Open
            </span>
            <span className="text-sm font-extrabold text-foreground">
              {totalOpenCount} issues
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-card p-2.5 border border-border/60 shadow-2xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Resolved
            </span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              {resolvedTodayCount} closed
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Route Navigation Tabs */}
      <div className="flex items-center justify-between overflow-x-auto px-6 py-2 border-t border-border/40 bg-muted/10 no-scrollbar">
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 border border-border/50">
          {navRoutes.map((route) => {
            const Icon = route.icon;
            const isActive = route.exact
              ? pathname === route.url
              : pathname === route.url || pathname.startsWith(route.url + "/");

            return (
              <Link
                key={route.url}
                href={route.url}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-background text-foreground shadow-sm shadow-black/5 font-semibold"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-rose-500" : ""}`} />
                <span>{route.label}</span>
                {route.badge && (
                  <span className="rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.2 text-[10px] font-bold">
                    {route.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
