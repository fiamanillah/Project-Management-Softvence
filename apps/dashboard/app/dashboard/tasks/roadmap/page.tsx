"use client";

import * as React from "react";
import { RoadmapTimelineView } from "../components/views/RoadmapTimelineView";

export default function RoadmapPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <RoadmapTimelineView />
    </div>
  );
}
