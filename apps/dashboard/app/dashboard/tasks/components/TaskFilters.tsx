"use client";

import * as React from "react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Search,
  X,
  Users,
  Flag,
  Layers,
  SplitSquareVertical,
  Building2,
  FolderKanban,
  FolderTree,
} from "lucide-react";
import { useTaskStore } from "../data/task-store";
import { TASK_PRIORITIES } from "../data/mock-tasks";
import type { SwimlaneMode } from "../types";

export function TaskFilters() {
  const {
    filterState,
    setFilterState,
    resetFilters,
    departments,
    teams,
    projects,
    sprints,
    assignees,
    viewMode,
  } = useTaskStore();

  const isFiltered =
    filterState.search !== "" ||
    filterState.scopeType !== "ALL" ||
    filterState.departmentId !== "ALL" ||
    filterState.teamId !== "ALL" ||
    filterState.projectId !== "ALL" ||
    filterState.sprintId !== "ALL" ||
    filterState.assigneeId !== "ALL" ||
    filterState.priority !== "ALL";

  // Filter teams by selected department if one is selected
  const visibleTeams = React.useMemo(() => {
    if (filterState.departmentId === "ALL") return teams;
    return teams.filter((t) => t.departmentId === filterState.departmentId);
  }, [teams, filterState.departmentId]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-muted/20 px-6 py-3">
      {/* Search & Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search key, title, tag..."
            value={filterState.search}
            onChange={(e) =>
              setFilterState((prev) => ({ ...prev, search: e.target.value }))
            }
            className="pl-8 h-9 text-xs bg-background"
          />
          {filterState.search && (
            <button
              onClick={() =>
                setFilterState((prev) => ({ ...prev, search: "" }))
              }
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Scope Type (Project vs Departmental vs Personal) */}
        <Select
          value={filterState.scopeType}
          onValueChange={(val) => {
            if (val !== null) setFilterState((prev) => ({ ...prev, scopeType: val as any }));
          }}
        >
          <SelectTrigger className="h-9 w-[150px] text-xs bg-background">
            <div className="flex items-center gap-1.5 truncate">
              <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Scope" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Work Scopes</SelectItem>
            <SelectItem value="PROJECT">📁 Project Deliverables</SelectItem>
            <SelectItem value="DEPARTMENT_TEAM">🏢 Department / Team</SelectItem>
            <SelectItem value="PERSONAL">🔒 Personal To-Dos</SelectItem>
          </SelectContent>
        </Select>

        {/* Department Filter */}
        <Select
          value={filterState.departmentId}
          onValueChange={(val) => {
            if (val !== null) {
              setFilterState((prev) => ({ ...prev, departmentId: val, teamId: "ALL" }));
            }
          }}
        >
          <SelectTrigger className="h-9 w-[165px] text-xs bg-background">
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Department" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Team Filter */}
        <Select
          value={filterState.teamId}
          onValueChange={(val) => {
            if (val !== null) setFilterState((prev) => ({ ...prev, teamId: val }));
          }}
        >
          <SelectTrigger className="h-9 w-[145px] text-xs bg-background">
            <div className="flex items-center gap-1.5 truncate">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Team" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Teams</SelectItem>
            {visibleTeams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Project Filter */}
        <Select
          value={filterState.projectId}
          onValueChange={(val) => {
            if (val !== null) setFilterState((prev) => ({ ...prev, projectId: val }));
          }}
        >
          <SelectTrigger className="h-9 w-[170px] text-xs bg-background">
            <div className="flex items-center gap-1.5 truncate">
              <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Project" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Projects</SelectItem>
            <SelectItem value="STANDALONE">⚡ Internal / Non-Project</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sprint Filter */}
        <Select
          value={filterState.sprintId}
          onValueChange={(val) => {
            if (val !== null) setFilterState((prev) => ({ ...prev, sprintId: val }));
          }}
        >
          <SelectTrigger className="h-9 w-[140px] text-xs bg-background">
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sprints</SelectItem>
            <SelectItem value="ACTIVE">⚡ Active Sprint</SelectItem>
            <SelectItem value="BACKLOG">📦 Backlog</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={filterState.priority}
          onValueChange={(val) => {
            if (val !== null) setFilterState((prev) => ({ ...prev, priority: val }));
          }}
        >
          <SelectTrigger className="h-9 w-[115px] text-xs bg-background">
            <div className="flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Priority" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {Object.entries(TASK_PRIORITIES).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v.color }} />
                  {v.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear</span>
          </Button>
        )}
      </div>

      {/* Right side: Swimlane grouping (specifically for Board View) */}
      {viewMode === "BOARD" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
            <SplitSquareVertical className="h-3.5 w-3.5" /> Group By:
          </span>
          <Select
            value={filterState.swimlane}
            onValueChange={(val) => {
              if (val !== null) {
                setFilterState((prev) => ({ ...prev, swimlane: val as SwimlaneMode }));
              }
            }}
          >
            <SelectTrigger className="h-8 w-[145px] text-xs bg-background font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No Grouping</SelectItem>
              <SelectItem value="DEPARTMENT">🏢 By Department</SelectItem>
              <SelectItem value="PROJECT">📁 By Project</SelectItem>
              <SelectItem value="ASSIGNEE">👤 By Assignee</SelectItem>
              <SelectItem value="PRIORITY">🚩 By Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
