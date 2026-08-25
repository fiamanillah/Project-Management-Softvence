"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { TaskStatusConfig, AgileTask } from "../../types";
import { KanbanCard } from "./KanbanCard";
import { useTaskStore } from "../../data/task-store";

interface KanbanColumnProps {
  status: TaskStatusConfig;
  tasks: AgileTask[];
  wipLimit?: number;
  compact?: boolean;
}

export function KanbanColumn({
  status,
  tasks,
  wipLimit,
  compact = false,
}: KanbanColumnProps) {
  const { moveTaskStatus, setCreateTaskModalOpen } = useTaskStore();
  const [isOver, setIsOver] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(15);

  const totalPoints = React.useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  }, [tasks]);

  const isWipExceeded = wipLimit ? tasks.length > wipLimit : false;
  const visibleTasks = tasks.slice(0, visibleCount);
  const hasMore = tasks.length > visibleCount;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      moveTaskStatus(taskId, status.key);
    }
  };

  // Render Folded/Collapsed Column Strip
  if (isCollapsed) {
    return (
      <div
        onClick={() => setIsCollapsed(false)}
        className="flex flex-col items-center py-4 px-2 rounded-2xl border border-border/60 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all w-12 min-w-[48px] shrink-0 select-none group"
        title={`Click to expand ${status.label} (${tasks.length} tasks)`}
      >
        <span
          className="h-2.5 w-2.5 rounded-full mb-3 shrink-0"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-[11px] font-bold tracking-wider text-muted-foreground group-hover:text-foreground uppercase [writing-mode:vertical-lr] rotate-180 py-2">
          {status.label}
        </span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted mt-auto text-[10px] font-bold text-foreground">
          {tasks.length}
        </span>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col rounded-2xl border bg-muted/30 p-2.5 transition-all duration-200 min-w-[280px] max-w-[320px] w-full flex-1 shrink-0 ${
        isOver
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border/60"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-1.5 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: status.color }}
          />
          <span className="text-xs font-bold tracking-tight text-foreground truncate">
            {status.label}
          </span>
          <span className="flex h-5 items-center justify-center rounded-full bg-muted px-2 text-[11px] font-semibold text-muted-foreground shrink-0">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium shrink-0">
          {totalPoints > 0 && (
            <span title="Total Story Points">{totalPoints} pts</span>
          )}
          {isWipExceeded && (
            <span className="rounded bg-red-500/10 px-1 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
              WIP ({wipLimit})
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 rounded"
            title="Collapse column"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-290px)] min-h-[150px] p-0.5 no-scrollbar">
        {visibleTasks.map((task) => (
          <KanbanCard key={task.id} task={task} compact={compact} />
        ))}

        {/* Progressive Load More Action for High-Volume Columns */}
        {hasMore && (
          <div className="flex flex-col gap-1 rounded-xl bg-background/60 border border-border/50 p-2 text-center my-1">
            <span className="text-[10px] text-muted-foreground font-medium">
              Showing {visibleTasks.length} of {tasks.length} tasks
            </span>
            <div className="flex items-center justify-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((prev) => prev + 15)}
                className="h-6 text-[10px] px-2"
              >
                Load 15 more
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCount(tasks.length)}
                className="h-6 text-[10px] px-2 text-primary hover:text-primary"
              >
                Show all
              </Button>
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 py-8 text-center text-xs text-muted-foreground">
            <span>No tasks in {status.label}</span>
            <span className="text-[10px] text-muted-foreground/70">Drag items here</span>
          </div>
        )}
      </div>

      {/* Quick Add Button */}
      <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCreateTaskModalOpen(true)}
          className="w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5 hover:bg-background/80"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add task</span>
        </Button>
      </div>
    </div>
  );
}

