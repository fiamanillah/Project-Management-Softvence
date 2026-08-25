"use client";

import * as React from "react";
import { useTaskStore } from "../../data/task-store";
import { TASK_PRIORITIES } from "../../data/mock-tasks";
import { KanbanColumn } from "./KanbanColumn";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  FolderKanban,
  User,
  Flag,
  EyeOff,
  Eye,
  Layers,
} from "lucide-react";
import type { AgileTask, TaskStatusConfig } from "../../types";

export function KanbanBoardView() {
  const {
    filteredTasks,
    filterState,
    activeStatuses,
    departments,
    projects,
    assignees,
  } = useTaskStore();

  const isCompact = filterState.cardDensity === "COMPACT";

  // Columns for the active board view (exclude purely backlog if category is BACKLOG and tasks exist in active sprint)
  const boardStatuses = React.useMemo(() => {
    // Show all non-backlog statuses, or all if backlog is selected
    const nonBacklog = activeStatuses.filter((s) => !s.isBacklog);
    return nonBacklog.length > 0 ? nonBacklog : activeStatuses;
  }, [activeStatuses]);

  // Standard flat board view
  if (filterState.swimlane === "NONE") {
    return (
      <div className="flex gap-4 overflow-x-auto p-6 min-h-[calc(100vh-210px)] items-start">
        {boardStatuses.map((status) => {
          const columnTasks = filteredTasks.filter((t) => t.status === status.key);
          return (
            <KanbanColumn
              key={status.key}
              status={status}
              tasks={columnTasks}
              wipLimit={status.wipLimit}
              compact={isCompact}
            />
          );
        })}
      </div>
    );
  }

  // Swimlane View: Group by Department
  if (filterState.swimlane === "DEPARTMENT") {
    const departmentGroups = departments.map((d) => ({
      id: d.id,
      title: d.name,
      subtitle: `Department Code: ${d.code}`,
      color: d.color,
      tasks: filteredTasks.filter((t) => t.departmentId === d.id),
      icon: <Building2 className="h-4 w-4" style={{ color: d.color }} />,
    }));

    return (
      <SwimlanePaginatedContainer
        groupCategoryName="Departments"
        groups={departmentGroups}
        boardStatuses={boardStatuses}
        isCompact={isCompact}
      />
    );
  }

  // Swimlane View: Group by Project
  if (filterState.swimlane === "PROJECT") {
    const projectGroups = [
      ...projects.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `Project Code: ${p.code}`,
        tasks: filteredTasks.filter((t) => t.projectId === p.id),
        icon: <FolderKanban className="h-4 w-4 text-primary" />,
      })),
      {
        id: "standalone",
        title: "Internal / Departmental Tasks",
        subtitle: "Standalone non-project tasks",
        tasks: filteredTasks.filter((t) => !t.projectId),
        icon: <Building2 className="h-4 w-4 text-amber-500" />,
      },
    ];

    return (
      <SwimlanePaginatedContainer
        groupCategoryName="Projects"
        groups={projectGroups}
        boardStatuses={boardStatuses}
        isCompact={isCompact}
      />
    );
  }

  // Swimlane View: Group by Assignee
  if (filterState.swimlane === "ASSIGNEE") {
    const swimlaneGroups = [
      ...assignees.map((a) => ({
        id: a.id,
        title: a.name,
        subtitle: a.designation,
        avatar: a.avatar,
        tasks: filteredTasks.filter((t) => t.assignee?.id === a.id),
      })),
      {
        id: "unassigned",
        title: "Unassigned Tasks",
        subtitle: "Needs assignment",
        avatar: undefined,
        tasks: filteredTasks.filter((t) => !t.assignee),
        icon: <User className="h-4 w-4 text-muted-foreground" />,
      },
    ];

    return (
      <SwimlanePaginatedContainer
        groupCategoryName="Members"
        groups={swimlaneGroups}
        boardStatuses={boardStatuses}
        isCompact={isCompact}
      />
    );
  }

  // Swimlane View: Group by Priority
  if (filterState.swimlane === "PRIORITY") {
    const priorityGroups = Object.entries(TASK_PRIORITIES).map(([key, config]) => ({
      id: key,
      title: `${config.label} Priority`,
      subtitle: `Urgency Level ${config.level}`,
      color: config.color,
      tasks: filteredTasks.filter((t) => t.priority === key),
      icon: <Flag className="h-4 w-4" style={{ color: config.color }} />,
    }));

    return (
      <SwimlanePaginatedContainer
        groupCategoryName="Priorities"
        groups={priorityGroups}
        boardStatuses={boardStatuses}
        isCompact={isCompact}
      />
    );
  }

  return null;
}

interface SwimlaneGroupItem {
  id: string;
  title: string;
  subtitle?: string;
  color?: string;
  avatar?: string;
  icon?: React.ReactNode;
  tasks: AgileTask[];
}

