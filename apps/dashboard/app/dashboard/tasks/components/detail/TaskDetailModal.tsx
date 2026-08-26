"use client"

import * as React from "react"
import { Dialog, DialogContent } from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
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
} from "lucide-react"
import { useTaskStore } from "../../data/task-store"
import { TASK_PRIORITIES } from "../../data/mock-tasks"
import type { TaskPriorityKey, TaskTypeKey } from "../../types"
import { TaskChecklist } from "./TaskChecklist"
import { TaskComments } from "./TaskComments"
import { TaskTimeTracker } from "./TaskTimeTracker"
import { TaskDependencies } from "./TaskDependencies"
import { toast } from "sonner"

function renderTypeIcon(type: TaskTypeKey) {
  switch (type) {
    case "STORY":
      return <BookmarkCheck className="h-4 w-4 text-emerald-500" />
    case "BUG":
      return <Bug className="h-4 w-4 text-red-500" />
    case "SPIKE":
      return <Zap className="h-4 w-4 text-amber-500" />
    case "IMPROVEMENT":
      return <Sparkles className="h-4 w-4 text-purple-500" />
    case "DESIGN_ASSET":
      return <Palette className="h-4 w-4 text-pink-500" />
    case "CONTENT":
      return <FileText className="h-4 w-4 text-cyan-500" />
    default:
      return <CheckSquare className="h-4 w-4 text-blue-500" />
  }
}

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21]

export function TaskDetailModal() {
  const {
    selectedTask,
    setSelectedTaskId,
    updateTask,
    deleteTask,
    moveTaskStatus,
    moveTaskSprint,
    sprints,
    assignees,
    activeStatuses,
  } = useTaskStore()

  const [copied, setCopied] = React.useState(false)

  if (!selectedTask) return null

  const handleCopyKey = () => {
    navigator.clipboard.writeText(selectedTask.key)
    setCopied(true)
    toast.success(`Copied ${selectedTask.key} to clipboard!`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog
      open={Boolean(selectedTask)}
      onOpenChange={(open) => !open && setSelectedTaskId(null)}
    >
      <DialogContent
        showCloseButton={true}
        className="flex max-h-[88vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background p-0 shadow-2xl sm:max-w-4xl lg:max-w-5xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-6 py-3.5 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <span title={selectedTask.taskType}>
              {renderTypeIcon(selectedTask.taskType)}
            </span>
            <button
              onClick={handleCopyKey}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/50 bg-muted/70 px-2 py-0.5 font-mono text-xs font-bold text-foreground transition-colors hover:text-primary"
            >
              <span>{selectedTask.key}</span>
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>

            {/* Department Badge */}
            <span className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {selectedTask.departmentName}
            </span>

            {/* Project or Standalone Badge */}
            {selectedTask.projectName ? (
              <span className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <FolderKanban className="h-3 w-3" />
                {selectedTask.projectName}
              </span>
            ) : (
              <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
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
              className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
              onClick={() => deleteTask(selectedTask.id)}
              title="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Modal Body (2-column layout) */}
        <div className="grid max-h-[calc(88vh-60px)] flex-1 grid-cols-1 gap-7 overflow-y-auto p-6 lg:grid-cols-12">
          {/* Main Left Column (7 cols) */}
          <div className="flex flex-col gap-5 lg:col-span-7">
            {/* Title */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Task Title
              </label>
              <Input
                value={selectedTask.title}
                onChange={(e) =>
                  updateTask(selectedTask.id, { title: e.target.value })
                }
                className="h-auto rounded-xl border-border/60 bg-muted/20 px-3 py-2 text-sm font-bold shadow-none focus:border-primary"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Description & Technical Context
              </label>
              <Textarea
                value={selectedTask.description}
                onChange={(e) =>
                  updateTask(selectedTask.id, { description: e.target.value })
                }
                rows={5}
                className="resize-none rounded-xl border-border/60 bg-muted/20 font-mono text-xs leading-relaxed"
                placeholder="Add rich descriptions, acceptance criteria..."
              />
            </div>

            {/* Custom Fields (Dynamic metadata per project/domain) */}
            {selectedTask.customFields &&
              selectedTask.customFields.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">
                    Project Custom Fields
                  </span>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {selectedTask.customFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex flex-col gap-1 text-xs"
                      >
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {field.name}
                        </span>
                        {field.type === "URL" ? (
                          <a
                            href={String(field.value)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 truncate rounded bg-muted/40 p-1.5 text-xs text-primary hover:underline"
                          >
                            <span className="truncate">
                              {String(field.value)}
                            </span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="rounded bg-muted/40 p-1.5 font-medium text-foreground">
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
            <div className="border-t border-border/40 pt-2">
              <TaskComments
                taskId={selectedTask.id}
                comments={selectedTask.comments}
              />
            </div>
          </div>

          {/* Right Sidebar Metadata Column (5 cols) */}
          <div className="flex flex-col gap-4 border-t border-border/40 pt-4 pl-0 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            {/* Status (Dynamic from Active Workflow) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Status
              </label>
              <Select
                value={selectedTask.status}
                onValueChange={(val) => {
                  if (val !== null) moveTaskStatus(selectedTask.id, val)
                }}
              >
                <SelectTrigger className="h-9 bg-muted/30 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeStatuses.map((s) => (
                    <SelectItem key={s.key} value={s.key} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
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
                    moveTaskSprint(
                      selectedTask.id,
                      val === "BACKLOG" ? null : val
                    )
                  }
                }}
              >
                <SelectTrigger className="h-9 bg-muted/30 text-xs">
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
              <label className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase">
                <span>Story Points Estimation</span>
                <span className="font-bold text-primary">
                  {selectedTask.storyPoints || 0} pts
                </span>
              </label>
              <div className="flex items-center gap-1.5">
                {FIBONACCI_POINTS.map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() =>
                      updateTask(selectedTask.id, { storyPoints: pts })
                    }
                    className={`flex-1 cursor-pointer rounded-lg border py-1 text-xs font-bold transition-all ${
                      selectedTask.storyPoints === pts
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
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
                  if (val !== null)
                    updateTask(selectedTask.id, {
                      priority: val as TaskPriorityKey,
                    })
                }}
              >
                <SelectTrigger className="h-9 bg-muted/30 text-xs">
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
                    const user = assignees.find((a) => a.id === val) || null
                    updateTask(selectedTask.id, { assignee: user })
                  }
                }}
              >
                <SelectTrigger className="h-9 bg-muted/30 text-xs">
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
  )
}
