"use client";

import * as React from "react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@workspace/ui/components/select";
import {
  Search,
  X,
  Users,
  Flag,
  SplitSquareVertical,
  Building2,
  FolderKanban,
  FolderTree,
  UserCheck,
  Zap,
  Flame,
  UserX,
  SlidersHorizontal,
  LayoutGrid,
  AlignJustify,
} from "lucide-react";
import { useTaskStore } from "../data/task-store";
import { TASK_PRIORITIES } from "../data/mock-tasks";
import type { SwimlaneMode, TaskFilterState } from "../types";

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

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [localSearch, setLocalSearch] = React.useState(filterState.search);

  // Sync local search when external filterState resets
  React.useEffect(() => {
    setLocalSearch(filterState.search);
  }, [filterState.search]);

  // Debounced search propagation
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilterState((prev) => (prev.search === localSearch ? prev : { ...prev, search: localSearch }));
    }, 150);
    return () => clearTimeout(timer);
  }, [localSearch, setFilterState]);

  // Keyboard shortcut listener for '/' to focus search & 'Escape' to clear
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setLocalSearch("");
        setFilterState((prev) => ({ ...prev, search: "" }));
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setFilterState]);

  // Filter teams by selected department if one is selected
  const visibleTeams = React.useMemo(() => {
    if (filterState.departmentId === "ALL") return teams;
    return teams.filter((t) => t.departmentId === filterState.departmentId);
  }, [teams, filterState.departmentId]);

  // Count active filters (excluding defaults)
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filterState.search.trim() !== "") count++;
    if (filterState.scopeType !== "ALL") count++;
    if (filterState.departmentId !== "ALL") count++;
    if (filterState.teamId !== "ALL") count++;
    if (filterState.projectId !== "ALL") count++;
    if (filterState.sprintId !== "ALL") count++;
    if (filterState.assigneeId !== "ALL") count++;
    if (filterState.priority !== "ALL") count++;
    return count;
  }, [filterState]);

  // Active labels for dropdown triggers
  const selectedDept = departments.find((d) => d.id === filterState.departmentId);
  const selectedTeam = teams.find((t) => t.id === filterState.teamId);
  const selectedProject = projects.find((p) => p.id === filterState.projectId);
  const selectedSprint = sprints.find((s) => s.id === filterState.sprintId);
  const selectedAssignee = assignees.find((a) => a.id === filterState.assigneeId);
  const selectedPriority = TASK_PRIORITIES[filterState.priority];

  // Generic preset filter toggle helper
  const toggleFilter = (key: keyof TaskFilterState, activeVal: string) => {
    setFilterState((prev) => ({
      ...prev,
      [key]: prev[key] === activeVal ? "ALL" : activeVal,
    }));
  };

  const isMyTasksActive = filterState.assigneeId === "MY_TASKS";
  const isActiveSprintActive = filterState.sprintId === "ACTIVE";
  const isHighPriorityActive = filterState.priority === "HIGH" || filterState.priority === "URGENT";
  const isUnassignedActive = filterState.assigneeId === "UNASSIGNED";

  return (
    <div className="flex flex-col gap-2.5 border-b border-border/40 bg-muted/20 px-6 py-3">
      {/* Top Filter Row: Search, Quick Chips, Active count, Reset, and Swimlanes */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search Bar & Quick Toggles */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search key, title, tag..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-8 pr-12 h-8.5 text-xs bg-background shadow-none border-border/70 focus-visible:ring-1"
            />
            {localSearch ? (
              <button
                onClick={() => {
                  setLocalSearch("");
                  setFilterState((prev) => ({ ...prev, search: "" }));
                }}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear search (Escape)"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <span className="absolute right-2.5 top-2 pointer-events-none rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
                /
              </span>
            )}
          </div>

          <div className="h-4 w-[1px] bg-border/60 hidden sm:block mx-1" />

          {/* Quick Preset Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => toggleFilter("assigneeId", "MY_TASKS")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                isMyTasksActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-background border border-border/70 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>My Tasks</span>
            </button>

            <button
              onClick={() => toggleFilter("sprintId", "ACTIVE")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                isActiveSprintActive
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-background border border-border/70 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Active Sprint</span>
            </button>

            <button
              onClick={() => toggleFilter("priority", "HIGH")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                isHighPriorityActive
                  ? "bg-orange-600 text-white shadow-xs"
                  : "bg-background border border-border/70 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>High Priority</span>
            </button>

            <button
              onClick={() => toggleFilter("assigneeId", "UNASSIGNED")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                isUnassignedActive
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-background border border-border/70 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <UserX className="h-3.5 w-3.5" />
              <span>Unassigned</span>
            </button>
          </div>
        </div>

        {/* Right: Swimlane Grouping, Card Density, & Clear Filters */}
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear filters</span>
              <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                {activeFilterCount}
              </Badge>
            </Button>
          )}

          {/* Card Density Toggle for Board View */}
          {viewMode === "BOARD" && (
            <div className="flex items-center gap-1 pl-2 border-l border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilterState((prev) => ({
                    ...prev,
                    cardDensity: prev.cardDensity === "COMPACT" ? "STANDARD" : "COMPACT",
                  }))
                }
                className={`h-8 px-2.5 text-xs gap-1.5 border-border/70 ${
                  filterState.cardDensity === "COMPACT"
                    ? "bg-primary/10 border-primary text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={
                  filterState.cardDensity === "COMPACT"
                    ? "Switch to standard detailed cards"
                    : "Switch to high-density executive compact cards"
                }
              >
                {filterState.cardDensity === "COMPACT" ? (
                  <AlignJustify className="h-3.5 w-3.5" />
                ) : (
                  <LayoutGrid className="h-3.5 w-3.5" />
                )}
                <span>{filterState.cardDensity === "COMPACT" ? "Compact" : "Cards"}</span>
              </Button>
            </div>
          )}

          {/* Group By Swimlanes for Board View */}
          {viewMode === "BOARD" && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
              <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium whitespace-nowrap">
                <SplitSquareVertical className="h-3.5 w-3.5" /> Group:
              </span>
              <Select
                value={filterState.swimlane}
                onValueChange={(val) => {
                  if (val !== null) {
                    setFilterState((prev) => ({ ...prev, swimlane: val as SwimlaneMode }));
                  }
                }}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs bg-background font-medium border-border/70">
                  <div className="truncate">
                    {filterState.swimlane === "NONE" && "None"}
                    {filterState.swimlane === "DEPARTMENT" && "🏢 Department"}
                    {filterState.swimlane === "PROJECT" && "📁 Project"}
                    {filterState.swimlane === "ASSIGNEE" && "👤 Assignee"}
                    {filterState.swimlane === "PRIORITY" && "🚩 Priority"}
                  </div>
                </SelectTrigger>
                <SelectContent align="end">
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
      </div>

      {/* Bottom Filter Row: Categorized Labeled Dropdowns */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/30">
        <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1 mr-1">
          <SlidersHorizontal className="h-3 w-3" /> Filters:
        </span>

        {/* 1. Scope Filter */}
        <Select
          value={filterState.scopeType}
          onValueChange={(val) => {
            if (val !== null) setFilterState((prev) => ({ ...prev, scopeType: val as any }));
          }}
        >
          <SelectTrigger
            className={`h-7.5 px-2.5 text-xs bg-background border-border/70 gap-1.5 w-auto max-w-[170px] ${
              filterState.scopeType !== "ALL"
                ? "border-primary/40 bg-primary/5 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderTree className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {filterState.scopeType === "ALL" && "Scope"}
              {filterState.scopeType === "PROJECT" && "Scope: Project"}
              {filterState.scopeType === "DEPARTMENT_TEAM" && "Scope: Dept/Team"}
              {filterState.scopeType === "PERSONAL" && "Scope: Personal"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Work Scopes</SelectItem>
            <SelectItem value="PROJECT">📁 Project Deliverables</SelectItem>
            <SelectItem value="DEPARTMENT_TEAM">🏢 Department / Team</SelectItem>
            <SelectItem value="PERSONAL">🔒 Personal To-Dos</SelectItem>
          </SelectContent>
        </Select>

        {/* 2. Department Filter */}
        <Select
          value={filterState.departmentId}
          onValueChange={(val) => {
            if (val !== null) {
              setFilterState((prev) => ({ ...prev, departmentId: val, teamId: "ALL" }));
            }
          }}
        >
          <SelectTrigger
            className={`h-7.5 px-2.5 text-xs bg-background border-border/70 gap-1.5 w-auto max-w-[180px] ${
              filterState.departmentId !== "ALL"
                ? "border-primary/40 bg-primary/5 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {selectedDept ? `Dept: ${selectedDept.name}` : "Department"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate">{d.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 3. Team Filter (Visible when department selected or all) */}
        {visibleTeams.length > 0 && (
          <Select
            value={filterState.teamId}
            onValueChange={(val) => {
              if (val !== null) setFilterState((prev) => ({ ...prev, teamId: val }));
            }}
          >
            <SelectTrigger
              className={`h-7.5 px-2.5 text-xs bg-background border-border/70 gap-1.5 w-auto max-w-[160px] ${
                filterState.teamId !== "ALL"
                  ? "border-primary/40 bg-primary/5 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {selectedTeam ? `Team: ${selectedTeam.name}` : "Team"}
              </span>
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
        )}

        {/* 4. Project Filter */}
        <Select
          value={filterState.projectId}
          onValueChange={(val) => {
            if (val !== null) setFilterState((prev) => ({ ...prev, projectId: val }));
          }}
        >
          <SelectTrigger
            className={`h-7.5 px-2.5 text-xs bg-background border-border/70 gap-1.5 w-auto max-w-[180px] ${
              filterState.projectId !== "ALL"
                ? "border-primary/40 bg-primary/5 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {filterState.projectId === "ALL" && "Project"}
              {filterState.projectId === "STANDALONE" && "Proj: Internal"}
              {selectedProject && `Proj: ${selectedProject.name}`}
            </span>
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

        {/* 5. Sprint Filter */}
        <Select
          value={filterState.sprintId}
          onValueChange={(val) => {
            if (val !== null) setFilterState((prev) => ({ ...prev, sprintId: val }));
          }}
        >
          <SelectTrigger
            className={`h-7.5 px-2.5 text-xs bg-background border-border/70 gap-1.5 w-auto max-w-[170px] ${
              filterState.sprintId !== "ALL"
                ? "border-primary/40 bg-primary/5 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {filterState.sprintId === "ALL" && "Sprint"}
              {filterState.sprintId === "ACTIVE" && "Sprint: Active"}
              {filterState.sprintId === "BACKLOG" && "Sprint: Backlog"}
              {selectedSprint && `Sprint: ${selectedSprint.name}`}
            </span>
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

        {/* 6. Assignee Filter */}
        <Select
          value={filterState.assigneeId}
          onValueChange={(val) => {
            if (val !== null) setFilterState((prev) => ({ ...prev, assigneeId: val }));
          }}
        >
          <SelectTrigger
            className={`h-7.5 px-2.5 text-xs bg-background border-border/70 gap-1.5 w-auto max-w-[170px] ${
              filterState.assigneeId !== "ALL"
                ? "border-primary/40 bg-primary/5 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {filterState.assigneeId === "ALL" && "Assignee"}
              {filterState.assigneeId === "MY_TASKS" && "Assignee: Me"}
              {filterState.assigneeId === "UNASSIGNED" && "Assignee: Unassigned"}
              {selectedAssignee && `Assignee: ${selectedAssignee.name}`}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Assignees</SelectItem>
            <SelectItem value="MY_TASKS">👤 Assigned to Me</SelectItem>
            <SelectItem value="UNASSIGNED">⚪ Unassigned</SelectItem>
            {assignees.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-primary/20 text-[10px] flex items-center justify-center font-bold text-primary">
                    {a.name.charAt(0)}
                  </span>
                  <span className="truncate">{a.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 7. Priority Filter */}
        <Select
          value={filterState.priority}
          onValueChange={(val) => {
            if (val !== null) setFilterState((prev) => ({ ...prev, priority: val }));
          }}
        >
          <SelectTrigger
            className={`h-7.5 px-2.5 text-xs bg-background border-border/70 gap-1.5 w-auto max-w-[150px] ${
              filterState.priority !== "ALL"
                ? "border-primary/40 bg-primary/5 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flag className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {selectedPriority ? `Priority: ${selectedPriority.label}` : "Priority"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {Object.entries(TASK_PRIORITIES).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                  <span>{v.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
