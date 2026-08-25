"use client";

import * as React from "react";
import { RouteGuard } from "@/components/permission-gate/RouteGuard";
import { IssueProvider } from "./data/issue-store";
import { IssueHeader } from "./components/IssueHeader";
import { IssueDetailModal } from "./components/detail/IssueDetailModal";
import { CreateIssueModal } from "./components/modals/CreateIssueModal";

export default function IssuesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard code="project.view">
      <IssueProvider>
        <div className="-m-4 sm:-m-6 flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
          {/* Header with KPI metrics & navigation tabs */}
          <IssueHeader />

          {/* Sub-route Content */}
          <div className="flex-1 overflow-auto bg-muted/10">
            {children}
          </div>

          {/* Issue Modal Singletons */}
          <IssueDetailModal />
          <CreateIssueModal />
        </div>
      </IssueProvider>
    </RouteGuard>
  );
}
