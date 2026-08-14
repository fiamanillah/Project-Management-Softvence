"use client";

import * as React from "react";
import { Building2 } from "lucide-react";
import {
  type TreeNode,
  type DepartmentOrgChartProps,
  type LayoutMode,
  type DepthFilter,
  OrgChartControls,
  OrgChartCanvas,
  TopDownFlowChart,
  HorizontalTreeChart,
  DivisionGridChart,
  NodeDetailSpotlight,
} from "./org-chart";

export type { TreeNode, DepartmentOrgChartProps };

export function DepartmentOrgChart({
  departments,
  onEdit,
  onAssignManager,
  onAddSubDepartment,
  onDelete,
}: DepartmentOrgChartProps) {
  // Chart Display Layout Mode: "flow" (Top-Down), "tree" (Left-to-Right), "grid" (Matrix Cards)
  const [layoutMode, setLayoutMode] = React.useState<LayoutMode>("flow");
  const [zoomLevel, setZoomLevel] = React.useState<number>(100);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const [selectedNode, setSelectedNode] = React.useState<TreeNode | null>(null);
  const [depthFilter, setDepthFilter] = React.useState<DepthFilter>("all");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Build nested hierarchy tree from departments list
  const { rootNodes, totalSubDepts } = React.useMemo(() => {
    const deptMap = new Map<string, TreeNode>();

    departments.forEach((d) => {
      deptMap.set(d.id, { department: d, depth: 0, children: [] });
    });

    const roots: TreeNode[] = [];
    let subCount = 0;

    const assignDepths = (node: TreeNode, depth: number) => {
      node.depth = depth;
      node.children.forEach((c) => assignDepths(c, depth + 1));
    };

    departments.forEach((d) => {
      const node = deptMap.get(d.id)!;
      if (d.parentId && deptMap.has(d.parentId)) {
        const parentNode = deptMap.get(d.parentId)!;
        node.parent = parentNode;
        parentNode.children.push(node);
        subCount++;
      } else {
        roots.push(node);
      }
    });

    // Assign recursive depths
    roots.forEach((r) => assignDepths(r, 0));

    // Sort alphabetically
    const sortTree = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.department.name.localeCompare(b.department.name));
      nodes.forEach((n) => sortTree(n.children));
    };
    sortTree(roots);

    return { rootNodes: roots, totalSubDepts: subCount };
  }, [departments]);

  // Track expanded branches
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => {
    return new Set(departments.map((d) => d.id));
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
    setExpandedIds(new Set(departments.map((d) => d.id)));
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

  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center rounded-2xl border bg-card/60 backdrop-blur-sm shadow-xs">
        <Building2 className="size-12 text-muted-foreground/40 mb-3" />
        <h3 className="text-base font-semibold text-foreground">No Departments Found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          No departments match the current filter or search criteria.
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
    onEdit,
    onAssignManager,
    onAddSubDepartment,
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
      <OrgChartControls
        rootCount={rootNodes.length}
        subCount={totalSubDepts}
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
      <OrgChartCanvas zoomLevel={zoomLevel}>
        {layoutMode === "flow" && <TopDownFlowChart {...commonChartProps} />}
        {layoutMode === "tree" && <HorizontalTreeChart {...commonChartProps} />}
        {layoutMode === "grid" && <DivisionGridChart {...commonChartProps} />}
      </OrgChartCanvas>

      {/* Node Detail Spotlight Drawer / Banner */}
      {selectedNode && (
        <NodeDetailSpotlight
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onEdit={onEdit}
          onAddSubDepartment={onAddSubDepartment}
        />
      )}
    </div>
  );
}
