"use client";

import * as React from "react";
import { BacklogView } from "../components/views/BacklogView";

export default function BacklogPlanningPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <BacklogView />
    </div>
  );
}
