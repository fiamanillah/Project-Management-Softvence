"use client";

import * as React from "react";
import type {
  IssueItem,
  IssueComment,
  SupportTicketItem,
  IssueFilterState,
} from "../types";
import {
  INITIAL_MOCK_ISSUES,
  INITIAL_MOCK_COMMENTS,
  INITIAL_MOCK_TICKETS,
} from "./mock-issues";
import { toast } from "sonner";

interface IssueContextType {
  issues: IssueItem[];
  comments: Record<string, IssueComment[]>;
  tickets: SupportTicketItem[];
  
  filterState: IssueFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<IssueFilterState>>;
  resetFilters: () => void;
  
  selectedIssueId: string | null;
  setSelectedIssueId: (id: string | null) => void;
  selectedIssue: IssueItem | null;
  
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
  
  // Actions
  createIssue: (data: Partial<IssueItem>) => IssueItem;
  updateIssueStatus: (issueId: string, statusCategory: IssueItem["statusCategory"], statusName: string) => void;
  resolveIssue: (issueId: string, notes: string) => void;
  addComment: (issueId: string, content: string, isInternalOnly?: boolean) => void;
  toggleReproductionStep: (issueId: string, stepId: string) => void;
  convertToTask: (issueId: string) => void;
  resetToMockData: () => void;
  
  // Computed
  filteredIssues: IssueItem[];
  totalOpenCount: number;
  blockersCount: number;
  criticalCount: number;
  resolvedTodayCount: number;
}

const defaultFilters: IssueFilterState = {
  search: "",
  projectId: "ALL",
  componentId: "ALL",
  statusCategory: "ALL",
  priorityLevel: "ALL",
  issueTypeId: "ALL",
  assigneeId: "ALL",
  severity: "ALL",
  viewMode: "TABLE",
};

const IssueContext = React.createContext<IssueContextType | undefined>(undefined);

