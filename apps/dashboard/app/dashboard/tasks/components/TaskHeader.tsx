"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  KanbanSquare,
  ListOrdered,
  TableProperties,
  CalendarDays,
  UserCheck,
  Plus,
  RotateCcw,
  Sparkles,
  Zap,
  CheckCircle2,
  GitFork,
  Building2,
} from "lucide-react";
import { useTaskStore } from "../data/task-store";
import type { AgileViewMode } from "../types";

export function TaskHeader() {
  const {
    viewMode,
    setViewMode,
    activeSprint,
    activeWorkflow,
    filteredTasks,
    currentUser,
    tasks,
    setCreateTaskModalOpen,
    setCreateSprintModalOpen,
    setWorkflowManagerModalOpen,
    setActiveSprintForCompletion,
    setCompleteSprintModalOpen,
    resetToMockData,
  } = useTaskStore();

  const myTasksCount = React.useMemo(() => {
    return tasks.filter((t) => t.assignee?.id === currentUser.id && t.status !== "DONE").length;
  }, [tasks, currentUser]);

  const viewModes: { id: AgileViewMode; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: "BOARD", label: "Kanban Board", icon: KanbanSquare },
    { id: "BACKLOG", label: "Backlog & Sprints", icon: ListOrdered },
    { id: "TABLE", label: "List View", icon: TableProperties },
    { id: "TIMELINE", label: "Timeline & Roadmap", icon: CalendarDays },
    { id: "MY_TASKS", label: "My Tasks", icon: UserCheck, badge: myTasksCount },
  ];

  return (
    <div className="flex flex-col gap-4 border-b border-border/60 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top row: Title, Workflow scheme, Sprint status, and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Task Management & Agile Workspaces
              </h1>
              <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary text-xs font-semibold py-0.5">
                <Sparkles className="h-3 w-3" /> Softvence Tasks
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Departmental execution, cross-project agile sprints, and dynamic workflow lifecycles.
            </p>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Workflow Badge / Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWorkflowManagerModalOpen(true)}
            className="text-xs gap-1.5 h-9 border-border/80 text-foreground"
            title="Configure workflow columns & dynamic statuses"
          >
            <GitFork className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold">{activeWorkflow.name}</span>
          </Button>

          {activeSprint && (
            <div className="hidden xl:flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-foreground">{activeSprint.name}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs gap-1 ml-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => {
                  setActiveSprintForCompletion(activeSprint);
                  setCompleteSprintModalOpen(true);
                }}
              >
                <CheckCircle2 className="h-3 w-3" /> Complete Sprint
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={resetToMockData}
            title="Reset to default mock data"
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-9"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Demo</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateSprintModalOpen(true)}
            className="text-xs gap-1.5 h-9 border-border/80"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Create Sprint</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateTaskModalOpen(true)}
            className="text-xs gap-1.5 h-9 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Bottom row: View Mode Switcher Tabs */}
      <div className="flex items-center justify-between overflow-x-auto pt-1 no-scrollbar">
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 border border-border/50">
          {viewModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-background text-foreground shadow-sm shadow-black/5"
                    : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : ""}`} />
                <span>{mode.label}</span>
                {mode.badge !== undefined && mode.badge > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {mode.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Task counter indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground pl-4">
          <span>Showing <strong className="text-foreground">{filteredTasks.length}</strong> tasks</span>
        </div>
      </div>
    </div>
  );
}
