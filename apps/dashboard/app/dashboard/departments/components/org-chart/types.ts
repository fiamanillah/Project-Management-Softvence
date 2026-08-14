import * as React from "react";
import type { DepartmentWithCapabilities } from "../DepartmentTable";

export interface TreeNode {
  department: DepartmentWithCapabilities;
  depth: number;
  children: TreeNode[];
  parent?: TreeNode;
}

export type LayoutMode = "flow" | "tree" | "grid";
export type DepthFilter = "all" | "root" | "sub";

export interface DepartmentOrgChartProps {
  departments: DepartmentWithCapabilities[];
  onEdit: (department: DepartmentWithCapabilities) => void;
  onAssignManager: (department: DepartmentWithCapabilities) => void;
  onAddSubDepartment: (parentDepartment: DepartmentWithCapabilities) => void;
  onDelete: (department: DepartmentWithCapabilities) => void;
}

export interface CommonChartProps {
  roots: TreeNode[];
  depthFilter: DepthFilter;
  expandedIds: Set<string>;
  selectedNode: TreeNode | null;
  onSelectNode: (node: TreeNode) => void;
  onToggleExpand: (id: string, e?: React.MouseEvent) => void;
  onEdit: (department: DepartmentWithCapabilities) => void;
  onAssignManager: (department: DepartmentWithCapabilities) => void;
  onAddSubDepartment: (parentDepartment: DepartmentWithCapabilities) => void;
  onDelete: (department: DepartmentWithCapabilities) => void;
}
