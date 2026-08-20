"use client";

import * as React from "react";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useTaskStore } from "../../data/task-store";
import type { TaskChecklistItem } from "../../types";

interface TaskChecklistProps {
  taskId: string;
  checklist: TaskChecklistItem[];
}

export function TaskChecklist({ taskId, checklist }: TaskChecklistProps) {
  const { toggleChecklistItem, addChecklistItem, removeChecklistItem } = useTaskStore();
  const [newTitle, setNewTitle] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);

  const completedCount = checklist.filter((i) => i.isCompleted).length;
  const totalCount = checklist.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addChecklistItem(taskId, newTitle.trim());
    setNewTitle("");
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <h4 className="text-xs font-bold text-foreground">
            Acceptance Criteria & Subtasks
          </h4>
          <span className="text-xs font-semibold text-muted-foreground">
            ({completedCount}/{totalCount})
          </span>
        </div>

        <span className="text-xs font-bold text-muted-foreground">
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all duration-300 ${
              percentage === 100 ? "bg-emerald-500" : "bg-primary"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Checklist items list */}
      <div className="flex flex-col gap-1.5 pt-1">
        {checklist.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between gap-2.5 rounded-lg p-2 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Checkbox
                checked={item.isCompleted}
                onCheckedChange={() => toggleChecklistItem(taskId, item.id)}
              />
              <span
                onClick={() => toggleChecklistItem(taskId, item.id)}
                className={`text-xs cursor-pointer select-none line-clamp-2 ${
                  item.isCompleted
                    ? "text-muted-foreground line-through"
                    : "text-foreground font-medium"
                }`}
              >
                {item.title}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeChecklistItem(taskId, item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add item inline */}
      {isAdding ? (
        <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
          <Input
            autoFocus
            placeholder="Add acceptance criteria..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-8 text-xs bg-background"
          />
          <Button type="submit" size="sm" className="h-8 text-xs px-3">
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs px-2"
            onClick={() => {
              setIsAdding(false);
              setNewTitle("");
            }}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="h-7 text-xs justify-start w-fit text-muted-foreground gap-1.5 mt-1 border-dashed"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add criteria item</span>
        </Button>
      )}
    </div>
  );
}
