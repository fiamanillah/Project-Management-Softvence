"use client";

import * as React from "react";
import { Link2, AlertTriangle, ArrowRight } from "lucide-react";
import type { TaskDependency } from "../../types";
import { useTaskStore } from "../../data/task-store";

interface TaskDependenciesProps {
  taskId: string;
  dependencies: TaskDependency[];
}

export function TaskDependencies({ taskId, dependencies }: TaskDependenciesProps) {
  const { setSelectedTaskId } = useTaskStore();

  if (dependencies.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <h4 className="text-xs font-bold text-foreground">
          Task Dependencies & Links ({dependencies.length})
        </h4>
      </div>

      <div className="flex flex-col gap-1.5 pt-1">
        {dependencies.map((dep) => (
          <div
            key={dep.id}
            onClick={() => setSelectedTaskId(dep.targetTaskId)}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer border border-border/50 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[11px] font-bold text-primary">
                {dep.targetTaskKey}
              </span>
              <span className="truncate text-foreground font-medium">
                {dep.targetTaskTitle}
              </span>
            </div>

            <span className="text-[10px] text-muted-foreground uppercase font-bold shrink-0 ml-2">
              {dep.type.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