export function IssueProvider({ children }: { children: React.ReactNode }) {
  const [issues, setIssues] = React.useState<IssueItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("softvence_issues_cache");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_MOCK_ISSUES;
  });

  const [comments, setComments] = React.useState<Record<string, IssueComment[]>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("softvence_issue_comments_cache");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_MOCK_COMMENTS;
  });

  const [tickets, setTickets] = React.useState<SupportTicketItem[]>(INITIAL_MOCK_TICKETS);
  const [filterState, setFilterState] = React.useState<IssueFilterState>(defaultFilters);
  const [selectedIssueId, setSelectedIssueId] = React.useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);

  // Sync to local storage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("softvence_issues_cache", JSON.stringify(issues));
    }
  }, [issues]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("softvence_issue_comments_cache", JSON.stringify(comments));
    }
  }, [comments]);

  const selectedIssue = React.useMemo(() => {
    return issues.find((i) => i.id === selectedIssueId) || null;
  }, [issues, selectedIssueId]);

  const resetFilters = React.useCallback(() => {
    setFilterState(defaultFilters);
  }, []);

  const createIssue = React.useCallback(
    (data: Partial<IssueItem>): IssueItem => {
      const newIssue: IssueItem = {
        id: `iss-${Date.now()}`,
        key: `BUG-${Math.floor(100 + Math.random() * 900)}`,
        projectId: data.projectId || "proj-fintech",
        projectName: data.projectName || "Nexus NeoBank Mobile App",
        componentId: data.componentId || null,
        componentName: data.componentName || null,
        authorId: "usr-current",
        authorName: "Admin User",
        authorAvatar: "https://github.com/shadcn.png",
        authorDesignation: "Engineering Lead",
        title: data.title || "Untitled Issue",
        content: data.content || "",
        statusId: "st-open",
        statusName: "Open / Triage",
        statusCategory: "OPEN",
        statusColor: "#ef4444",
        isResolved: false,
        priorityId: data.priorityId || "p-2",
        priorityName: data.priorityName || "P2 - Major",
        priorityLevel: data.priorityLevel ?? 2,
        priorityColor: data.priorityColor || "#3b82f6",
        issueTypeId: data.issueTypeId || "it-bug",
        issueTypeName: data.issueTypeName || "Bug / Defect",
        issueTypeIcon: "Bug",
        assigneeId: data.assigneeId || null,
        assigneeName: data.assigneeName || null,
        assigneeAvatar: data.assigneeAvatar || null,
        commentsCount: 0,
        attachmentsCount: 0,
        createdAt: new Date().toISOString(),
        _capabilities: {
          canEdit: true,
          canDelete: true,
          canResolve: true,
          canAssign: true,
          canConvertToTask: true,
        },
        ...data,
      };

      setIssues((prev) => [newIssue, ...prev]);
      toast.success(`Issue ${newIssue.key} created successfully`);
      return newIssue;
    },
    []
  );

  const updateIssueStatus = React.useCallback(
    (issueId: string, statusCategory: IssueItem["statusCategory"], statusName: string) => {
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.id === issueId) {
            const isResolved = statusCategory === "RESOLVED" || statusCategory === "CLOSED";
            return {
              ...iss,
              statusCategory,
              statusName,
              isResolved,
              resolvedAt: isResolved ? new Date().toISOString() : null,
              resolvedBy: isResolved ? "usr-current" : null,
              resolverName: isResolved ? "Admin User" : null,
              updatedAt: new Date().toISOString(),
            };
          }
          return iss;
        })
      );
      toast.info(`Updated issue status to ${statusName}`);
    },
    []
  );

  const resolveIssue = React.useCallback(
    (issueId: string, notes: string) => {
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.id === issueId) {
            return {
              ...iss,
              statusCategory: "RESOLVED",
              statusName: "Resolved",
              statusColor: "#10b981",
              isResolved: true,
              resolutionNotes: notes,
              resolvedAt: new Date().toISOString(),
              resolvedBy: "usr-current",
              resolverName: "Admin User",
              updatedAt: new Date().toISOString(),
            };
          }
          return iss;
        })
      );
      toast.success("Issue marked as resolved!");
    },
    []
  );

  const addComment = React.useCallback(
    (issueId: string, content: string, isInternalOnly = false) => {
      const newComment: IssueComment = {
        id: `cm-${Date.now()}`,
        issueId,
        authorId: "usr-current",
        authorName: "Admin User",
        authorAvatar: "https://github.com/shadcn.png",
        authorDesignation: "Enterprise Admin",
        content,
        isInternalOnly,
        createdAt: new Date().toISOString(),
      };

      setComments((prev) => ({
        ...prev,
        [issueId]: [...(prev[issueId] || []), newComment],
      }));

      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId ? { ...i, commentsCount: (i.commentsCount || 0) + 1 } : i
        )
      );

      toast.success("Comment posted");
    },
    []
  );

  const toggleReproductionStep = React.useCallback(
    (issueId: string, stepId: string) => {
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.id === issueId && iss.reproductionSteps) {
            return {
              ...iss,
              reproductionSteps: iss.reproductionSteps.map((step) =>
                step.id === stepId ? { ...step, isChecked: !step.isChecked } : step
              ),
            };
          }
          return iss;
        })
      );
    },
    []
  );

  const convertToTask = React.useCallback((issueId: string) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id === issueId) {
          const taskKey = `TSK-${Math.floor(100 + Math.random() * 900)}`;
          return {
            ...iss,
            linkedTaskId: `task-gen-${Date.now()}`,
            linkedTaskKey: taskKey,
            linkedTaskTitle: iss.title,
          };
        }
        return iss;
      })
    );
    toast.success("Converted issue to agile product backlog task!");
  }, []);

  const resetToMockData = React.useCallback(() => {
    setIssues(INITIAL_MOCK_ISSUES);
    setComments(INITIAL_MOCK_COMMENTS);
    setTickets(INITIAL_MOCK_TICKETS);
    if (typeof window !== "undefined") {
      localStorage.removeItem("softvence_issues_cache");
      localStorage.removeItem("softvence_issue_comments_cache");
    }
    toast.success("Reset issues to default demo state");
  }, []);

  // Computed metrics
  const totalOpenCount = React.useMemo(() => {
    return issues.filter((i) => !i.isResolved).length;
  }, [issues]);

  const blockersCount = React.useMemo(() => {
    return issues.filter((i) => i.priorityLevel === 0 && !i.isResolved).length;
  }, [issues]);

  const criticalCount = React.useMemo(() => {
    return issues.filter((i) => i.priorityLevel === 1 && !i.isResolved).length;
  }, [issues]);

  const resolvedTodayCount = React.useMemo(() => {
    return issues.filter((i) => i.isResolved).length;
  }, [issues]);

  // Filtered issues list
  const filteredIssues = React.useMemo(() => {
    return issues.filter((issue) => {
      // Search
      if (filterState.search.trim()) {
        const query = filterState.search.toLowerCase();
        const matches =
          issue.title.toLowerCase().includes(query) ||
          issue.key.toLowerCase().includes(query) ||
          issue.projectName.toLowerCase().includes(query) ||
          (issue.content && issue.content.toLowerCase().includes(query));
        if (!matches) return false;
      }

      // Project
      if (filterState.projectId !== "ALL" && issue.projectId !== filterState.projectId) {
        return false;
      }

      // Component
      if (filterState.componentId !== "ALL" && issue.componentId !== filterState.componentId) {
        return false;
      }

      // Status
      if (filterState.statusCategory !== "ALL" && issue.statusCategory !== filterState.statusCategory) {
        return false;
      }

      // Priority
      if (filterState.priorityLevel !== "ALL" && String(issue.priorityLevel) !== filterState.priorityLevel) {
        return false;
      }

      // Severity quick filter
      if (filterState.severity === "BLOCKERS" && issue.priorityLevel !== 0) {
        return false;
      }
      if (filterState.severity === "CRITICAL" && issue.priorityLevel > 1) {
        return false;
      }
      if (filterState.severity === "RESOLVED" && !issue.isResolved) {
        return false;
      }

      return true;
    });
  }, [issues, filterState]);

  return (
    <IssueContext.Provider
      value={{
        issues,
        comments,
        tickets,
        filterState,
        setFilterState,
        resetFilters,
        selectedIssueId,
        setSelectedIssueId,
        selectedIssue,
        createModalOpen,
        setCreateModalOpen,
        createIssue,
        updateIssueStatus,
        resolveIssue,
        addComment,
        toggleReproductionStep,
        convertToTask,
        resetToMockData,
        filteredIssues,
        totalOpenCount,
        blockersCount,
        criticalCount,
        resolvedTodayCount,
      }}
    >
      {children}
    </IssueContext.Provider>
  );
}

export function useIssueStore() {
  const context = React.useContext(IssueContext);
  if (!context) {
    throw new Error("useIssueStore must be used within an IssueProvider");
  }
  return context;
}
