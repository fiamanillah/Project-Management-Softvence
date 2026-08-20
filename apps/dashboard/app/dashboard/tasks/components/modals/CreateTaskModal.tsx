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
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useTaskStore } from "../../data/task-store";
import { TASK_TYPES, TASK_PRIORITIES } from "../../data/mock-tasks";
import type { TaskTypeKey, TaskPriorityKey, TaskAnchorType } from "../../types";
import { Building2, FolderKanban, User, Plus } from "lucide-react";

export function CreateTaskModal() {
  const {
    createTaskModalOpen,
    setCreateTaskModalOpen,
    createTask,
    departments,
    teams,
    projects,
    epics,
    assignees,
    workflows,
    activeWorkflowId,
    activeSprint,
  } = useTaskStore();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [anchorType, setAnchorType] = React.useState<TaskAnchorType>("PROJECT");
  const [departmentId, setDepartmentId] = React.useState<string>(departments[0]?.id || "dept-eng");
  const [teamId, setTeamId] = React.useState<string>("team-web");
  const [projectId, setProjectId] = React.useState<string>("proj-1");
  const [componentId, setComponentId] = React.useState<string>("NONE");
  const [workflowId, setWorkflowId] = React.useState<string>(activeWorkflowId);
  const [taskType, setTaskType] = React.useState<TaskTypeKey>("STORY");
  const [priority, setPriority] = React.useState<TaskPriorityKey>("MEDIUM");
  const [storyPoints, setStoryPoints] = React.useState<number>(3);
  const [estimatedHours, setEstimatedHours] = React.useState<number>(8);
  const [assigneeId, setAssigneeId] = React.useState<string>("UNASSIGNED");

  // Reset when modal opens
  React.useEffect(() => {
    if (createTaskModalOpen) {
      setTitle("");
      setDescription("");
      setAnchorType("PROJECT");
      setDepartmentId(departments[0]?.id || "dept-eng");
      setTeamId("team-web");
      setProjectId("proj-1");
      setComponentId("NONE");
      setWorkflowId(activeWorkflowId);
      setTaskType("STORY");
      setPriority("MEDIUM");
      setStoryPoints(3);
      setEstimatedHours(8);
      setAssigneeId("UNASSIGNED");
    }
  }, [createTaskModalOpen, departments, activeWorkflowId]);

  const availableTeams = React.useMemo(() => {
    return teams.filter((t) => t.departmentId === departmentId);
  }, [teams, departmentId]);

  const availableEpics = React.useMemo(() => {
    return epics.filter((e) => e.projectId === projectId || e.departmentId === departmentId);
  }, [epics, projectId, departmentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const dept = departments.find((d) => d.id === departmentId) || departments[0]!;
    const team = teams.find((t) => t.id === teamId);
    const proj = anchorType === "PROJECT" ? projects.find((p) => p.id === projectId) : null;
    const epic = availableEpics.find((e) => e.id === componentId);
    const assignee = assignees.find((a) => a.id === assigneeId) || null;

    createTask({
      title: title.trim(),
      description: description.trim(),
      anchorType,
      departmentId: dept.id,
      departmentName: dept.name,
      teamId: team ? team.id : null,
      teamName: team ? team.name : undefined,
      projectId: proj ? proj.id : null,
      projectName: proj ? proj.name : undefined,
      componentId: epic ? epic.id : null,
      componentName: epic ? epic.name : undefined,
      componentColor: epic ? epic.color : dept.color,
      workflowId,
      taskType,
      priority,
      storyPoints,
      estimatedHours,
      assignee,
      isPrivate: anchorType === "PERSONAL",
    });

    setCreateTaskModalOpen(false);
  };

  const fibonacciPoints = [1, 2, 3, 5, 8, 13];

  return (
    <Dialog open={createTaskModalOpen} onOpenChange={setCreateTaskModalOpen}>
      <DialogContent className="w-[90vw] sm:max-w-2xl bg-background border border-border/80 rounded-2xl shadow-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Create Work Item / Agile Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Scope Selector: Project vs Department/Team vs Personal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">
              Work Item Anchor
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAnchorType("PROJECT")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                  anchorType === "PROJECT"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/30 border-border/70 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <FolderKanban className="h-3.5 w-3.5" />
                <span>Project Deliverable</span>
              </button>

              <button
                type="button"
                onClick={() => setAnchorType("DEPARTMENT_TEAM")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                  anchorType === "DEPARTMENT_TEAM"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/30 border-border/70 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Department / Internal</span>
              </button>

              <button
                type="button"
                onClick={() => setAnchorType("PERSONAL")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all ${
                  anchorType === "PERSONAL"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/30 border-border/70 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Personal To-Do</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">
              Task Title <span className="text-destructive">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Build multi-currency payment checkout modal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs bg-background"
              autoFocus
            />
          </div>

          {/* Hierarchy Fields: Department, Team, Project */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Department */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Department
              </label>
              <Select
                value={departmentId}
                onValueChange={(val) => {
                  if (val !== null) setDepartmentId(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Team Squad
              </label>
              <Select
                value={teamId}
                onValueChange={(val) => {
                  if (val !== null) setTeamId(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project (if Anchor is Project) */}
            {anchorType === "PROJECT" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Project
                </label>
                <Select
                  value={projectId}
                  onValueChange={(val) => {
                    if (val !== null) setProjectId(val);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Workflow Scheme
                </label>
                <Select
                  value={workflowId}
                  onValueChange={(val) => {
                    if (val !== null) setWorkflowId(val);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((wf) => (
                      <SelectItem key={wf.id} value={wf.id} className="text-xs">
                        {wf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Type, Priority, Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Work Item Type
              </label>
              <Select
                value={taskType}
                onValueChange={(val) => {
                  if (val !== null) setTaskType(val as TaskTypeKey);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">
                Priority
              </label>
              <Select
                value={priority}
                onValueChange={(val) => {
                  if (val !== null) setPriority(val as TaskPriorityKey);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
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
                value={assigneeId}
                onValueChange={(val) => {
                  if (val !== null) setAssigneeId(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
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
          </div>

          {/* Story Points */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              <span>Story Points Estimation</span>
              <span className="text-primary font-bold">{storyPoints} pts</span>
            </label>
            <div className="flex items-center gap-1.5">
              {fibonacciPoints.map((pts) => (
                <button
                  key={pts}
                  type="button"
                  onClick={() => setStoryPoints(pts)}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all ${
                    storyPoints === pts
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/30 text-muted-foreground border-border/60 hover:bg-muted"
                  }`}
                >
                  {pts}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">
              Description & Acceptance Criteria
            </label>
            <Textarea
              placeholder="Provide background, technical specs, and acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-xs bg-background resize-none leading-relaxed"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateTaskModalOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
            >
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
