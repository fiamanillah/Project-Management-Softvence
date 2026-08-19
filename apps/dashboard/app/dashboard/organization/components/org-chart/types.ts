import type { UnifiedOrgNode, OrgNodeType } from "@workspace/shared";

export type LayoutMode = "flow" | "tree" | "grid";
export type DepthFilter = "all" | "branch" | "dept" | "team";
export type NodeTypeFilter = "all" | "BRANCH" | "DEPARTMENT" | "TEAM";

export interface UnifiedTreeNode {
  node: UnifiedOrgNode;
  depth: number;
  parent?: UnifiedTreeNode;
  children: UnifiedTreeNode[];
}

export interface UnifiedOrgChartProps {
  nodes: UnifiedOrgNode[];
  onAddChild: (parentNode: UnifiedOrgNode, childType: OrgNodeType) => void;
  onEdit: (node: UnifiedOrgNode) => void;
  onAssignLeadership: (node: UnifiedOrgNode) => void;
  onDelete: (node: UnifiedOrgNode) => void;
}

export interface CommonChartProps {
  roots: UnifiedTreeNode[];
  depthFilter: DepthFilter;
  expandedIds: Set<string>;
  selectedNode: UnifiedTreeNode | null;
  onSelectNode: (node: UnifiedTreeNode) => void;
  onToggleExpand: (id: string, e?: React.MouseEvent) => void;
  onAddChild: (parentNode: UnifiedOrgNode, childType: OrgNodeType) => void;
  onEdit: (node: UnifiedOrgNode) => void;
  onAssignLeadership: (node: UnifiedOrgNode) => void;
  onDelete: (node: UnifiedOrgNode) => void;
}
