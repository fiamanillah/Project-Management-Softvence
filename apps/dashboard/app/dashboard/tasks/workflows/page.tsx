"use client";

import * as React from "react";
import { WorkflowSchemesView } from "../components/views/WorkflowSchemesView";

export default function WorkflowSchemesPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <WorkflowSchemesView />
    </div>
  );
}
