"use client";

import * as React from "react";
import type {
  Branch,
  Department,
  Team,
  AgileTask,
  Sprint,
  AgileEpicComponent,
  TaskAssignee,
  TaskFilterState,
  AgileViewMode,
  TaskStatusConfig,
  TaskWorkflow,
  WorkLog,
  TaskComment,
  TaskChecklistItem,
} from "../types";
import {
  MOCK_BRANCHES,
  MOCK_DEPARTMENTS,
  MOCK_TEAMS,
  MOCK_WORKFLOWS,
  MOCK_PROJECTS,
  MOCK_EPICS,
  MOCK_SPRINTS,
  INITIAL_MOCK_TASKS,
  MOCK_ASSIGNEES,
  CURRENT_USER,
} from "./mock-tasks";
import { toast } from "sonner";

interface TaskContextType {
  branches: Branch[];
  departments: Department[];
  teams: Team[];
  projects: typeof MOCK_PROJECTS;
  epics: AgileEpicComponent[];
  assignees: TaskAssignee[];
  currentUser: TaskAssignee;

  workflows: TaskWorkflow[];
  activeWorkflowId: string;
  setActiveWorkflowId: (id: string) => void;
  activeWorkflow: TaskWorkflow;
  activeStatuses: TaskStatusConfig[];

  tasks: AgileTask[];
  sprints: Sprint[];

  viewMode: AgileViewMode;
  setViewMode: (mode: AgileViewMode) => void;

  filterState: TaskFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<TaskFilterState>>;
  resetFilters: () => void;

  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedTask: AgileTask | null;

  // Modals
  createTaskModalOpen: boolean;
  setCreateTaskModalOpen: (open: boolean) => void;
  createSprintModalOpen: boolean;
  setCreateSprintModalOpen: (open: boolean) => void;
  completeSprintModalOpen: boolean;
  setCompleteSprintModalOpen: (open: boolean) => void;
  workflowManagerModalOpen: boolean;
  setWorkflowManagerModalOpen: (open: boolean) => void;
  activeSprintForCompletion: Sprint | null;
  setActiveSprintForCompletion: (sprint: Sprint | null) => void;

  // Task Actions
  createTask: (data: Partial<AgileTask>) => AgileTask;
  updateTask: (taskId: string, updates: Partial<AgileTask>) => void;
  deleteTask: (taskId: string) => void;
  moveTaskStatus: (taskId: string, newStatus: string) => void;
  moveTaskSprint: (taskId: string, newSprintId: string | null) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addChecklistItem: (taskId: string, title: string) => void;
  removeChecklistItem: (taskId: string, itemId: string) => void;
  addComment: (taskId: string, content: string) => void;
  addWorkLog: (taskId: string, log: { hoursSpent: number; description: string; date: string }) => void;

  // Sprint Actions
  createSprint: (data: { name: string; goal?: string; startDate: string; endDate: string; projectId?: string; departmentId?: string }) => Sprint;
  startSprint: (sprintId: string) => void;
  completeSprint: (sprintId: string, targetSprintId: string | null) => void;

  // Dynamic Workflow & Status CRUD
  addCustomStatus: (workflowId: string, status: Omit<TaskStatusConfig, "orderIndex">) => void;
  updateCustomStatus: (workflowId: string, statusKey: string, updates: Partial<TaskStatusConfig>) => void;
  deleteCustomStatus: (workflowId: string, statusKey: string) => void;
  reorderCustomStatuses: (workflowId: string, sourceIndex: number, destinationIndex: number) => void;
  setWorkflowStatuses: (workflowId: string, newStatuses: TaskStatusConfig[]) => void;
  createWorkflowScheme: (data: Omit<TaskWorkflow, "id">) => TaskWorkflow;

  resetToMockData: () => void;
  filteredTasks: AgileTask[];
  activeSprint: Sprint | null;
}

const defaultFilters: TaskFilterState = {
  search: "",
  scopeType: "ALL",
  departmentId: "ALL",
  teamId: "ALL",
  projectId: "ALL",
  sprintId: "ALL",
  workflowId: "ALL",
  epicId: "ALL",
  assigneeId: "ALL",
  priority: "ALL",
  taskType: "ALL",
  status: "ALL",
  tag: "ALL",
  swimlane: "NONE",
  cardDensity: "STANDARD",
  hideEmptyGroups: false,
};

