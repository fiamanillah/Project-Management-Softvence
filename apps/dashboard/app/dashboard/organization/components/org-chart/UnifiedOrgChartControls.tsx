"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import {
  GitBranch,
  Building2,
  Users,
  Workflow,
  Network,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { LayoutMode, DepthFilter } from "./types";

interface UnifiedOrgChartControlsProps {
  branchCount: number;
  deptCount: number;
  teamCount: number;
  zoomLevel: number;
  depthFilter: DepthFilter;
  layoutMode: LayoutMode;
  isFullscreen: boolean;
  onDepthFilterChange: (filter: DepthFilter) => void;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleFullscreen: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function UnifiedOrgChartControls({
  branchCount,
  deptCount,
  teamCount,
  zoomLevel,
  depthFilter,
  layoutMode,
  isFullscreen,
  onDepthFilterChange,
  onLayoutModeChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFullscreen,
  onExpandAll,
  onCollapseAll,
}: UnifiedOrgChartControlsProps) {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border backdrop-blur-md">
      {/* Left: Summary Metrics */}
      <div className="flex items-center gap-2.5 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium">
          <GitBranch className="size-3.5" />
          <span>{branchCount} Branches</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
          <Building2 className="size-3.5" />
          <span>{deptCount} Departments</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
          <Users className="size-3.5" />
          <span>{teamCount} Teams</span>
        </div>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <span className="text-muted-foreground text-[11px]">
          Scale: <strong className="text-foreground">{zoomLevel}%</strong>
        </span>
      </div>

      {/* Right: Layout Switcher & Zoom Controls */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Depth Filter */}
        <div className="flex items-center rounded-lg border bg-background/80 p-0.5 shadow-2xs">
          <Button
            variant={depthFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onDepthFilterChange("all")}
            className="h-7 text-xs px-2"
          >
            All Tiers
          </Button>
          <Button
            variant={depthFilter === "branch" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onDepthFilterChange("branch")}
            className="h-7 text-xs px-2"
          >
            Branches
          </Button>
          <Button
            variant={depthFilter === "dept" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onDepthFilterChange("dept")}
            className="h-7 text-xs px-2"
          >
            Departments
          </Button>
        </div>

        {/* Layout Mode Switcher */}
        <div className="flex items-center rounded-lg border bg-background/80 p-0.5 shadow-2xs">
          <Button
            variant={layoutMode === "flow" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onLayoutModeChange("flow")}
            className="h-7 text-xs px-2 gap-1"
            title="Top-Down Flowchart Hierarchy"
          >
            <Workflow className="size-3.5" />
            <span className="hidden sm:inline">Flow</span>
          </Button>
          <Button
            variant={layoutMode === "tree" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onLayoutModeChange("tree")}
            className="h-7 text-xs px-2 gap-1"
            title="Left-to-Right Mindmap Tree"
          >
            <Network className="size-3.5" />
            <span className="hidden sm:inline">Tree</span>
          </Button>
          <Button
            variant={layoutMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onLayoutModeChange("grid")}
            className="h-7 text-xs px-2 gap-1"
            title="Matrix Division Grid"
          >
            <LayoutGrid className="size-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </Button>
        </div>

        {/* Zoom & Fullscreen Controls */}
        <div className="flex items-center gap-1 rounded-lg border bg-background/80 p-0.5 shadow-2xs">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            disabled={zoomLevel <= 60}
            className="size-7 text-muted-foreground hover:text-foreground"
            title="Zoom Out"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onResetZoom}
            className="size-7 text-muted-foreground hover:text-foreground text-[10px] font-mono"
            title="Reset Zoom"
          >
            <RotateCcw className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            disabled={zoomLevel >= 160}
            className="size-7 text-muted-foreground hover:text-foreground"
            title="Zoom In"
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <div className="h-4 w-px bg-border my-auto" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="size-7 text-muted-foreground hover:text-foreground"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </Button>
        </div>

        {/* Expand / Collapse All Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpandAll}
            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
          >
            Expand
          </Button>
          <span className="text-border">|</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCollapseAll}
            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
          >
            Collapse
          </Button>
        </div>
      </div>
    </div>
  );
}
