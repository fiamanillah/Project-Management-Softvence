"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Calendar, Layers, Zap } from "lucide-react";
import { useTaskStore } from "../../data/task-store";

export function RoadmapTimelineView() {
  const { sprints, epics, tasks, setSelectedTaskId } = useTaskStore();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-foreground">
          Agile Roadmap & Release Timeline
        </h2>
        <p className="text-xs text-muted-foreground">
          High-level visual timeline tracking sprint iterations, epic milestone completion, and delivery schedules.
        </p>
      </div>

      {/* Sprints Track */}
      <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-xs gap-4">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" /> Sprint Iterations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sprints.map((sprint) => {
            const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
            const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
            const donePoints = sprintTasks
              .filter((t) => t.status === "DONE" || t.status === "ASSET_HANDOFF" || t.status === "PUBLISHED")
              .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
            const percentage =
              totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

            return (
              <div
                key={sprint.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 transition-all ${
                  sprint.status === "ACTIVE"
                    ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                    : sprint.status === "COMPLETED"
                    ? "border-border/60 bg-muted/20 opacity-80"
                    : "border-border/80 bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {sprint.name}
                  </span>
                  {sprint.status === "ACTIVE" && (
                    <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      Active
                    </Badge>
                  )}
                  {sprint.status === "COMPLETED" && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Completed
                    </Badge>
                  )}
                  {sprint.status === "PLANNED" && (
                    <Badge variant="outline" className="text-[10px]">
                      Planned
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(sprint.startDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(sprint.endDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Velocity:</span>
                    <span className="font-semibold text-foreground">
                      {donePoints}/{totalPoints} pts ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Epics Milestone Progress */}
      <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-xs gap-4">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" /> Epics & Feature Progress
        </h3>

        <div className="flex flex-col divide-y divide-border/40">
          {epics.map((epic) => {
            const epicTasks = tasks.filter((t) => t.componentId === epic.id);
            const totalTasks = epicTasks.length;
            const doneTasks = epicTasks.filter(
              (t) => t.status === "DONE" || t.status === "ASSET_HANDOFF" || t.status === "PUBLISHED"
            ).length;
            const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

            return (
              <div key={epic.id} className="py-4 first:pt-0 last:pb-0 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: epic.color }}
                    />
                    <span className="text-xs font-bold text-foreground">
                      {epic.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {doneTasks}/{totalTasks} tasks completed
                    </span>
                    <Badge variant="outline" className="font-bold text-[10px]">
                      {progress}%
                    </Badge>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  {epic.description}
                </p>

                {/* Progress Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: epic.color,
                    }}
                  />
                </div>

                {/* Micro task chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {epicTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-medium border transition-colors cursor-pointer ${
                        t.status === "DONE"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 line-through opacity-80"
                          : "bg-muted/60 text-foreground border-border/80 hover:border-primary"
                      }`}
                    >
                      {t.key}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