const TaskContext = React.createContext<TaskContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TASKS: "softvence_agile_tasks_v2",
  SPRINTS: "softvence_agile_sprints_v2",
  WORKFLOWS: "softvence_agile_workflows_v2",
} as const;

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    console.error(`Failed to load ${key} from storage`, e);
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key} to storage`, e);
  }
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = React.useState<AgileTask[]>(() =>
    loadFromStorage(STORAGE_KEYS.TASKS, INITIAL_MOCK_TASKS)
  );
  const [sprints, setSprints] = React.useState<Sprint[]>(() =>
    loadFromStorage(STORAGE_KEYS.SPRINTS, MOCK_SPRINTS)
  );
  const [workflows, setWorkflows] = React.useState<TaskWorkflow[]>(() =>
    loadFromStorage(STORAGE_KEYS.WORKFLOWS, MOCK_WORKFLOWS)
  );

  const [activeWorkflowId, setActiveWorkflowId] = React.useState<string>("wf-software");
  const [viewMode, setViewMode] = React.useState<AgileViewMode>("BOARD");
  const [filterState, setFilterState] = React.useState<TaskFilterState>(defaultFilters);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);

  const [createTaskModalOpen, setCreateTaskModalOpen] = React.useState(false);
  const [createSprintModalOpen, setCreateSprintModalOpen] = React.useState(false);
  const [completeSprintModalOpen, setCompleteSprintModalOpen] = React.useState(false);
  const [workflowManagerModalOpen, setWorkflowManagerModalOpen] = React.useState(false);
  const [activeSprintForCompletion, setActiveSprintForCompletion] = React.useState<Sprint | null>(null);

  // Sync state with LocalStorage
  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.TASKS, tasks);
  }, [tasks]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.SPRINTS, sprints);
  }, [sprints]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.WORKFLOWS, workflows);
  }, [workflows]);

  const activeWorkflow = React.useMemo(() => {
    return workflows.find((w) => w.id === activeWorkflowId) ?? workflows[0]!;
  }, [workflows, activeWorkflowId]);

  const activeStatuses = React.useMemo(() => {
    return activeWorkflow.statuses;
  }, [activeWorkflow]);

  const resetFilters = React.useCallback(() => {
    setFilterState(defaultFilters);
  }, []);

  const resetToMockData = React.useCallback(() => {
    setTasks(INITIAL_MOCK_TASKS);
    setSprints(MOCK_SPRINTS);
    setWorkflows(MOCK_WORKFLOWS);
    setActiveWorkflowId("wf-software");
    setFilterState(defaultFilters);
    setSelectedTaskId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.TASKS);
      localStorage.removeItem(STORAGE_KEYS.SPRINTS);
      localStorage.removeItem(STORAGE_KEYS.WORKFLOWS);
    }
    toast.success("Reset to default organizational agile mock data!");
  }, []);

  const selectedTask = React.useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  const activeSprint = React.useMemo(() => {
    return sprints.find((s) => s.status === "ACTIVE") || null;
  }, [sprints]);

  // Hierarchical Filter logic (Declarative & Optimized)
  const filteredTasks = React.useMemo(() => {
    const searchLower = filterState.search.trim().toLowerCase();

    return tasks.filter((t) => {
      // 1. Full-text search
      if (searchLower) {
        const matches =
          t.key.toLowerCase().includes(searchLower) ||
          t.title.toLowerCase().includes(searchLower) ||
          t.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          (t.assignee && t.assignee.name.toLowerCase().includes(searchLower)) ||
          t.departmentName.toLowerCase().includes(searchLower) ||
          (t.projectName && t.projectName.toLowerCase().includes(searchLower));
        if (!matches) return false;
      }

      // 2. Scope Type
      if (filterState.scopeType === "PROJECT" && t.anchorType !== "PROJECT") return false;
      if (filterState.scopeType === "DEPARTMENT_TEAM" && t.anchorType !== "DEPARTMENT_TEAM") return false;
      if (filterState.scopeType === "PERSONAL" && t.anchorType !== "PERSONAL" && !t.isPrivate) return false;

      // 3. Hierarchy & Entity filters
      if (filterState.departmentId !== "ALL" && t.departmentId !== filterState.departmentId) return false;
      if (filterState.teamId !== "ALL" && t.teamId !== filterState.teamId) return false;

      if (filterState.projectId !== "ALL") {
        if (filterState.projectId === "STANDALONE") {
          if (t.projectId) return false;
        } else if (t.projectId !== filterState.projectId) {
          return false;
        }
      }

      if (filterState.workflowId !== "ALL" && t.workflowId !== filterState.workflowId) return false;

      if (filterState.sprintId !== "ALL") {
        if (filterState.sprintId === "BACKLOG") {
          if (t.sprintId !== null) return false;
        } else if (filterState.sprintId === "ACTIVE") {
          if (!activeSprint || t.sprintId !== activeSprint.id) return false;
        } else if (t.sprintId !== filterState.sprintId) {
          return false;
        }
      }

      if (filterState.epicId !== "ALL" && t.componentId !== filterState.epicId) return false;

      if (filterState.assigneeId !== "ALL") {
        if (filterState.assigneeId === "UNASSIGNED") {
          if (t.assignee) return false;
        } else if (filterState.assigneeId === "MY_TASKS") {
          if (t.assignee?.id !== CURRENT_USER.id) return false;
        } else if (t.assignee?.id !== filterState.assigneeId) {
          return false;
        }
      }

      if (filterState.priority !== "ALL" && t.priority !== filterState.priority) return false;
      if (filterState.taskType !== "ALL" && t.taskType !== filterState.taskType) return false;
      if (filterState.status !== "ALL" && t.status !== filterState.status) return false;
      if (filterState.tag !== "ALL" && !t.tags.includes(filterState.tag)) return false;

      return true;
    });
  }, [tasks, filterState, activeSprint]);

  // Helper for single-point immutable task updates
  const updateTaskById = React.useCallback((taskId: string, updater: (t: AgileTask) => AgileTask) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updated = updater(t);
        return {
          ...updated,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  // Actions
  const createTask = React.useCallback(
    (data: Partial<AgileTask>): AgileTask => {
      const dept = MOCK_DEPARTMENTS.find((d) => d.id === data.departmentId) || MOCK_DEPARTMENTS[0]!;
      const prefix = dept.code;
      const nextNum = 100 + tasks.length + 1;

      const newTask: AgileTask = {
        id: `task-${Date.now()}`,
        key: `${prefix}-${nextNum}`,
        anchorType: data.anchorType || (data.projectId ? "PROJECT" : "DEPARTMENT_TEAM"),
        departmentId: dept.id,
        departmentName: dept.name,
        teamId: data.teamId || null,
        teamName: data.teamName || undefined,
        projectId: data.projectId || null,
        projectName: data.projectName || undefined,
        componentId: data.componentId || null,
        componentName: data.componentName || undefined,
        componentColor: data.componentColor || dept.color,
        sprintId: data.sprintId !== undefined ? data.sprintId : (activeSprint?.id || null),
        workflowId: data.workflowId || activeWorkflow.id,
        status: data.status || activeWorkflow.statuses[1]?.key || "TODO",
        title: data.title || "New Task",
        description: data.description || "",
        taskType: data.taskType || "STORY",
        priority: data.priority || "MEDIUM",
        storyPoints: data.storyPoints ?? 3,
        estimatedHours: data.estimatedHours ?? 8,
        loggedHours: 0,
        isPrivate: data.isPrivate || false,
        assignee: data.assignee || null,
        reporter: CURRENT_USER,
        reviewer: data.reviewer || null,
        qaTester: data.qaTester || null,
        checklist: data.checklist || [],
        comments: [],
        workLogs: [],
        dependencies: [],
        customFields: data.customFields || [],
        tags: data.tags || ["agile"],
        startDate: data.startDate || new Date().toISOString().split("T")[0],
        dueDate: data.dueDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _capabilities: {
          canEdit: true,
          canDelete: true,
          canMove: true,
          canAssign: true,
          canEstimate: true,
          canLogWork: true,
        },
      };

      setTasks((prev) => [newTask, ...prev]);
      toast.success(`Task ${newTask.key} created!`);
      return newTask;
    },
    [tasks.length, activeSprint?.id, activeWorkflow.id, activeWorkflow.statuses]
  );

  const updateTask = React.useCallback(
    (taskId: string, updates: Partial<AgileTask>) => {
      updateTaskById(taskId, (t) => ({ ...t, ...updates }));
    },
    [updateTaskById]
  );

  const deleteTask = React.useCallback(
    (taskId: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTaskId === taskId) setSelectedTaskId(null);
      toast.info("Task deleted.");
    },
    [selectedTaskId]
  );

  const moveTaskStatus = React.useCallback(
    (taskId: string, newStatus: string) => {
      updateTaskById(taskId, (t) => ({ ...t, status: newStatus }));
    },
    [updateTaskById]
  );

  const moveTaskSprint = React.useCallback(
    (taskId: string, newSprintId: string | null) => {
      updateTaskById(taskId, (t) => ({
        ...t,
        sprintId: newSprintId,
        status: newSprintId === null ? "BACKLOG" : t.status === "BACKLOG" ? "TODO" : t.status,
      }));
      toast.success(newSprintId ? "Moved task to sprint!" : "Moved task to backlog!");
    },
    [updateTaskById]
  );

  const toggleChecklistItem = React.useCallback(
    (taskId: string, itemId: string) => {
      updateTaskById(taskId, (t) => ({
        ...t,
        checklist: t.checklist.map((item) =>
          item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
        ),
      }));
    },
    [updateTaskById]
  );

  const addChecklistItem = React.useCallback(
    (taskId: string, title: string) => {
      const newItem: TaskChecklistItem = {
        id: `chk-${Date.now()}`,
        title,
        isCompleted: false,
      };
      updateTaskById(taskId, (t) => ({
        ...t,
        checklist: [...t.checklist, newItem],
      }));
    },
    [updateTaskById]
  );

  const removeChecklistItem = React.useCallback(
    (taskId: string, itemId: string) => {
      updateTaskById(taskId, (t) => ({
        ...t,
        checklist: t.checklist.filter((item) => item.id !== itemId),
      }));
    },
    [updateTaskById]
  );

  const addComment = React.useCallback(
    (taskId: string, content: string) => {
      const newComment: TaskComment = {
        id: `com-${Date.now()}`,
        taskId,
        author: {
          id: CURRENT_USER.id,
          name: CURRENT_USER.name,
          avatar: CURRENT_USER.avatar,
          designation: CURRENT_USER.designation,
        },
        content,
        createdAt: new Date().toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      updateTaskById(taskId, (t) => ({
        ...t,
        comments: [...t.comments, newComment],
      }));
      toast.success("Comment posted!");
    },
    [updateTaskById]
  );

  const addWorkLog = React.useCallback(
    (taskId: string, log: { hoursSpent: number; description: string; date: string }) => {
      const newLog: WorkLog = {
        id: `wl-${Date.now()}`,
        taskId,
        userId: CURRENT_USER.id,
        userName: CURRENT_USER.name,
        userAvatar: CURRENT_USER.avatar,
        hoursSpent: log.hoursSpent,
        description: log.description,
        date: log.date,
        createdAt: new Date().toISOString(),
      };
      updateTaskById(taskId, (t) => ({
        ...t,
        loggedHours: (t.loggedHours || 0) + log.hoursSpent,
        workLogs: [newLog, ...t.workLogs],
      }));
      toast.success(`Logged ${log.hoursSpent}h of work!`);
    },
    [updateTaskById]
  );

  const createSprint = React.useCallback(
    (data: { name: string; goal?: string; startDate: string; endDate: string; projectId?: string; departmentId?: string }): Sprint => {
      const newSprint: Sprint = {
        id: `sprint-${Date.now()}`,
        projectId: data.projectId || "proj-1",
        departmentId: data.departmentId || "dept-eng",
        name: data.name,
        goal: data.goal,
        status: "PLANNED",
        startDate: data.startDate,
        endDate: data.endDate,
        totalStoryPoints: 0,
        completedStoryPoints: 0,
        createdAt: new Date().toISOString(),
      };
      setSprints((prev) => [newSprint, ...prev]);
      toast.success(`Sprint "${newSprint.name}" created!`);
      return newSprint;
    },
    []
  );

  const startSprint = React.useCallback((sprintId: string) => {
    setSprints((prev) =>
      prev.map((s) => (s.id === sprintId ? { ...s, status: "ACTIVE" } : s))
    );
    toast.success("Sprint started and active!");
  }, []);

  const completeSprint = React.useCallback((sprintId: string, targetSprintId: string | null) => {
    setSprints((prev) =>
      prev.map((s) => (s.id === sprintId ? { ...s, status: "COMPLETED" } : s))
    );

    setTasks((prev) =>
      prev.map((t) => {
        if (t.sprintId === sprintId && t.status !== "DONE") {
          return {
            ...t,
            sprintId: targetSprintId,
            status: targetSprintId === null ? "BACKLOG" : t.status,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    toast.success("Sprint completed! Incomplete tasks rolled over.");
  }, []);

  // Dynamic Workflow Status Management
  const addCustomStatus = React.useCallback(
    (workflowId: string, status: Omit<TaskStatusConfig, "orderIndex">) => {
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          const nextOrder = wf.statuses.length;
          return {
            ...wf,
            statuses: [...wf.statuses, { ...status, orderIndex: nextOrder }],
          };
        })
      );
      toast.success(`Status "${status.label}" added to workflow!`);
    },
    []
  );

  const updateCustomStatus = React.useCallback(
    (workflowId: string, statusKey: string, updates: Partial<TaskStatusConfig>) => {
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          return {
            ...wf,
            statuses: wf.statuses.map((s) => (s.key === statusKey ? { ...s, ...updates } : s)),
          };
        })
      );
      toast.success("Status updated!");
    },
    []
  );

  const deleteCustomStatus = React.useCallback(
    (workflowId: string, statusKey: string) => {
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          return {
            ...wf,
            statuses: wf.statuses.filter((s) => s.key !== statusKey),
          };
        })
      );
      toast.info("Status removed from workflow.");
    },
    []
  );

  const reorderCustomStatuses = React.useCallback(
    (workflowId: string, sourceIndex: number, destinationIndex: number) => {
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          const updated = Array.from(wf.statuses);
          const [moved] = updated.splice(sourceIndex, 1);
          if (moved) updated.splice(destinationIndex, 0, moved);
          return {
            ...wf,
            statuses: updated.map((s, idx) => ({ ...s, orderIndex: idx })),
          };
        })
      );
    },
    []
  );

  const setWorkflowStatuses = React.useCallback(
    (workflowId: string, newStatuses: TaskStatusConfig[]) => {
      const reindexed = newStatuses.map((s, idx) => ({ ...s, orderIndex: idx }));
      setWorkflows((prev) =>
        prev.map((wf) => (wf.id === workflowId ? { ...wf, statuses: reindexed } : wf))
      );
    },
    []
  );

  const createWorkflowScheme = React.useCallback(
    (data: Omit<TaskWorkflow, "id">): TaskWorkflow => {
      const newWorkflow: TaskWorkflow = {
        id: `wf-${Date.now()}`,
        name: data.name,
        description: data.description,
        domain: data.domain,
        isDefault: false,
        statuses: data.statuses,
      };
      setWorkflows((prev) => [...prev, newWorkflow]);
      toast.success(`Workflow "${newWorkflow.name}" created!`);
      return newWorkflow;
    },
    []
  );

  return (
    <TaskContext.Provider
      value={{
        branches: MOCK_BRANCHES,
        departments: MOCK_DEPARTMENTS,
        teams: MOCK_TEAMS,
        projects: MOCK_PROJECTS,
        epics: MOCK_EPICS,
        assignees: MOCK_ASSIGNEES,
        currentUser: CURRENT_USER,
        workflows,
        activeWorkflowId,
        setActiveWorkflowId,
        activeWorkflow,
        activeStatuses,
        tasks,
        sprints,
        viewMode,
        setViewMode,
        filterState,
        setFilterState,
        resetFilters,
        selectedTaskId,
        setSelectedTaskId,
        selectedTask,
        createTaskModalOpen,
        setCreateTaskModalOpen,
        createSprintModalOpen,
        setCreateSprintModalOpen,
        completeSprintModalOpen,
        setCompleteSprintModalOpen,
        workflowManagerModalOpen,
        setWorkflowManagerModalOpen,
        activeSprintForCompletion,
        setActiveSprintForCompletion,
        createTask,
        updateTask,
        deleteTask,
        moveTaskStatus,
        moveTaskSprint,
        toggleChecklistItem,
        addChecklistItem,
        removeChecklistItem,
        addComment,
        addWorkLog,
        createSprint,
        startSprint,
        completeSprint,
        addCustomStatus,
        updateCustomStatus,
        deleteCustomStatus,
        reorderCustomStatuses,
        setWorkflowStatuses,
        createWorkflowScheme,
        resetToMockData,
        filteredTasks,
        activeSprint,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskStore() {
  const context = React.useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskStore must be used within a TaskProvider");
  }
  return context;
}
