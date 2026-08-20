"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  ArrowUpDown,
  BookmarkCheck,
  Bug,
  CheckSquare,
  Zap,
  Sparkles,
  Palette,
  FileText,
  Flame,
  ChevronUp,
  Equal,
  ChevronDown,
  Clock,
  Trash2,
} from "lucide-react";
import { useTaskStore } from "../../data/task-store";
import { TASK_TYPES, TASK_PRIORITIES } from "../../data/mock-tasks";
import type { AgileTask, TaskPriorityKey, TaskTypeKey } from "../../types";

export function TaskTableView() {
  const {
    filteredTasks,
    setSelectedTaskId,
    moveTaskStatus,
    updateTask,
    deleteTask,
    activeStatuses,
  } = useTaskStore();

  const [sortField, setSortField] = React.useState<keyof AgileTask>("key");
  const [sortAsc, setSortAsc] = React.useState(true);

  const sortedTasks = React.useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (aVal === undefined || aVal === null) return sortAsc ? 1 : -1;
      if (bVal === undefined || bVal === null) return sortAsc ? -1 : 1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [filteredTasks, sortField, sortAsc]);

  const handleSort = (field: keyof AgileTask) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const renderTypeIcon = (type: TaskTypeKey) => {
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
  };

  const renderPriorityIcon = (priority: TaskPriorityKey) => {
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
  };

  return (
    <div className="p-6">
      <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[110px]">
                <button
                  onClick={() => handleSort("key")}
                  className="flex items-center gap-1 text-xs font-bold text-foreground"
                >
                  Key <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="min-w-[280px]">
                <button
                  onClick={() => handleSort("title")}
                  className="flex items-center gap-1 text-xs font-bold text-foreground"
                >
                  Title & Scope <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead className="w-[120px]">Priority</TableHead>
              <TableHead className="w-[80px] text-center">Points</TableHead>
              <TableHead className="w-[160px]">Assignee</TableHead>
              <TableHead className="w-[100px]">Logged</TableHead>
              <TableHead className="w-[110px]">Due Date</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => {
              return (
                <TableRow
                  key={task.id}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  {/* Key */}
                  <TableCell
                    className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-primary cursor-pointer"
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="flex items-center gap-1.5">
                      {renderTypeIcon(task.taskType)}
                      <span>{task.key}</span>
                    </div>
                  </TableCell>

                  {/* Title & Scope */}
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {task.projectName ? (
                          <span className="text-primary font-medium">{task.projectName}</span>
                        ) : (
                          <span>{task.departmentName}</span>
                        )}
                        {task.componentName && (
                          <span>• {task.componentName}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Status Dropdown */}
                  <TableCell>
                    <Select
                      value={task.status}
                      onValueChange={(val) => {
                        if (val !== null) moveTaskStatus(task.id, val);
                      }}
                    >
                      <SelectTrigger className="h-7 text-[11px] font-medium border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeStatuses.map((s) => (
                          <SelectItem key={s.key} value={s.key} className="text-xs">
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Priority Dropdown */}
                  <TableCell>
                    <Select
                      value={task.priority}
                      onValueChange={(val) => {
                        if (val !== null) updateTask(task.id, { priority: val as TaskPriorityKey });
                      }}
                    >
                      <SelectTrigger className="h-7 text-[11px] font-medium border-border/60">
                        <div className="flex items-center gap-1.5">
                          {renderPriorityIcon(task.priority)}
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_PRIORITIES).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">
                            <span className="flex items-center gap-1.5">
                              {renderPriorityIcon(k as TaskPriorityKey)}
                              {v.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Story Points */}
                  <TableCell className="text-center">
                    <span className="inline-flex h-5 items-center justify-center rounded-full bg-muted px-2 text-[10px] font-bold text-muted-foreground">
                      {task.storyPoints || "-"}
                    </span>
                  </TableCell>

                  {/* Assignee */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {task.assignee ? (
                        <>
                          <Avatar className="h-5 w-5 border border-border">
                            <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                            <AvatarFallback className="text-[9px]">
                              {task.assignee.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs truncate max-w-[100px] text-foreground">
                            {task.assignee.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60 italic">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Logged Hours */}
                  <TableCell>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {task.loggedHours || 0}h / {task.estimatedHours || 0}h
                    </span>
                  </TableCell>

                  {/* Due Date */}
                  <TableCell>
                    <span className="text-[11px] text-muted-foreground">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "-"}
                    </span>
                  </TableCell>

                  {/* Delete Action */}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {sortedTasks.length === 0 && (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No matching tasks found. Adjust your search or filter settings.
          </div>
        )}
      </div>
    </div>
  );
}
