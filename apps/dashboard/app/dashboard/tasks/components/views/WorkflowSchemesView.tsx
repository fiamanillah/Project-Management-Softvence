"use client";

import * as React from "react";
import { Workflow } from "lucide-react";
import { WorkflowEditor } from "../shared/WorkflowEditor";

export function WorkflowSchemesView() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div>
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" /> Dynamic Workflow Schemes & Status Lifecycle
        </h2>
        <p className="text-xs text-muted-foreground">
          Configure custom stage pipelines, WIP constraints, and behavioral flags for different departments and squads.
        </p>
      </div>

      {/* Main Workflow Editor Component */}
      <WorkflowEditor showSchemeSelector={true} />
    </div>
  );
}
