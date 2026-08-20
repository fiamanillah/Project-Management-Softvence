"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
  Zap,
  Plus,
  Calendar,
  CheckCircle2,
  Archive,
  Building2,
  FolderKanban,
} from "lucide-react";
import { useTaskStore } from "../../data/task-store";
import { TASK_TYPES } from "../../data/mock-tasks";
import type { Sprint, AgileTask, TaskStatusConfig } from "../../types";

export function BacklogView() {
  const {
    tasks,
    sprints,
    activeStatuses,
    setCreateSprintModalOpen,
    setCreateTaskModalOpen,
    startSprint,
    setActiveSprintForCompletion,
    setCompleteSprintModalOpen,
    moveTaskSprint,
    setSelectedTaskId,
  } = useTaskStore();

  const activeSprint = sprints.find((s) => s.status === "ACTIVE");
  const plannedSprints = sprints.filter((s) => s.status === "PLANNED");
  const backlogTasks = tasks.filter((t) => t.sprintId === null);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Sprint Planning & Product Backlog
          </h2>
          <p className="text-xs text-muted-foreground">
            Prioritize user stories, estimate effort points, and organize sprints for upcoming release cycles.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateSprintModalOpen(true)}
          className="text-xs gap-1.5 h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Create Sprint</span>
        </Button>
      </div>

      {/* 1. Active Sprint */}
      {activeSprint && (
        <SprintContainer
          sprint={activeSprint}
          tasks={tasks.filter((t) => t.sprintId === activeSprint.id)}
          statuses={activeStatuses}
          isActive
          onComplete={() => {
            setActiveSprintForCompletion(activeSprint);
            setCompleteSprintModalOpen(true);
          }}
          onSelectTask={(id) => setSelectedTaskId(id)}
        />
      )}

      {/* 2. Planned Sprints */}
      {plannedSprints.map((sprint) => (
        <SprintContainer
          key={sprint.id}
          sprint={sprint}
          tasks={tasks.filter((t) => t.sprintId === sprint.id)}
          statuses={activeStatuses}
          onStart={() => startSprint(sprint.id)}
          onSelectTask={(id) => setSelectedTaskId(id)}
        />
      ))}

      {/* 3. Product Backlog */}
      <div className="flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-muted/40 border-b border-border/50 gap-2">
          <div className="flex items-center gap-2.5">
            <Archive className="h-4 w-4 text-slate-500" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Product Backlog
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {backlogTasks.length} items
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Unassigned backlog items ready for estimation & sprint allocation
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateTaskModalOpen(true)}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            <span>Add to Backlog</span>
          </Button>
        </div>

        {/* Backlog Item Rows */}
        <div className="flex flex-col divide-y divide-border/40">
          {backlogTasks.map((task) => (
            <BacklogItemRow
              key={task.id}
              task={task}
              statuses={activeStatuses}
              onMoveToSprint={(sprintId) => moveTaskSprint(task.id, sprintId)}
              onSelect={() => setSelectedTaskId(task.id)}
            />
          ))}

          {backlogTasks.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Backlog is clear! All stories are assigned to active or upcoming sprints.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SprintContainerProps {
  sprint: Sprint;
  tasks: AgileTask[];
  statuses: TaskStatusConfig[];
  isActive?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  onSelectTask: (id: string) => void;
}

function SprintContainer({
  sprint,
  tasks,
  statuses,
  isActive,
  onStart,
  onComplete,
  onSelectTask,
}: SprintContainerProps) {
  const { moveTaskSprint } = useTaskStore();
  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const donePoints = tasks
    .filter((t) => t.status === "DONE" || t.status === "ASSET_HANDOFF" || t.status === "PUBLISHED")
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-card overflow-hidden shadow-sm transition-all ${
        isActive
          ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
          : "border-border/80"
      }`}
    >
      {/* Sprint Header */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-muted/30 border-b border-border/50 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{sprint.name}</span>
            {isActive ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold py-0.5">
                Active Sprint
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-medium">
                Planned
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(sprint.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} -{" "}
            {new Date(sprint.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Story Point Metrics & Sprint Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span className="flex h-5 items-center justify-center rounded-full bg-primary/10 text-primary px-2 text-[10px] font-bold">
              {donePoints} / {totalPoints} pts
            </span>
          </div>

          {isActive && onComplete && (
            <Button
              size="sm"
              onClick={onComplete}
              className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Complete Sprint</span>
            </Button>
          )}

          {!isActive && onStart && (
            <Button
              size="sm"
              onClick={onStart}
              className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Start Sprint</span>
            </Button>
          )}
        </div>
      </div>

      {/* Sprint Goal Banner */}
      {sprint.goal && (
        <div className="px-5 py-2 bg-muted/10 border-b border-border/40 text-[11px] text-muted-foreground italic">
          <strong>Sprint Goal:</strong> {sprint.goal}
        </div>
      )}

      {/* Task List */}
      <div className="flex flex-col divide-y divide-border/40">
        {tasks.map((task) => (
          <BacklogItemRow
            key={task.id}
            task={task}
            statuses={statuses}
            onMoveToSprint={(targetId) => moveTaskSprint(task.id, targetId)}
            onSelect={() => onSelectTask(task.id)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No tasks in this sprint yet. Move tasks from the Product Backlog below.
          </div>
        )}
      </div>
    </div>
  );
}

interface BacklogItemRowProps {
  task: AgileTask;
  statuses: TaskStatusConfig[];
  onMoveToSprint: (sprintId: string | null) => void;
  onSelect: () => void;
}

function BacklogItemRow({
  task,
  statuses,
  onSelect,
}: BacklogItemRowProps) {
  const statusConfig = statuses.find((s) => s.key === task.status) ?? {
    key: task.status,
    label: task.status,
    color: "#64748b",
    category: "IN_PROGRESS" as const,
    orderIndex: 0,
  };

  return (
    <div
      onClick={onSelect}
      className="group flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
    >
      {/* Left: Type, Key, Title, Scope */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-primary">
          {task.key}
        </span>

        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {task.title}
        </span>

        {task.projectName ? (
          <span className="hidden sm:inline-block truncate rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
            {task.projectName}
          </span>
        ) : (
          <span className="hidden sm:inline-block truncate rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60">
            {task.departmentName}
          </span>
        )}
      </div>

      {/* Right: Status, Points, Priority, Assignee */}
      <div className="flex items-center gap-3 shrink-0 text-xs">
        <span
          className="text-[10px] font-semibold rounded px-2 py-0.5"
          style={{
            backgroundColor: `${statusConfig.color}15`,
            color: statusConfig.color,
            border: `1px solid ${statusConfig.color}30`,
          }}
        >
          {statusConfig.label}
        </span>

        {task.storyPoints !== undefined && (
          <span className="flex h-5 items-center justify-center rounded-full bg-muted px-2 text-[10px] font-bold text-muted-foreground">
            {task.storyPoints} pts
          </span>
        )}

        {task.assignee ? (
          <Avatar className="h-5 w-5 border border-border">
            <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
            <AvatarFallback className="text-[9px]">
              {task.assignee.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="text-[10px] text-muted-foreground/60">Unassigned</span>
        )}
      </div>
    </div>
  );
}
