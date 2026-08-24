"use client";

import * as React from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Monitor,
  Radio,
  Users,
  Briefcase,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import type { StationStats } from "@workspace/shared";

interface StationStatsCardsProps {
  stats: StationStats;
  isLoading?: boolean;
}

export function StationStatsCards({ stats, isLoading }: StationStatsCardsProps) {
  const cards = [
    {
      title: "Total Workstations",
      value: stats.totalStations,
      subtext: `${stats.salesStations} Dedicated Sales Desks`,
      icon: Monitor,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Active Stations",
      value: stats.activeStations,
      subtext: "Currently operational & online",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "Active Shift Operators",
      value: stats.activeUsersCount,
      subtext: "Logged into live sessions",
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
    {
      title: "Hosted Platform Profiles",
      value: stats.activeProfilesCount,
      subtext: "Allocated across all stations",
      icon: Briefcase,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card
            key={i}
            className={`border shadow-sm transition-all hover:shadow-md ${c.borderColor}`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {c.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">
                    {isLoading ? "—" : c.value}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="size-3 text-muted-foreground" />
                  {c.subtext}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${c.bgColor} ${c.color} shrink-0`}>
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
