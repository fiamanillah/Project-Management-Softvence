"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
  BookmarkCheck,
  Bug,
  CheckSquare,
  Zap,
  Sparkles,
  Palette,
  FileText,
  CheckCircle2,
  Clock,
  MessageSquare,
  Flame,
  ChevronUp,
  Equal,
  ChevronDown,
} from "lucide-react";
import type { AgileTask, TaskTypeKey, TaskPriorityKey } from "../../types";
import { TASK_TYPES, TASK_PRIORITIES } from "../../data/mock-tasks";
import { useTaskStore } from "../../data/task-store";

interface KanbanCardProps {
  task: AgileTask;
  isDragging?: boolean;
  compact?: boolean;
}

function renderTypeIcon(type: TaskTypeKey) {
  switch (type) {
    case "STORY":
      return <BookmarkCheck className="h-3.5 w-3.5 text-emerald-500" />;
    case "BUG":
      return <Bug className="h-3.5 w-3.5 text-red-500" />;
    case "SPIKE":
      return <Zap className="h-3.5 w-3.5 text-amber-500" />;
    case "IMPROVEMENT":
      return <Sparkles className="h-3.5 w-3.5 text-purple-500" />;
    case "DESIGN_ASSET":
      return <Palette className="h-3.5 w-3.5 text-pink-500" />;
    case "CONTENT":
      return <FileText className="h-3.5 w-3.5 text-cyan-500" />;
    default:
      return <CheckSquare className="h-3.5 w-3.5 text-blue-500" />;
  }
}

function renderPriorityIcon(priority: TaskPriorityKey) {
  switch (priority) {
    case "URGENT":
      return <Flame className="h-3.5 w-3.5 text-red-500" />;
    case "HIGH":
      return <ChevronUp className="h-3.5 w-3.5 text-orange-500" />;
    case "LOW":
      return <ChevronDown className="h-3.5 w-3.5 text-blue-400" />;
    default:
      return <Equal className="h-3.5 w-3.5 text-yellow-500" />;
  }
}

export function KanbanCard({ task, compact = false }: KanbanCardProps) {
  const { setSelectedTaskId } = useTaskStore();
  const [isDragged, setIsDragged] = React.useState(false);

  const typeConfig = TASK_TYPES[task.taskType] ?? {
    key: "TASK",
    label: "Task",
    color: "#3b82f6",
    icon: "CheckSquare",
  };
  const priorityConfig = TASK_PRIORITIES[task.priority] ?? {
    key: "MEDIUM",
    label: "Medium",
    level: 2,
    color: "#eab308",
    bg: "bg-yellow-500/10 text-yellow-700",
    icon: "Equal",
  };

  const completedChecklist = task.checklist.filter((c) => c.isCompleted).length;
  const totalChecklist = task.checklist.length;
  const checklistPercentage =
    totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragged(true);
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setIsDragged(false);
  };

  // High-Density Executive Compact View
  if (compact) {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={() => setSelectedTaskId(task.id)}
        className={`group relative flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-card px-2.5 py-2 shadow-2xs transition-all duration-150 hover:border-primary/50 hover:shadow-xs cursor-grab active:cursor-grabbing select-none ${
          isDragged ? "opacity-40 scale-[0.98] border-dashed border-primary" : "opacity-100"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span title={typeConfig.label} className="shrink-0">
            {renderTypeIcon(task.taskType)}
          </span>
          <span className="font-mono text-[10px] font-semibold text-muted-foreground shrink-0">
            {task.key}
          </span>
          <span className="truncate text-xs font-medium text-foreground group-hover:text-primary transition-colors">
            {task.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span title={`Priority: ${priorityConfig.label}`}>
            {renderPriorityIcon(task.priority)}
          </span>
          {task.assignee && (
            <Avatar className="h-4.5 w-4.5 border border-border">
              <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
              <AvatarFallback className="text-[8px]">
                {task.assignee.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    );
  }

  // Standard Detailed Card
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => setSelectedTaskId(task.id)}
      className={`group relative flex flex-col gap-2.5 rounded-xl border border-border/80 bg-card p-3.5 shadow-xs transition-all duration-150 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing select-none ${
        isDragged ? "opacity-40 scale-[0.98] border-dashed border-primary" : "opacity-100"
      }`}
    >
      {/* Top row: Key, Type, Scope badge, and Priority */}
      <div className="flex items-center justify-between gap-1.5 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span title={typeConfig.label} className="shrink-0">
            {renderTypeIcon(task.taskType)}
          </span>
          <span className="font-mono text-[11px] font-semibold text-muted-foreground hover:text-foreground">
            {task.key}
          </span>

          {/* Project or Department Badge */}
          {task.projectName ? (
            <span
              className="truncate rounded px-1 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 max-w-[110px]"
              title={`Project: ${task.projectName}`}
            >
              {task.projectName}
            </span>
          ) : (
            <span
              className="truncate rounded px-1 py-0.5 text-[9px] font-semibold bg-muted text-muted-foreground border border-border/60"
              title={`Department: ${task.departmentName}`}
            >
              {task.departmentName.split(" ")[0]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span title={`Priority: ${priorityConfig.label}`}>
            {renderPriorityIcon(task.priority)}
          </span>
          {task.storyPoints !== undefined && (
            <span className="flex h-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
              {task.storyPoints}p
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-card-foreground group-hover:text-primary transition-colors">
        {task.title}
      </h3>

      {/* Checklist Progress Bar */}
      {totalChecklist > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Checklist
            </span>
            <span className="font-semibold">
              {completedChecklist}/{totalChecklist} ({checklistPercentage}%)
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-300 ${
                checklistPercentage === 100 ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${checklistPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom row: Tags/Comments/Time & Assignee */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/40">
        <div className="flex items-center gap-2.5">
          {task.loggedHours !== undefined && task.loggedHours > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400" title={`Logged ${task.loggedHours}h / Est ${task.estimatedHours || 0}h`}>
              <Clock className="h-3 w-3" />
              {task.loggedHours}h
            </span>
          )}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-1 text-[10px]" title={`${task.comments.length} comments`}>
              <MessageSquare className="h-3 w-3" />
              {task.comments.length}
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <div className="flex items-center gap-1.5">
          {task.assignee ? (
            <div className="flex items-center gap-1" title={`Assigned to ${task.assignee.name}`}>
              <Avatar className="h-5 w-5 border border-border">
                <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                  {task.assignee.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground/70 italic">Unassigned</span>
          )}
        </div>
      </div>
    </div>
  );
}
