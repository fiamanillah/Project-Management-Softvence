"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Clock, Plus, History } from "lucide-react";
import { useTaskStore } from "../../data/task-store";
import type { WorkLog } from "../../types";

interface TaskTimeTrackerProps {
  taskId: string;
  estimatedHours?: number;
  loggedHours?: number;
  workLogs: WorkLog[];
}

export function TaskTimeTracker({
  taskId,
  estimatedHours = 0,
  loggedHours = 0,
  workLogs,
}: TaskTimeTrackerProps) {
  const { addWorkLog } = useTaskStore();
  const [isLogging, setIsLogging] = React.useState(false);
  const [hours, setHours] = React.useState("");
  const [desc, setDesc] = React.useState("");

  const percentage =
    estimatedHours > 0 ? Math.min(Math.round((loggedHours / estimatedHours) * 100), 100) : 0;
  const isOverEstimated = estimatedHours > 0 && loggedHours > estimatedHours;

  const handleLog = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(hours);
    if (isNaN(num) || num <= 0) return;

    addWorkLog(taskId, {
      hoursSpent: num,
      description: desc.trim() || "Worked on task implementation",
      date: new Date().toISOString().split("T")[0] ?? "2026-08-20",
    });

    setHours("");
    setDesc("");
    setIsLogging(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <h4 className="text-xs font-bold text-foreground">Time Tracking</h4>
        </div>
        <span className="text-xs font-semibold text-foreground">
          {loggedHours}h / {estimatedHours}h
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all duration-300 ${
            isOverEstimated ? "bg-red-500" : "bg-amber-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Quick Log Action */}
      {isLogging ? (
        <form onSubmit={handleLog} className="flex flex-col gap-2 pt-2 border-t border-border/40">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <Input
                type="number"
                step="0.5"
                min="0.5"
                placeholder="Hours (e.g. 2.5)"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="h-8 text-xs bg-background"
                autoFocus
              />
            </div>
            <div className="col-span-2">
              <Input
                placeholder="Work description..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsLogging(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-7 text-xs px-3">
              Save Work
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsLogging(true)}
          className="h-7 text-xs gap-1.5 justify-start w-fit text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          <span>Log Work</span>
        </Button>
      )}

      {/* Work History */}
      {workLogs.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-border/40 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <History className="h-3 w-3" /> Logged History ({workLogs.length})
          </span>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto no-scrollbar">
            {workLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-[11px] p-1.5 rounded bg-muted/40"
              >
                <div className="flex flex-col truncate pr-2">
                  <span className="font-medium text-foreground truncate">{log.description}</span>
                  <span className="text-[10px] text-muted-foreground">{log.userName} • {log.date}</span>
                </div>
                <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">
                  +{log.hoursSpent}h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
