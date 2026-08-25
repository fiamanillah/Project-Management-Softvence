"use client";

import * as React from "react";
import { ActiveSprintBanner } from "../components/ActiveSprintBanner";
import { TaskFilters } from "../components/TaskFilters";
import { KanbanBoardView } from "../components/views/KanbanBoardView";

export default function ActiveSprintPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Active Sprint KPI and Burndown Summary Banner */}
      <ActiveSprintBanner />

      {/* Swimlanes and Column Filter Toolbar */}
      <TaskFilters />

      {/* Real-Time Kanban Board */}
      <div className="flex-1 overflow-auto">
        <KanbanBoardView />
      </div>
    </div>
  );
}
