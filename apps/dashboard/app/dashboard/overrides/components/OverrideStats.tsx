"use client";

import * as React from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { ShieldCheck, ShieldAlert, UserCheck, Clock } from "lucide-react";
import type { OverrideItem, DelegationItem } from "../types";
import { getDelegationStatus } from "./DelegationStatusBadge";

interface OverrideStatsProps {
  overrides: OverrideItem[];
  delegations: DelegationItem[];
}

export function OverrideStats({ overrides, delegations }: OverrideStatsProps) {
  const handGrantsCount = overrides.filter((o) => !o.isDeny).length;
  const explicitDeniesCount = overrides.filter((o) => o.isDeny).length;
  
  const activeDelegationsCount = delegations.filter(
    (d) => getDelegationStatus(d.validFrom, d.validUntil) === "ACTIVE"
  ).length;

  const upcomingDelegationsCount = delegations.filter(
    (d) => getDelegationStatus(d.validFrom, d.validUntil) === "UPCOMING"
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Hand Grants Card */}
      <Card className="shadow-xs border bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Hand-Grants</p>
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {handGrantsCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Elevated access bypasses</p>
          </div>
          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* Explicit Denies Card */}
      <Card className="shadow-xs border bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Explicit Denies</p>
            <p className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {explicitDeniesCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Hard-blocked privileges</p>
          </div>
          <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ShieldAlert className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* Active Delegations Card */}
      <Card className="shadow-xs border bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Active Delegations</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {activeDelegationsCount}
              </p>
              {activeDelegationsCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Live "on-behalf-of" windows</p>
          </div>
          <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <UserCheck className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* Upcoming / Total Windows */}
      <Card className="shadow-xs border bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Scheduled Windows</p>
            <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {upcomingDelegationsCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Future planned covers</p>
          </div>
          <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="size-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
