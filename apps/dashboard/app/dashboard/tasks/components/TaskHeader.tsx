"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@workspace/ui/components/dropdown-menu";
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
  ChevronDown,
  MoreHorizontal,
  Settings2,
  Layers,
  Workflow,
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
    tasks,
    currentUser,
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

  const viewTabs: {
    id: AgileViewMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeVariant?: "emerald" | "primary";
  }[] = [
    {
      id: "TABLE",
      label: "All Tasks",
      icon: TableProperties,
    },
    {
      id: "BOARD",
      label: "Active Sprint Board",
      icon: KanbanSquare,
      badge: activeSprint ? "Live" : undefined,
      badgeVariant: "emerald",
    },
    {
      id: "BACKLOG",
      label: "Backlog & Planning",
      icon: ListOrdered,
    },
    {
      id: "MY_TASKS",
      label: "My Work Queue",
      icon: UserCheck,
      badge: myTasksCount > 0 ? String(myTasksCount) : undefined,
      badgeVariant: "primary",
    },
    {
      id: "TIMELINE",
      label: "Roadmap Timeline",
      icon: CalendarDays,
    },
    {
      id: "WORKFLOWS",
      label: "Workflow Schemes",
      icon: Workflow,
    },
  ];

  return (
    <div className="flex flex-col border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top row: Title, Workspace context, and Primary/Secondary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5">
        {/* Left: Branding & Page Context */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Task Management & Agile Engine
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Cross-project delivery, sprint velocity, and custom lifecycle workflows.
            </p>
          </div>
        </div>

        {/* Right: Consolidated Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Active Workflow Switcher Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWorkflowManagerModalOpen(true)}
            className="h-9 gap-1.5 border-border/80 text-xs font-medium text-foreground hover:bg-accent"
            title="Configure workflow statuses & lifecycle rules"
          >
            <GitFork className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold">{activeWorkflow.name}</span>
          </Button>

          {/* Sprint Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-border/80 text-xs font-medium"
                />
              }
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Sprint</span>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs font-semibold">Sprint Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setCreateSprintModalOpen(true)}
                className="gap-2 text-xs cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>Create New Sprint</span>
              </DropdownMenuItem>
              {activeSprint && (
                <DropdownMenuItem
                  onClick={() => {
                    setActiveSprintForCompletion(activeSprint);
                    setCompleteSprintModalOpen(true);
                  }}
                  className="gap-2 text-xs cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Complete Active Sprint</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Secondary Actions / Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  title="More settings & options"
                />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setWorkflowManagerModalOpen(true)}
                className="gap-2 text-xs cursor-pointer"
              >
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Manage Workflows</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={resetToMockData}
                className="gap-2 text-xs cursor-pointer text-destructive focus:text-destructive"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Demo Mock Data</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Primary CTA: Create Task */}
          <Button
            size="sm"
            onClick={() => setCreateTaskModalOpen(true)}
            className="h-9 gap-1.5 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-3.5 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Bottom row: Seamless Segmented Tab Switcher */}
      <div className="flex items-center justify-between overflow-x-auto px-6 py-2 border-t border-border/40 bg-muted/10 no-scrollbar">
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 border border-border/50">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-background text-foreground shadow-sm shadow-black/5 font-semibold"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : ""}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      tab.badgeVariant === "emerald"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Task counter status indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground pl-4">
          <span>
            Total <strong className="text-foreground">{tasks.length}</strong> tasks in system
          </span>
        </div>
      </div>
    </div>
  );
}
