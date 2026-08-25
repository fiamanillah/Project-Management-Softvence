"use client";

import * as React from "react";
import { useTaskStore } from "./data/task-store";
import { ActiveSprintBanner } from "./components/ActiveSprintBanner";
import { TaskFilters } from "./components/TaskFilters";
import { KanbanBoardView } from "./components/views/KanbanBoardView";
import { BacklogView } from "./components/views/BacklogView";
import { TaskTableView } from "./components/views/TaskTableView";
import { RoadmapTimelineView } from "./components/views/RoadmapTimelineView";
import { MyTasksView } from "./components/views/MyTasksView";
import { WorkflowSchemesView } from "./components/views/WorkflowSchemesView";

export default function TasksPage() {
  const { viewMode } = useTaskStore();

  const renderView = () => {
    switch (viewMode) {
      case "BOARD":
        return (
          <div className="flex flex-col h-full">
            <ActiveSprintBanner />
            <TaskFilters />
            <div className="flex-1 overflow-auto">
              <KanbanBoardView />
            </div>
          </div>
        );
      case "BACKLOG":
        return (
          <div className="flex flex-col h-full overflow-y-auto">
            <BacklogView />
          </div>
        );
      case "TABLE":
        return (
          <div className="flex flex-col h-full">
            <TaskFilters />
            <div className="flex-1 overflow-auto">
              <TaskTableView />
            </div>
          </div>
        );
      case "TIMELINE":
        return (
          <div className="flex flex-col h-full overflow-y-auto">
            <RoadmapTimelineView />
          </div>
        );
      case "MY_TASKS":
        return (
          <div className="flex flex-col h-full overflow-y-auto">
            <MyTasksView />
          </div>
        );
      case "WORKFLOWS":
        return (
          <div className="flex flex-col h-full overflow-y-auto">
            <WorkflowSchemesView />
          </div>
        );
      default:
        return (
          <div className="flex flex-col h-full">
            <TaskFilters />
            <div className="flex-1 overflow-auto">
              <TaskTableView />
            </div>
          </div>
        );
    }
  };

  return <div className="h-full">{renderView()}</div>;
}
