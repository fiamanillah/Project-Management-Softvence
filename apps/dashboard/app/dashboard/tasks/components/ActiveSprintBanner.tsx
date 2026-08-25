"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import {
  Zap,
  Calendar,
  CheckCircle2,
  Target,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { useTaskStore } from "../data/task-store";

export function ActiveSprintBanner() {
  const {
    activeSprint,
    tasks,
    viewMode,
    setActiveSprintForCompletion,
    setCompleteSprintModalOpen,
  } = useTaskStore();

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Only render on Board and Backlog views when there's an active sprint
  if (!activeSprint || (viewMode !== "BOARD" && viewMode !== "BACKLOG")) {
    return null;
  }

  // Calculate story point progress and task metrics for this active sprint
  const sprintTasks = tasks.filter((t) => t.sprintId === activeSprint.id);
  const totalTasks = sprintTasks.length;
  const completedTasks = sprintTasks.filter((t) => t.status === "DONE" || t.status === "RESOLVED").length;
  
  const totalSP = sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
  const completedSP = sprintTasks
    .filter((t) => t.status === "DONE" || t.status === "RESOLVED")
    .reduce((acc, t) => acc + (t.storyPoints || 0), 0);

  const spPercentage = totalSP > 0 ? Math.round((completedSP / totalSP) * 100) : 0;
  const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate remaining days
  const today = new Date();
  const endDate = new Date(activeSprint.endDate);
  const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const remainingLabel = diffDays > 0 ? `${diffDays} days remaining` : diffDays === 0 ? "Ends today" : "Overdue";

  return (
    <div className="border-b border-border/50 bg-gradient-to-r from-emerald-500/5 via-primary/5 to-background px-6 py-2.5 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Sprint Identity & Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
            <Zap className="h-4 w-4" />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground truncate">
                {activeSprint.name}
              </span>
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 py-0"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Sprint
              </Badge>
            </div>

            {activeSprint.goal && (
              <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-md">
                <Target className="h-3 w-3 text-primary/70 shrink-0" />
                <span className="truncate italic">"{activeSprint.goal}"</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Metrics & Actions */}
        <div className="flex items-center gap-4 text-xs ml-auto">
          {/* Date & Remaining */}
          <div className="hidden lg:flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
            <span className="text-[11px]">
              {activeSprint.startDate} – {activeSprint.endDate}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              {remainingLabel}
            </span>
          </div>

          {/* Story Points & Task Progress */}
          <div className="flex items-center gap-3 border-l border-border/60 pl-3">
            <div className="flex flex-col gap-1 w-28 sm:w-36">
              <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                <span>{completedSP} of {totalSP} SP</span>
                <span className="text-foreground">{spPercentage}%</span>
              </div>
              <Progress value={spPercentage} className="h-1.5 bg-muted" />
            </div>

            <div className="hidden sm:flex flex-col text-right text-[10px] text-muted-foreground">
              <span><strong>{completedTasks}</strong>/{totalTasks} tasks</span>
              <span className="text-[9px] text-muted-foreground/80">({taskPercentage}%)</span>
            </div>
          </div>

          {/* Complete Sprint CTA */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium px-2.5"
            onClick={() => {
              setActiveSprintForCompletion(activeSprint);
              setCompleteSprintModalOpen(true);
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Complete Sprint</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
