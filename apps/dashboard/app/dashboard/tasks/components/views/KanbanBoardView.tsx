"use client";

import * as React from "react";
import { useTaskStore } from "../../data/task-store";
import { TASK_PRIORITIES } from "../../data/mock-tasks";
import { KanbanColumn } from "./KanbanColumn";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { ChevronDown, ChevronRight, Building2, FolderKanban, User, Flag } from "lucide-react";
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
      <div className="flex flex-col gap-6 p-6 min-h-[calc(100vh-210px)] overflow-x-auto">
        {departmentGroups.map((group) => (
          <SwimlaneRow
            key={group.id}
            title={group.title}
            subtitle={group.subtitle}
            tasks={group.tasks}
            statuses={boardStatuses}
            icon={group.icon}
          />
        ))}
      </div>
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
      <div className="flex flex-col gap-6 p-6 min-h-[calc(100vh-210px)] overflow-x-auto">
        {projectGroups.map((group) => (
          <SwimlaneRow
            key={group.id}
            title={group.title}
            subtitle={group.subtitle}
            tasks={group.tasks}
            statuses={boardStatuses}
            icon={group.icon}
          />
        ))}
      </div>
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
      },
    ];

    return (
      <div className="flex flex-col gap-6 p-6 min-h-[calc(100vh-210px)] overflow-x-auto">
        {swimlaneGroups.map((group) => (
          <SwimlaneRow
            key={group.id}
            title={group.title}
            subtitle={group.subtitle}
            avatar={group.avatar}
            tasks={group.tasks}
            statuses={boardStatuses}
            icon={<User className="h-4 w-4 text-primary" />}
          />
        ))}
      </div>
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
      <div className="flex flex-col gap-6 p-6 min-h-[calc(100vh-210px)] overflow-x-auto">
        {priorityGroups.map((group) => (
          <SwimlaneRow
            key={group.id}
            title={group.title}
            subtitle={group.subtitle}
            tasks={group.tasks}
            statuses={boardStatuses}
            icon={group.icon}
          />
        ))}
      </div>
    );
  }

  return null;
}

interface SwimlaneRowProps {
  title: string;
  subtitle?: string;
  avatar?: string;
  icon?: React.ReactNode;
  tasks: AgileTask[];
  statuses: TaskStatusConfig[];
}

function SwimlaneRow({
  title,
  subtitle,
  avatar,
  icon,
  tasks,
  statuses,
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
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
