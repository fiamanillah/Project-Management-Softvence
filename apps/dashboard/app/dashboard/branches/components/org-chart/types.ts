import * as React from "react";
import type { BranchItem } from "@workspace/shared";

export interface BranchCapabilities {
  canEdit?: boolean;
  canDelete?: boolean;
  canAssignManager?: boolean;
  canCreateSubBranch?: boolean;
}

export type BranchWithCapabilities = BranchItem & {
  _capabilities?: BranchCapabilities;
};

export interface TreeNode {
  branch: BranchWithCapabilities;
  depth: number;
  children: TreeNode[];
  parent?: TreeNode;
}

export type LayoutMode = "flow" | "tree" | "grid";
export type DepthFilter = "all" | "root" | "sub";

export interface BranchOrgChartProps {
  branches: BranchWithCapabilities[];
  onEdit: (branch: BranchWithCapabilities) => void;
  onAssignManager: (branch: BranchWithCapabilities) => void;
  onAddSubBranch: (parentBranch: BranchWithCapabilities) => void;
  onDelete: (branch: BranchWithCapabilities) => void;
}

export interface CommonChartProps {
  roots: TreeNode[];
  depthFilter: DepthFilter;
  expandedIds: Set<string>;
  selectedNode: TreeNode | null;
  onSelectNode: (node: TreeNode) => void;
  onToggleExpand: (id: string, e?: React.MouseEvent) => void;
  onEdit: (branch: BranchWithCapabilities) => void;
  onAssignManager: (branch: BranchWithCapabilities) => void;
  onAddSubBranch: (parentBranch: BranchWithCapabilities) => void;
  onDelete: (branch: BranchWithCapabilities) => void;
}
