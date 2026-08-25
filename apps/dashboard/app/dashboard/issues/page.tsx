"use client";

import * as React from "react";
import { useIssueStore } from "./data/issue-store";
import { IssueFilters } from "./components/IssueFilters";
import { IssueTableView } from "./components/views/IssueTableView";
import { IssueKanbanView } from "./components/views/IssueKanbanView";

export default function IssuesPage() {
  const { filterState } = useIssueStore();

  return (
    <div className="flex flex-col h-full">
      {/* Search & Severity Filters Toolbar */}
      <IssueFilters />

      {/* Primary Triage View (Table or Kanban) */}
      <div className="flex-1 overflow-auto">
        {filterState.viewMode === "TABLE" ? (
          <IssueTableView />
        ) : (
          <IssueKanbanView />
        )}
      </div>
    </div>
  );
}
