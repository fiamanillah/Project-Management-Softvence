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
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Search,
  Filter,
  Flame,
  AlertTriangle,
  CheckCircle2,
  TableProperties,
  KanbanSquare,
  X,
} from "lucide-react";
import { useIssueStore } from "../data/issue-store";

export function IssueFilters() {
  const { filterState, setFilterState, resetFilters, issues } = useIssueStore();

  const uniqueProjects = React.useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => {
      if (i.projectId && i.projectName) {
        map.set(i.projectId, i.projectName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [issues]);

  const hasActiveFilters =
    filterState.search ||
    filterState.projectId !== "ALL" ||
    filterState.statusCategory !== "ALL" ||
    filterState.priorityLevel !== "ALL" ||
    filterState.severity !== "ALL";

  return (
    <div className="flex flex-col gap-3 px-6 py-3.5 border-b border-border/50 bg-background/50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search & Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={filterState.search}
              onChange={(e) =>
                setFilterState((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search by issue key, title, or keyword..."
              className="h-8 pl-8 text-xs bg-background"
            />
            {filterState.search && (
              <button
                onClick={() => setFilterState((prev) => ({ ...prev, search: "" }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Project Filter */}
          <Select
            value={filterState.projectId}
            onValueChange={(val) =>
              setFilterState((prev) => ({ ...prev, projectId: val || "ALL" }))
            }
          >
            <SelectTrigger className="h-8 text-xs w-[170px] bg-background">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Projects</SelectItem>
              {uniqueProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Category Filter */}
          <Select
            value={filterState.statusCategory}
            onValueChange={(val) =>
              setFilterState((prev) => ({ ...prev, statusCategory: val || "ALL" }))
            }
          >
            <SelectTrigger className="h-8 text-xs w-[150px] bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open / Triage</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="QA_TESTING">QA Testing</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </Button>
          )}
        </div>

        {/* Right: Severity Quick Chips & View Switcher */}
        <div className="flex items-center gap-2">
          {/* Quick Severity Filter Chips */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50 text-xs">
            <button
              onClick={() =>
                setFilterState((prev) => ({ ...prev, severity: "ALL" }))
              }
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                filterState.severity === "ALL"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() =>
                setFilterState((prev) => ({ ...prev, severity: "BLOCKERS" }))
              }
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all font-medium ${
                filterState.severity === "BLOCKERS"
                  ? "bg-rose-500 text-white font-semibold shadow-2xs"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              }`}
            >
              <Flame className="h-3 w-3" />
              <span>Blockers</span>
            </button>
            <button
              onClick={() =>
                setFilterState((prev) => ({ ...prev, severity: "CRITICAL" }))
              }
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all font-medium ${
                filterState.severity === "CRITICAL"
                  ? "bg-amber-500 text-white font-semibold shadow-2xs"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>Critical</span>
            </button>
            <button
              onClick={() =>
                setFilterState((prev) => ({ ...prev, severity: "RESOLVED" }))
              }
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all font-medium ${
                filterState.severity === "RESOLVED"
                  ? "bg-emerald-600 text-white font-semibold shadow-2xs"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Resolved</span>
            </button>
          </div>

          {/* View Mode Toggle: Table vs Kanban */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
            <button
              onClick={() =>
                setFilterState((prev) => ({ ...prev, viewMode: "TABLE" }))
              }
              className={`p-1 rounded-md transition-all ${
                filterState.viewMode === "TABLE"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <TableProperties className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() =>
                setFilterState((prev) => ({ ...prev, viewMode: "KANBAN" }))
              }
              className={`p-1 rounded-md transition-all ${
                filterState.viewMode === "KANBAN"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Kanban Board View"
            >
              <KanbanSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
