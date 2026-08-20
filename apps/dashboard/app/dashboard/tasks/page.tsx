"use client";

import * as React from "react";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { TaskProvider, useTaskStore } from "./data/task-store";
import { TaskHeader } from "./components/TaskHeader";
import { TaskFilters } from "./components/TaskFilters";
import { KanbanBoardView } from "./components/views/KanbanBoardView";
import { BacklogView } from "./components/views/BacklogView";
import { TaskTableView } from "./components/views/TaskTableView";
import { RoadmapTimelineView } from "./components/views/RoadmapTimelineView";
import { MyTasksView } from "./components/views/MyTasksView";
import { TaskDetailModal } from "./components/detail/TaskDetailModal";
import { CreateTaskModal } from "./components/modals/CreateTaskModal";
import { CreateSprintModal } from "./components/modals/CreateSprintModal";
import { CompleteSprintModal } from "./components/modals/CompleteSprintModal";
import { WorkflowManagerModal } from "./components/modals/WorkflowManagerModal";

export default function TasksPage() {
  return (
    <RouteGuard code="project.view">
      <TaskProvider>
        <TasksContent />
      </TaskProvider>
    </RouteGuard>
  );
}

function TasksContent() {
  const { viewMode } = useTaskStore();

  const renderView = () => {
    switch (viewMode) {
      case "BOARD":
        return <KanbanBoardView />;
      case "BACKLOG":
        return <BacklogView />;
      case "TABLE":
        return <TaskTableView />;
      case "TIMELINE":
        return <RoadmapTimelineView />;
      case "MY_TASKS":
        return <MyTasksView />;
      default:
        return <KanbanBoardView />;
    }
  };

  return (
    <div className="-m-4 sm:-m-6 flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Top Header */}
      <TaskHeader />

      {/* Filter Toolbar (shown on Board, Table, and Backlog) */}
      <TaskFilters />

      {/* Active Agile View */}
      <div className="flex-1 overflow-auto bg-muted/10">
        {renderView()}
      </div>

      {/* Centered Task Detail Modal & Creation Dialogs */}
      <TaskDetailModal />
      <CreateTaskModal />
      <CreateSprintModal />
      <CompleteSprintModal />
      <WorkflowManagerModal />
    </div>
  );
}
