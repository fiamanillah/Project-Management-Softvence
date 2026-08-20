"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Plus, CircleDot } from "lucide-react";
import type { TaskStatusConfig, AgileTask } from "../../types";
import { KanbanCard } from "./KanbanCard";
import { useTaskStore } from "../../data/task-store";

interface KanbanColumnProps {
  status: TaskStatusConfig;
  tasks: AgileTask[];
  wipLimit?: number;
}

export function KanbanColumn({ status, tasks, wipLimit }: KanbanColumnProps) {
  const { moveTaskStatus, setCreateTaskModalOpen } = useTaskStore();
  const [isOver, setIsOver] = React.useState(false);

  const totalPoints = React.useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  }, [tasks]);

  const isWipExceeded = wipLimit ? tasks.length > wipLimit : false;

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
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <span className="text-xs font-bold tracking-tight text-foreground">
            {status.label}
          </span>
          <span className="flex h-5 items-center justify-center rounded-full bg-muted px-2 text-[11px] font-semibold text-muted-foreground">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
          {totalPoints > 0 && (
            <span title="Total Story Points">{totalPoints} pts</span>
          )}
          {isWipExceeded && (
            <span className="rounded bg-red-500/10 px-1 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
              WIP ({wipLimit})
            </span>
          )}
        </div>
      </div>

      {/* Cards List */}
      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[150px] p-0.5 no-scrollbar">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} />
        ))}

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
