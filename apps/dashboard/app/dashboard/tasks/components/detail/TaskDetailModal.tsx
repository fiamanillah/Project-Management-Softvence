"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  BookmarkCheck,
  Bug,
  CheckSquare,
  Zap,
  Sparkles,
  Palette,
  FileText,
  Trash2,
  Copy,
  Check,
  Building2,
  FolderKanban,
  ExternalLink,
} from "lucide-react";
import { useTaskStore } from "../../data/task-store";
import { TASK_TYPES, TASK_PRIORITIES } from "../../data/mock-tasks";
import type { TaskPriorityKey, TaskTypeKey } from "../../types";
import { TaskChecklist } from "./TaskChecklist";
import { TaskComments } from "./TaskComments";
import { TaskTimeTracker } from "./TaskTimeTracker";
import { TaskDependencies } from "./TaskDependencies";
import { toast } from "sonner";

export function TaskDetailModal() {
  const {
    selectedTask,
    setSelectedTaskId,
    updateTask,
    deleteTask,
    moveTaskStatus,
    moveTaskSprint,
    sprints,
    epics,
    assignees,
    activeStatuses,
    departments,
    projects,
  } = useTaskStore();

  const [copied, setCopied] = React.useState(false);

  if (!selectedTask) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(selectedTask.key);
    setCopied(true);
    toast.success(`Copied ${selectedTask.key} to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderTypeIcon = (type: TaskTypeKey) => {
    switch (type) {
      case "STORY":
        return <BookmarkCheck className="h-4 w-4 text-emerald-500" />;
      case "BUG":
        return <Bug className="h-4 w-4 text-red-500" />;
      case "SPIKE":
        return <Zap className="h-4 w-4 text-amber-500" />;
      case "IMPROVEMENT":
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      case "DESIGN_ASSET":
        return <Palette className="h-4 w-4 text-pink-500" />;
      case "CONTENT":
        return <FileText className="h-4 w-4 text-cyan-500" />;
      default:
        return <CheckSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  const fibonacciPoints = [1, 2, 3, 5, 8, 13, 21];

  return (
    <Dialog
      open={Boolean(selectedTask)}
      onOpenChange={(open) => !open && setSelectedTaskId(null)}
    >
      <DialogContent
        showCloseButton={true}
        className="w-full max-w-[calc(100%-2rem)] sm:max-w-4xl lg:max-w-5xl max-h-[88vh] p-0 flex flex-col overflow-hidden bg-background border border-border/80 shadow-2xl rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60 bg-muted/20 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <span title={selectedTask.taskType}>
              {renderTypeIcon(selectedTask.taskType)}
            </span>
            <button
              onClick={handleCopyKey}
              className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground hover:text-primary transition-colors bg-muted/70 px-2 py-0.5 rounded-md border border-border/50"
            >
              <span>{selectedTask.key}</span>
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>

            {/* Department Badge */}
            <span className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-muted/60 text-muted-foreground border border-border/60">
              <Building2 className="h-3 w-3" />
              {selectedTask.departmentName}
            </span>

            {/* Project or Standalone Badge */}
            {selectedTask.projectName ? (
              <span className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                <FolderKanban className="h-3 w-3" />
                {selectedTask.projectName}
              </span>
            ) : (
              <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                ⚡ Internal Team Task
              </span>
            )}

            {selectedTask.componentName && (
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: `${selectedTask.componentColor}15`,
                  color: selectedTask.componentColor || "#3b82f6",
                  border: `1px solid ${selectedTask.componentColor}30`,
                }}
              >
                {selectedTask.componentName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => deleteTask(selectedTask.id)}
              title="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Modal Body (2-column layout) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-7 max-h-[calc(88vh-60px)]">
          {/* Main Left Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Task Title
              </label>
              <Input
                value={selectedTask.title}
                onChange={(e) => updateTask(selectedTask.id, { title: e.target.value })}
                className="text-sm font-bold bg-muted/20 border-border/60 focus:border-primary px-3 h-auto py-2 shadow-none rounded-xl"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Description & Technical Context
              </label>
              <Textarea
                value={selectedTask.description}
                onChange={(e) => updateTask(selectedTask.id, { description: e.target.value })}
                rows={5}
                className="text-xs bg-muted/20 resize-none font-mono leading-relaxed rounded-xl border-border/60"
                placeholder="Add rich descriptions, acceptance criteria..."
              />
            </div>

            {/* Custom Fields (Dynamic metadata per project/domain) */}
            {selectedTask.customFields && selectedTask.customFields.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">
                  Project Custom Fields
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedTask.customFields.map((field) => (
                    <div key={field.id} className="flex flex-col gap-1 text-xs">
                      <span className="font-semibold text-muted-foreground text-[11px]">
                        {field.name}
                      </span>
                      {field.type === "URL" ? (
                        <a
                          href={String(field.value)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline text-xs truncate bg-muted/40 p-1.5 rounded"
                        >
                          <span className="truncate">{String(field.value)}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="bg-muted/40 p-1.5 rounded font-medium text-foreground">
                          {String(field.value || "-")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist */}
            <TaskChecklist
              taskId={selectedTask.id}
              checklist={selectedTask.checklist}
            />

            {/* Dependencies */}
            <TaskDependencies
              taskId={selectedTask.id}
              dependencies={selectedTask.dependencies}
            />

            {/* Comments & Activity Stream */}
            <div className="pt-2 border-t border-border/40">
              <TaskComments
                taskId={selectedTask.id}
                comments={selectedTask.comments}
              />
            </div>
          </div>

          {/* Right Sidebar Metadata Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-border/40 pt-4 lg:pt-0 pl-0 lg:pl-6">
            {/* Status (Dynamic from Active Workflow) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Status
              </label>
              <Select
                value={selectedTask.status}
                onValueChange={(val) => {
                  if (val !== null) moveTaskStatus(selectedTask.id, val);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-muted/30">
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
            </div>

            {/* Sprint */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Sprint / Iteration
              </label>
              <Select
                value={selectedTask.sprintId || "BACKLOG"}
                onValueChange={(val) => {
                  if (val !== null) {
                    moveTaskSprint(selectedTask.id, val === "BACKLOG" ? null : val);
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BACKLOG">📦 Product Backlog</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} ({s.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Story Points Estimation */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                <span>Story Points Estimation</span>
                <span className="text-primary font-bold">{selectedTask.storyPoints || 0} pts</span>
              </label>
              <div className="flex items-center gap-1.5">
                {fibonacciPoints.map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => updateTask(selectedTask.id, { storyPoints: pts })}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all ${
                      selectedTask.storyPoints === pts
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
                    }`}
                  >
                    {pts}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Priority
              </label>
              <Select
                value={selectedTask.priority}
                onValueChange={(val) => {
                  if (val !== null) updateTask(selectedTask.id, { priority: val as TaskPriorityKey });
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITIES).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Assignee
              </label>
              <Select
                value={selectedTask.assignee?.id || "UNASSIGNED"}
                onValueChange={(val) => {
                  if (val !== null) {
                    const user = assignees.find((a) => a.id === val) || null;
                    updateTask(selectedTask.id, { assignee: user });
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNASSIGNED">⚪ Unassigned</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name} ({a.designation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Tracking Widget */}
            <TaskTimeTracker
              taskId={selectedTask.id}
              estimatedHours={selectedTask.estimatedHours}
              loggedHours={selectedTask.loggedHours}
              workLogs={selectedTask.workLogs}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
