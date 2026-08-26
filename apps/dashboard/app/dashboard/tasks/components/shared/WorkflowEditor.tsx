"use client"

import * as React from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useTaskStore } from "../../data/task-store"
import {
  GitFork,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
} from "lucide-react"
import type { StatusCategory, TaskStatusConfig } from "../../types"

const COLOR_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#64748b",
  "#ef4444",
]

interface WorkflowEditorProps {
  showSchemeSelector?: boolean
}

export function WorkflowEditor({
  showSchemeSelector = true,
}: WorkflowEditorProps) {
  const {
    workflows,
    activeWorkflowId,
    setActiveWorkflowId,
    activeWorkflow,
    addCustomStatus,
    deleteCustomStatus,
    reorderCustomStatuses,
  } = useTaskStore()

  const [isAdding, setIsAdding] = React.useState(false)
  const [newLabel, setNewLabel] = React.useState("")
  const [newColor, setNewColor] = React.useState("#3b82f6")
  const [newCategory, setNewCategory] =
    React.useState<StatusCategory>("IN_PROGRESS")
  const [newWipLimit, setNewWipLimit] = React.useState("")

  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverIndex !== index) setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderCustomStatuses(activeWorkflowId, draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target >= 0 && target < activeWorkflow.statuses.length) {
      reorderCustomStatuses(activeWorkflowId, index, target)
    }
  }

  const handleCreateStatus = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLabel.trim()) return

    const statusKey = newLabel
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "")
    const wip = newWipLimit ? parseInt(newWipLimit, 10) : undefined

    addCustomStatus(activeWorkflowId, {
      key: statusKey,
      label: newLabel.trim(),
      color: newColor,
      category: newCategory,
      isBacklog: newCategory === "BACKLOG",
      isInProgress: newCategory === "IN_PROGRESS",
      isReview: newCategory === "REVIEW_QA",
      isTerminal: newCategory === "COMPLETED" || newCategory === "ABANDONED",
      isSuccess: newCategory === "COMPLETED",
      wipLimit: wip && !isNaN(wip) && wip > 0 ? wip : undefined,
    })

    setNewLabel("")
    setNewWipLimit("")
    setIsAdding(false)
  }

  return (
    <div
      className={`grid grid-cols-1 ${showSchemeSelector ? "md:grid-cols-3" : "grid-cols-1"} gap-6`}
    >
      {/* Optional Scheme Selection Sidebar */}
      {showSchemeSelector && (
        <div className="flex flex-col gap-4 md:col-span-1">
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <GitFork className="h-4 w-4 text-primary" /> Active Workflow
                Scheme
              </CardTitle>
              <CardDescription className="text-xs">
                Select a predefined domain template or custom scheme.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {workflows.map((wf) => {
                const isSelected = wf.id === activeWorkflowId
                return (
                  <button
                    key={wf.id}
                    onClick={() => setActiveWorkflowId(wf.id)}
                    className={`flex cursor-pointer flex-col rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                        : "border-border/60 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {wf.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {wf.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-semibold uppercase"
                      >
                        {wf.domain}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {wf.statuses.length} stages
                      </span>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Pipeline Order & Drag-and-Drop Designer */}
      <div
        className={
          showSchemeSelector
            ? "flex flex-col gap-4 md:col-span-2"
            : "flex flex-col gap-4"
        }
      >
        {!showSchemeSelector && (
          <div className="flex flex-col gap-1.5 pb-1">
            <label className="text-xs font-bold text-foreground">
              Active Workflow Scheme
            </label>
            <Select
              value={activeWorkflowId}
              onValueChange={(val) => {
                if (val !== null) setActiveWorkflowId(val)
              }}
            >
              <SelectTrigger className="h-9 bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workflows.map((wf) => (
                  <SelectItem key={wf.id} value={wf.id} className="text-xs">
                    <span className="font-semibold">{wf.name}</span>{" "}
                    <span className="text-[10px] text-muted-foreground">
                      ({wf.domain} • {wf.statuses.length} columns)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold">
                {activeWorkflow.name} Pipeline Order
              </CardTitle>
              <CardDescription className="text-xs">
                Drag and drop to reorder column order in Kanban and sprint
                boards.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(!isAdding)}
              className="h-7 shrink-0 gap-1 border-dashed text-xs"
            >
              <Plus className="h-3 w-3" />
              <span>Add Stage</span>
            </Button>
          </CardHeader>

          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-col divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/10">
              {activeWorkflow.statuses.map((status, index) => {
                const isOver = dragOverIndex === index
                const isDragging = draggedIndex === index

                return (
                  <div
                    key={status.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex cursor-grab items-center justify-between p-2.5 px-3 text-xs transition-all duration-150 select-none active:cursor-grabbing ${
                      isDragging
                        ? "border-2 border-dashed border-primary bg-primary/10 opacity-30"
                        : isOver
                          ? "border-t-2 border-primary bg-primary/15"
                          : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="cursor-grab text-muted-foreground/60 hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <span className="w-4 text-center font-mono text-[10px] font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span
                        className="h-3 w-3 shrink-0 rounded-full shadow-2xs"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="max-w-[160px] truncate font-bold text-foreground">
                        {status.label}
                      </span>
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 text-[9px] font-semibold uppercase"
                      >
                        {status.category}
                      </Badge>
                      {status.wipLimit && (
                        <Badge
                          variant="outline"
                          className="h-4 border-amber-500/40 px-1.5 text-[9px] text-amber-600 dark:text-amber-400"
                        >
                          WIP: {status.wipLimit}
                        </Badge>
                      )}
                      {status.isTerminal && (
                        <span className="hidden text-[10px] font-medium text-emerald-600 sm:inline dark:text-emerald-400">
                          • Terminal
                        </span>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMove(index, -1)}
                        disabled={index === 0}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-20"
                        title="Move Up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMove(index, 1)}
                        disabled={index === activeWorkflow.statuses.length - 1}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-20"
                        title="Move Down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      {activeWorkflow.statuses.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            deleteCustomStatus(activeWorkflowId, status.key)
                          }
                          className="ml-0.5 h-6 w-6 text-muted-foreground hover:text-destructive"
                          title="Delete status"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add Status Inline Form */}
            {isAdding && (
              <form
                onSubmit={handleCreateStatus}
                className="mt-2 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    New Lifecycle Stage
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdding(false)}
                    className="h-6 text-[10px]"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
                      Stage Name
                    </label>
                    <Input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. Design Review, Staging QA"
                      className="h-8 bg-background text-xs"
                      autoFocus
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
                      Category Classification
                    </label>
                    <Select
                      value={newCategory}
                      onValueChange={(val) => {
                        if (val !== null) setNewCategory(val as StatusCategory)
                      }}
                    >
                      <SelectTrigger className="h-8 bg-background text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BACKLOG">Backlog</SelectItem>
                        <SelectItem value="UNSTARTED">
                          Unstarted / Ready
                        </SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="REVIEW_QA">Review & QA</SelectItem>
                        <SelectItem value="COMPLETED">
                          Completed (Done)
                        </SelectItem>
                        <SelectItem value="ABANDONED">
                          Abandoned / Cancelled
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
                      WIP Limit (Optional)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={newWipLimit}
                      onChange={(e) => setNewWipLimit(e.target.value)}
                      placeholder="e.g. 5"
                      className="h-8 bg-background text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
                      Stage Accent Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      {COLOR_PALETTE.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewColor(color)}
                          className={`h-5 w-5 cursor-pointer rounded-full transition-transform ${
                            newColor === color
                              ? "scale-110 ring-2 ring-primary ring-offset-2"
                              : "opacity-75 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-7 bg-primary px-3 text-xs font-semibold text-primary-foreground"
                  >
                    Save Stage
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