interface SwimlanePaginatedContainerProps {
  groupCategoryName: string;
  groups: SwimlaneGroupItem[];
  boardStatuses: TaskStatusConfig[];
  isCompact: boolean;
}

function SwimlanePaginatedContainer({
  groupCategoryName,
  groups,
  boardStatuses,
  isCompact,
}: SwimlanePaginatedContainerProps) {
  const [hideEmpty, setHideEmpty] = React.useState(false);
  const [groupPage, setGroupPage] = React.useState(1);
  const groupsPerPage = 5;

  const visibleGroups = React.useMemo(() => {
    if (!hideEmpty) return groups;
    return groups.filter((g) => g.tasks.length > 0);
  }, [groups, hideEmpty]);

  const totalGroupPages = Math.max(1, Math.ceil(visibleGroups.length / groupsPerPage));

  React.useEffect(() => {
    if (groupPage > totalGroupPages) {
      setGroupPage(1);
    }
  }, [totalGroupPages, groupPage]);

  const paginatedGroups = React.useMemo(() => {
    const start = (groupPage - 1) * groupsPerPage;
    return visibleGroups.slice(start, start + groupsPerPage);
  }, [visibleGroups, groupPage, groupsPerPage]);

  const startGroupIndex = visibleGroups.length > 0 ? (groupPage - 1) * groupsPerPage + 1 : 0;
  const endGroupIndex = Math.min(groupPage * groupsPerPage, visibleGroups.length);

  return (
    <div className="flex flex-col gap-4 p-6 min-h-[calc(100vh-210px)] overflow-x-auto">
      {/* Swimlane Controls & Pagination Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-primary" />
            Showing {startGroupIndex}–{endGroupIndex} of {visibleGroups.length} {groupCategoryName}
          </span>

          <div className="h-3.5 w-[1px] bg-border/60" />

          {/* Hide empty swimlanes toggle */}
          <button
            onClick={() => {
              setHideEmpty(!hideEmpty);
              setGroupPage(1);
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded transition-colors ${
              hideEmpty
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {hideEmpty ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>Hide Empty (0 tasks)</span>
          </button>
        </div>

        {/* Group Pagination Controls (shown when > 1 page) */}
        {totalGroupPages > 1 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground mr-1">
              Group Page <strong>{groupPage}</strong> of <strong>{totalGroupPages}</strong>
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setGroupPage(1)}
              disabled={groupPage === 1}
              title="First group page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setGroupPage((p) => p - 1)}
              disabled={groupPage === 1}
              title="Previous groups"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setGroupPage((p) => p + 1)}
              disabled={groupPage === totalGroupPages}
              title="Next groups"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setGroupPage(totalGroupPages)}
              disabled={groupPage === totalGroupPages}
              title="Last group page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Render Paginated Swimlane Rows */}
      {paginatedGroups.map((group) => (
        <SwimlaneRow
          key={group.id}
          title={group.title}
          subtitle={group.subtitle}
          avatar={group.avatar}
          tasks={group.tasks}
          statuses={boardStatuses}
          icon={group.icon}
          isCompact={isCompact}
        />
      ))}

      {visibleGroups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground">
          No {groupCategoryName.toLowerCase()} with active tasks found matching your filter criteria.
        </div>
      )}
    </div>
  );
}

interface SwimlaneRowProps {
  title: string;
  subtitle?: string;
  avatar?: string;
  icon?: React.ReactNode;
  tasks: AgileTask[];
  statuses: TaskStatusConfig[];
  isCompact?: boolean;
}

function SwimlaneRow({
  title,
  subtitle,
  avatar,
  icon,
  tasks,
  statuses,
  isCompact = false,
}: SwimlaneRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <div className="flex flex-col rounded-2xl border border-border/70 bg-card/60 overflow-hidden shadow-xs">
      {/* Swimlane Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-5 py-3 bg-muted/40 hover:bg-muted/60 transition-colors border-b border-border/50 text-left"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}

          {avatar && (
            <Avatar className="h-6 w-6 border border-border">
              <AvatarImage src={avatar} alt={title} />
              <AvatarFallback className="text-[10px]">{title.slice(0, 2)}</AvatarFallback>
            </Avatar>
          )}

          {!avatar && icon}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">{title}</span>
              <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-semibold">
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
              </Badge>
            </div>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground truncate max-w-md">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Columns for this swimlane row */}
      {isExpanded && (
        <div className="flex gap-4 p-4 overflow-x-auto min-w-full">
          {statuses.map((status) => {
            const columnTasks = tasks.filter((t) => t.status === status.key);
            return (
              <KanbanColumn
                key={status.key}
                status={status}
                tasks={columnTasks}
                compact={isCompact}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

