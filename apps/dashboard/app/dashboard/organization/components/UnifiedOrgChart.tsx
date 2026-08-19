"use client";

import * as React from "react";
import { Network } from "lucide-react";
import type { UnifiedOrgNode } from "@workspace/shared";
import {
  type UnifiedTreeNode,
  type UnifiedOrgChartProps,
  type LayoutMode,
  type DepthFilter,
  UnifiedOrgChartControls,
  UnifiedOrgChartCanvas,
  TopDownFlowChart,
  HorizontalTreeChart,
  DivisionGridChart,
  UnifiedSpotlight,
} from "./org-chart";

export function UnifiedOrgChart({
  nodes,
  onAddChild,
  onEdit,
  onAssignLeadership,
  onDelete,
}: UnifiedOrgChartProps) {
  const [layoutMode, setLayoutMode] = React.useState<LayoutMode>("flow");
  const [zoomLevel, setZoomLevel] = React.useState<number>(100);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const [selectedNode, setSelectedNode] = React.useState<UnifiedTreeNode | null>(null);
  const [depthFilter, setDepthFilter] = React.useState<DepthFilter>("all");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Build tree nodes with parent references
  const { rootNodes, branchCount, deptCount, teamCount } = React.useMemo(() => {
    let branches = 0;
    let depts = 0;
    let teams = 0;

    const countTypes = (node: UnifiedOrgNode) => {
      if (node.type === "BRANCH") branches++;
      if (node.type === "DEPARTMENT") depts++;
      if (node.type === "TEAM") teams++;
      node.children?.forEach(countTypes);
    };

    nodes.forEach(countTypes);

    const buildTree = (
      node: UnifiedOrgNode,
      depth: number,
      parent?: UnifiedTreeNode,
    ): UnifiedTreeNode => {
      const treeNode: UnifiedTreeNode = {
        node,
        depth,
        parent,
        children: [],
      };
      treeNode.children = (node.children || []).map((c) =>
        buildTree(c, depth + 1, treeNode),
      );
      return treeNode;
    };

    const roots = nodes.map((n) => buildTree(n, 0));
    return {
      rootNodes: roots,
      branchCount: branches,
      deptCount: depts,
      teamCount: teams,
    };
  }, [nodes]);

  // Track expanded nodes
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => {
    const ids = new Set<string>();
    const collectIds = (node: UnifiedOrgNode) => {
      ids.add(node.id);
      node.children?.forEach(collectIds);
    };
    nodes.forEach(collectIds);
    return ids;
  });

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const ids = new Set<string>();
    const collectIds = (node: UnifiedOrgNode) => {
      ids.add(node.id);
      node.children?.forEach(collectIds);
    };
    nodes.forEach(collectIds);
    setExpandedIds(ids);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 60));
  const handleResetZoom = () => setZoomLevel(100);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center rounded-2xl border bg-card/60 backdrop-blur-sm shadow-xs">
        <Network className="size-12 text-muted-foreground/40 mb-3" />
        <h3 className="text-base font-semibold text-foreground">No Organizational Units Found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          No branches, departments, or squads match the current filter or search criteria.
        </p>
      </div>
    );
  }

  const commonChartProps = {
    roots: rootNodes,
    depthFilter,
    expandedIds,
    selectedNode,
    onSelectNode: setSelectedNode,
    onToggleExpand: toggleExpand,
    onAddChild,
    onEdit,
    onAssignLeadership,
    onDelete,
  };

  return (
    <div
      ref={containerRef}
      className={`space-y-4 rounded-2xl border bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-md transition-all w-full min-w-0 max-w-full overflow-hidden ${
        isFullscreen ? "p-6 overflow-auto fixed inset-0 z-50 bg-background" : "p-4 sm:p-5 shadow-xs"
      }`}
    >
      {/* Top Dynamic Controls Bar */}
      <UnifiedOrgChartControls
        branchCount={branchCount}
        deptCount={deptCount}
        teamCount={teamCount}
        zoomLevel={zoomLevel}
        depthFilter={depthFilter}
        layoutMode={layoutMode}
        isFullscreen={isFullscreen}
        onDepthFilterChange={setDepthFilter}
        onLayoutModeChange={setLayoutMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onToggleFullscreen={toggleFullscreen}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      {/* Main Dynamic Chart Canvas with Scrollable & Draggable Panning */}
      <UnifiedOrgChartCanvas zoomLevel={zoomLevel}>
        {layoutMode === "flow" && <TopDownFlowChart {...commonChartProps} />}
        {layoutMode === "tree" && <HorizontalTreeChart {...commonChartProps} />}
        {layoutMode === "grid" && <DivisionGridChart {...commonChartProps} />}
      </UnifiedOrgChartCanvas>

      {/* Node Detail Spotlight Drawer */}
      {selectedNode && (
        <UnifiedSpotlight
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onAssignLeadership={onAssignLeadership}
        />
      )}
    </div>
  );
}
