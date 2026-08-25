"use client";

import * as React from "react";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { TaskProvider } from "./data/task-store";
import { TaskHeader } from "./components/TaskHeader";
import { TaskDetailModal } from "./components/detail/TaskDetailModal";
import { CreateTaskModal } from "./components/modals/CreateTaskModal";
import { CreateSprintModal } from "./components/modals/CreateSprintModal";
import { CompleteSprintModal } from "./components/modals/CompleteSprintModal";
import { WorkflowManagerModal } from "./components/modals/WorkflowManagerModal";

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard code="project.view">
      <TaskProvider>
        <div className="-m-4 sm:-m-6 flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
          {/* Top Header & Agile Sub-Route Navigation */}
          <TaskHeader />

          {/* Sub-Route Page Content */}
          <div className="flex-1 overflow-auto bg-muted/10">
            {children}
          </div>

          {/* Global Shared Agile Modals & Detail Drawers */}
          <TaskDetailModal />
          <CreateTaskModal />
          <CreateSprintModal />
          <CompleteSprintModal />
          <WorkflowManagerModal />
        </div>
      </TaskProvider>
    </RouteGuard>
  );
}
