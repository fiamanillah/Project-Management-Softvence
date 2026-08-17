"use client";

import * as React from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Briefcase,
  PlayCircle,
  Clock,
  CheckCircle2,
  DollarSign,
  Lock,
} from "lucide-react";
import type { ProjectStats } from "@workspace/shared";

interface ProjectStatsCardsProps {
  stats: ProjectStats;
  isLoading?: boolean;
}

export function ProjectStatsCards({ stats, isLoading }: ProjectStatsCardsProps) {
  const cards = [
    {
      title: "Total Projects",
      value: stats.totalProjects,
      subtitle: `${stats.activeProjects} actively underway`,
      icon: Briefcase,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "In Progress",
      value: stats.inProgressProjects,
      subtitle: "Active execution phase",
      icon: PlayCircle,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "In Review",
      value: stats.inReviewProjects,
      subtitle: "Quality & QA verification",
      icon: Clock,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Delivered",
      value: stats.deliveredProjects,
      subtitle: "Completed & archived",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Pipeline Value",
      value:
        stats.totalPipelineValue !== null
          ? `$${stats.totalPipelineValue.toLocaleString()}`
          : "Restricted",
      isConfidential: stats.totalPipelineValue === null,
      subtitle:
        stats.totalPipelineValue !== null
          ? "Active contract value"
          : "Requires financial permission",
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-600/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card
            key={idx}
            className="border bg-card/60 backdrop-blur-sm shadow-xs transition-all hover:shadow-md hover:border-primary/20"
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </p>
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                  ) : card.isConfidential ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs gap-1 font-mono font-medium"
                    >
                      <Lock className="size-3" />
                      Confidential
                    </Badge>
                  ) : (
                    <h3 className="text-xl font-bold tracking-tight text-foreground">
                      {card.value}
                    </h3>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground font-normal">
                  {card.subtitle}
                </p>
              </div>
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${card.bgColor} ${card.color} shrink-0`}
              >
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
