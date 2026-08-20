"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowRight,
  Building2,
  FolderKanban,
} from "lucide-react";
import { useTaskStore } from "../../data/task-store";
import type { AgileTask } from "../../types";

export function MyTasksView() {
  const {
    tasks,
    currentUser,
    setSelectedTaskId,
    moveTaskStatus,
  } = useTaskStore();

  const myTasks = tasks.filter((t) => t.assignee?.id === currentUser.id);

  const inProgressTasks = myTasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "WIREFRAMING" || t.status === "HIFI_DESIGN" || t.status === "DRAFTING"
  );
  const inReviewTasks = myTasks.filter(
    (t) => t.status === "CODE_REVIEW" || t.status === "QA_TESTING" || t.status === "DESIGN_REVIEW" || t.status === "PROOFREADING"
  );
  const todoTasks = myTasks.filter(
    (t) => t.status === "TODO" || t.status === "BACKLOG" || t.status === "DESIGN_BACKLOG" || t.status === "CONTENT_BRIEF"
  );
  const doneTasks = myTasks.filter(
    (t) => t.status === "DONE" || t.status === "ASSET_HANDOFF" || t.status === "PUBLISHED"
  );

  const totalLoggedHours = myTasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);
  const totalEstHours = myTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header with Employee Summary Card */}
      <div className="flex flex-wrap items-center justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-primary/30">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                {currentUser.name}&apos;s Personal Cockpit
              </h2>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                {currentUser.designation}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
              <Building2 className="h-3 w-3" /> {currentUser.teamName} • Sprint 14 Focus
            </p>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col items-center rounded-xl bg-muted/50 px-3.5 py-2 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Active Focus
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {inProgressTasks.length} tasks
            </span>
          </div>

          <div className="flex flex-col items-center rounded-xl bg-muted/50 px-3.5 py-2 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Logged Work
            </span>
            <span className="text-sm font-bold text-foreground">
              {totalLoggedHours}h / {totalEstHours}h
            </span>
          </div>

          <div className="flex flex-col items-center rounded-xl bg-muted/50 px-3.5 py-2 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Completed
            </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {doneTasks.length} done
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Focus Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Working On Right Now */}
        <div className="flex flex-col rounded-2xl border border-amber-500/40 bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> Currently In Progress ({inProgressTasks.length})
            </span>
          </div>

          <div className="flex flex-col divide-y divide-border/40 p-2">
            {inProgressTasks.map((t) => (
              <MyTaskCard
                key={t.id}
                task={t}
                onSelect={() => setSelectedTaskId(t.id)}
                onMoveToReview={() => moveTaskStatus(t.id, "CODE_REVIEW")}
              />
            ))}

            {inProgressTasks.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No tasks currently in progress. Pick one from To Do!
              </div>
            )}
          </div>
        </div>

        {/* 2. In Review / QA */}
        <div className="flex flex-col rounded-2xl border border-purple-500/40 bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-purple-500" /> In Review & Testing ({inReviewTasks.length})
            </span>
          </div>

          <div className="flex flex-col divide-y divide-border/40 p-2">
            {inReviewTasks.map((t) => (
              <MyTaskCard
                key={t.id}
                task={t}
                onSelect={() => setSelectedTaskId(t.id)}
              />
            ))}

            {inReviewTasks.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No tasks awaiting review or QA right now.
              </div>
            )}
          </div>
        </div>

        {/* 3. Up Next (To Do) */}
        <div className="flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border/50">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-blue-500" /> Up Next in Sprint ({todoTasks.length})
            </span>
          </div>

          <div className="flex flex-col divide-y divide-border/40 p-2">
            {todoTasks.map((t) => (
              <MyTaskCard
                key={t.id}
                task={t}
                onSelect={() => setSelectedTaskId(t.id)}
                onStartProgress={() => moveTaskStatus(t.id, "IN_PROGRESS")}
              />
            ))}

            {todoTasks.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                All assigned sprint items are in flight or completed!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MyTaskCardProps {
  task: AgileTask;
  onSelect: () => void;
  onStartProgress?: () => void;
  onMoveToReview?: () => void;
}

function MyTaskCard({
  task,
  onSelect,
  onStartProgress,
  onMoveToReview,
}: MyTaskCardProps) {
  const completedChecklist = task.checklist.filter((c) => c.isCompleted).length;
  const totalChecklist = task.checklist.length;

  return (
    <div
      onClick={onSelect}
      className="group flex flex-col gap-2 rounded-xl p-3 hover:bg-muted/40 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold text-muted-foreground group-hover:text-primary">
            {task.key}
          </span>
          {task.projectName ? (
            <span className="truncate rounded px-1 text-[9px] font-medium bg-primary/10 text-primary">
              {task.projectName}
            </span>
          ) : (
            <span className="truncate rounded px-1 text-[9px] font-semibold bg-muted text-muted-foreground">
              {task.departmentName}
            </span>
          )}
        </div>

        {task.storyPoints !== undefined && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
            {task.storyPoints}p
          </span>
        )}
      </div>

      <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {task.title}
      </h4>

      {totalChecklist > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>{completedChecklist}/{totalChecklist} checklist completed</span>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
        <span className="text-muted-foreground">
          Logged: {task.loggedHours || 0}h / {task.estimatedHours || 0}h
        </span>

        {onStartProgress && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] gap-1 py-0 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onStartProgress();
            }}
          >
            Start <ArrowRight className="h-2.5 w-2.5" />
          </Button>
        )}

        {onMoveToReview && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] gap-1 py-0 px-2 text-purple-600 dark:text-purple-400 border-purple-500/30"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToReview();
            }}
          >
            Ready for Review <ArrowRight className="h-2.5 w-2.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
