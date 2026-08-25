"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
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
  CheckCircle2,
  Shield,
  Workflow,
  ArrowRight,
  Info,
} from "lucide-react";
import type { StatusCategory, TaskStatusConfig } from "../../types";

export function WorkflowSchemesView() {
  const {
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

  const handleCreateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const statusKey = newLabel.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");

    const wip = newWipLimit ? parseInt(newWipLimit, 10) : undefined;

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
    });

    setNewLabel("");
    setNewWipLimit("");
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" /> Dynamic Workflow Schemes & Status Lifecycle
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure custom stage pipelines, WIP constraints, and behavioral flags for different departments and squads.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAdding(true)}
          className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Custom Stage</span>
        </Button>
      </div>

      {/* Scheme Selection Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col gap-4">
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <GitFork className="h-4 w-4 text-primary" /> Active Workflow Scheme
              </CardTitle>
              <CardDescription className="text-xs">
                Select a predefined domain template or custom scheme.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {workflows.map((wf) => {
                const isSelected = wf.id === activeWorkflowId;
                return (
                  <button
                    key={wf.id}
                    onClick={() => setActiveWorkflowId(wf.id)}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                        : "border-border/60 hover:bg-muted/40 hover:border-border"
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
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                      {wf.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[9px] uppercase font-semibold">
                        {wf.domain}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {wf.statuses.length} stages
                      </span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Architectural Invariant Box */}
          <div className="flex items-start gap-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 text-xs text-blue-900 dark:text-blue-200">
            <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
            <div className="flex flex-col gap-1 text-[11px]">
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                Rule BE-11 & BE-12 Compliant:
              </span>
              <span>
                Stages evaluate behavioral flags (<code>isTerminal</code>, <code>isReview</code>, <code>isInProgress</code>) dynamically without hardcoding status strings in core services.
              </span>
            </div>
          </div>
        </div>

        {/* Status Pipeline Designer */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <Card className="border-border/80">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">
                  {activeWorkflow.name} Pipeline Order
                </CardTitle>
                <CardDescription className="text-xs">
                  Drag and drop to reorder column order in Kanban and sprint boards.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-mono">
                {activeWorkflow.statuses.length} Columns
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {activeWorkflow.statuses.map((status, index) => {
                const isOver = dragOverIndex === index;
                const isDragging = draggedIndex === index;

                return (
                  <div
                    key={status.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex items-center justify-between rounded-xl border p-3 bg-card transition-all ${
                      isDragging
                        ? "opacity-40 border-dashed border-primary"
                        : isOver
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border/70 hover:border-border hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab text-muted-foreground/60 hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>

                      <div
                        className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: status.color }}
                      />

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {status.label}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/80">
                            ({status.key})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-[9px] uppercase font-semibold h-4 px-1.5"
                          >
                            {status.category}
                          </Badge>
                          {status.wipLimit && (
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 px-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400"
                            >
                              WIP Limit: {status.wipLimit}
                            </Badge>
                          )}
                          {status.isTerminal && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              • Terminal State
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Move Up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === activeWorkflow.statuses.length - 1}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Move Down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCustomStatus(activeWorkflowId, status.key)}
                        disabled={activeWorkflow.statuses.length <= 2}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-20"
                        title="Delete status"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Add Status Form */}
              {isAdding && (
                <form
                  onSubmit={handleCreateStatus}
                  className="flex flex-col gap-3.5 rounded-xl border border-primary/40 bg-primary/5 p-4 mt-2"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">
                        Stage Name
                      </label>
                      <Input
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="e.g. Design Review, Staging QA"
                        className="h-8 text-xs bg-background"
                        autoFocus
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">
                        Category Classification
                      </label>
                      <Select
                        value={newCategory}
                        onValueChange={(val) => setNewCategory(val as StatusCategory)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BACKLOG">Backlog</SelectItem>
                          <SelectItem value="UNSTARTED">Unstarted / Ready</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="REVIEW_QA">Review & QA</SelectItem>
                          <SelectItem value="COMPLETED">Completed (Done)</SelectItem>
                          <SelectItem value="ABANDONED">Abandoned / Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">
                        WIP Limit (Optional)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={newWipLimit}
                        onChange={(e) => setNewWipLimit(e.target.value)}
                        placeholder="e.g. 5"
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">
                        Stage Accent Color
                      </label>
                      <div className="flex items-center gap-1.5">
                        {colorPalette.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewColor(color)}
                            className={`h-6 w-6 rounded-full transition-transform ${
                              newColor === color
                                ? "ring-2 ring-primary ring-offset-2 scale-110"
                                : "opacity-80 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8 text-xs bg-primary text-primary-foreground"
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
    </div>
  );
}
