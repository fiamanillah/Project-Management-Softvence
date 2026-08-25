"use client";

import * as React from "react";
import { MyTasksView } from "../components/views/MyTasksView";

export default function MyTasksPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <MyTasksView />
    </div>
  );
}
