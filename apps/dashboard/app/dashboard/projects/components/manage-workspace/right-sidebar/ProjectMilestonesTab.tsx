"use client";

import * as React from "react";
import { CheckCircle2, Circle, Calendar, CheckSquare, Sparkles } from "lucide-react";
import { Progress } from "@workspace/ui/components/progress";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import type { ProjectMilestoneItem } from "../types";

interface ProjectMilestonesTabProps {
  milestones: ProjectMilestoneItem[];
}

export function ProjectMilestonesTab({ milestones: initialMilestones }: ProjectMilestonesTabProps) {
  const [milestones, setMilestones] = React.useState(initialMilestones);

  const toggleMilestone = (id: string) => {
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextState = !m.isCompleted;
          toast.success(nextState ? `Marked "${m.title}" complete!` : `Reopened "${m.title}"`);
          return { ...m, isCompleted: nextState };
        }
        return m;
      })
    );
  };

  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 mb-2">
          <CheckSquare className="size-6 text-muted-foreground/60" />
        </div>
        <p className="text-xs font-semibold text-foreground">No milestones defined</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
          Project sprint deliverables and milestones will appear here.
        </p>
      </div>
    );
  }

  const completedCount = milestones.filter((m) => m.isCompleted).length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);

  return (
    <div className="p-3 space-y-3">
      {/* Progress banner card */}
      <div className="rounded-xl border border-border/60 bg-card/70 p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
            <Sparkles className="size-3 text-primary" /> Deliverables Progress
          </span>
          <span className="font-bold text-primary font-mono text-[11px]">
            {completedCount} / {milestones.length} ({progressPercent}%)
          </span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      <div className="space-y-1.5">
        {milestones.map((ms) => (
          <button
            key={ms.id}
            type="button"
            onClick={() => toggleMilestone(ms.id)}
            className={cn(
              "flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer group",
              ms.isCompleted
                ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground"
                : "border-border/60 bg-card/60 hover:bg-muted/40 text-foreground shadow-2xs hover:border-border"
            )}
          >
            <div className="mt-0.5 shrink-0">
              {ms.isCompleted ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <Circle className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-xs font-semibold leading-snug",
                  ms.isCompleted ? "line-through text-muted-foreground" : "text-foreground group-hover:text-primary transition-colors"
                )}
              >
                {ms.title}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="size-3" /> Due: {ms.dueDate}
                </span>
                <span>•</span>
                <span>{ms.assignedTo}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
