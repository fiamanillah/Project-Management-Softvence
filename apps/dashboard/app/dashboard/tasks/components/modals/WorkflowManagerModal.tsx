"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useTaskStore } from "../../data/task-store";
import {
  GitFork,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import type { StatusCategory, TaskStatusConfig } from "../../types";

export function WorkflowManagerModal() {
  const {
    workflowManagerModalOpen,
    setWorkflowManagerModalOpen,
    workflows,
    activeWorkflowId,
    setActiveWorkflowId,
    activeWorkflow,
    addCustomStatus,
    deleteCustomStatus,
    reorderCustomStatuses,
  } = useTaskStore();

  const [isAdding, setIsAdding] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState("");
  const [newColor, setNewColor] = React.useState("#3b82f6");
  const [newCategory, setNewCategory] = React.useState<StatusCategory>("IN_PROGRESS");
  const [newWipLimit, setNewWipLimit] = React.useState("");

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const colorPalette = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#64748b",
    "#ef4444",
  ];

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderCustomStatuses(activeWorkflowId, draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderCustomStatuses(activeWorkflowId, index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < activeWorkflow.statuses.length - 1) {
      reorderCustomStatuses(activeWorkflowId, index, index + 1);
    }
  };

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const key = newLabel.trim().toUpperCase().replace(/\s+/g, "_");
    const wip = newWipLimit ? parseInt(newWipLimit) : undefined;

    addCustomStatus(activeWorkflowId, {
      key,
      label: newLabel.trim(),
      color: newColor,
      category: newCategory,
      isBacklog: newCategory === "BACKLOG",
      isInProgress: newCategory === "IN_PROGRESS",
      isReview: newCategory === "REVIEW_QA",
      isTerminal: newCategory === "COMPLETED" || newCategory === "ABANDONED",
      isSuccess: newCategory === "COMPLETED",
      wipLimit: wip,
    });

    setNewLabel("");
    setNewWipLimit("");
    setIsAdding(false);
  };

  return (
    <Dialog open={workflowManagerModalOpen} onOpenChange={setWorkflowManagerModalOpen}>
      <DialogContent className="w-[92vw] sm:max-w-2xl bg-background border border-border/80 rounded-2xl shadow-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <GitFork className="h-5 w-5 text-primary" />
            Task Workflow & Status Lifecycle Manager
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Workflow Scheme Switcher */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">
              Active Workflow Scheme
            </label>
            <Select
              value={activeWorkflowId}
              onValueChange={(val) => {
                if (val !== null) setActiveWorkflowId(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
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
            <p className="text-[11px] text-muted-foreground">
              {activeWorkflow.description}
            </p>
          </div>

          {/* Status Columns List with Drag and Drop */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground">
                  Workflow Columns & Lifecycle Order ({activeWorkflow.statuses.length})
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Drag and drop the rows to reorder board columns and transition sequence.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(!isAdding)}
                className="h-7 text-xs gap-1 border-dashed shrink-0"
              >
                <Plus className="h-3 w-3" />
                <span>Add Custom Status</span>
              </Button>
            </div>

            <div className="flex flex-col divide-y divide-border/40 rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
              {activeWorkflow.statuses.map((st, idx) => {
                const isDraggingThis = draggedIndex === idx;
                const isOverThis = dragOverIndex === idx;

                return (
                  <div
                    key={st.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`flex items-center justify-between p-2.5 px-3 text-xs transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
                      isDraggingThis
                        ? "opacity-30 bg-primary/10 border-dashed border-2 border-primary"
                        : isOverThis
                        ? "bg-primary/15 border-t-2 border-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {/* Left: Drag Handle, Number, Dot, Label & Category */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-muted-foreground hover:text-foreground cursor-grab">
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <span className="font-mono text-[10px] font-bold text-muted-foreground w-4 text-center">
                        #{idx + 1}
                      </span>
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: st.color }}
                      />
                      <span className="font-bold text-foreground truncate max-w-[160px]">
                        {st.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 h-4.5">
                        {st.category}
                      </Badge>
                      {st.wipLimit && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          WIP: {st.wipLimit}
                        </span>
                      )}
                    </div>

                    {/* Right: Up/Down Buttons & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveUp(idx);
                        }}
                        disabled={idx === 0}
                        title="Move Up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveDown(idx);
                        }}
                        disabled={idx === activeWorkflow.statuses.length - 1}
                        title="Move Down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>

                      {activeWorkflow.statuses.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive ml-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomStatus(activeWorkflowId, st.key);
                          }}
                          title="Delete status"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Status Form */}
          {isAdding && (
            <form
              onSubmit={handleAddStatus}
              className="flex flex-col gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5"
            >
              <span className="text-xs font-bold text-primary">
                New Dynamic Status Column
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-foreground">
                    Status Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. Client Sign-Off, Staging QA"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="h-8 text-xs bg-background"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    Category (Behavior)
                  </label>
                  <Select
                    value={newCategory}
                    onValueChange={(val) => {
                      if (val !== null) setNewCategory(val as StatusCategory);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BACKLOG">Backlog Phase</SelectItem>
                      <SelectItem value="UNSTARTED">To Do Phase</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="REVIEW_QA">Review / QA</SelectItem>
                      <SelectItem value="COMPLETED">Completed / Terminal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Color palette */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-foreground">
                  Badge Color:
                </span>
                <div className="flex items-center gap-1.5">
                  {colorPalette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`h-5 w-5 rounded-full border transition-transform ${
                        newColor === c ? "scale-125 ring-2 ring-primary ring-offset-1" : "opacity-80"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-7 text-xs px-3 bg-primary hover:bg-primary/90 text-primary-foreground">
                  Save Status
                </Button>
              </div>
            </form>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWorkflowManagerModalOpen(false)}
              className="h-8 text-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
