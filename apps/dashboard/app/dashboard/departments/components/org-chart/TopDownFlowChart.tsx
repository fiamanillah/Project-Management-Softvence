"use client";

import * as React from "react";
import type { CommonChartProps, TreeNode } from "./types";
import { OrgCardNode } from "./OrgCardNode";

export function TopDownFlowChart({
  roots,
  depthFilter,
  expandedIds,
  selectedNode,
  onSelectNode,
  onToggleExpand,
  onEdit,
  onAssignManager,
  onAddSubDepartment,
  onDelete,
}: CommonChartProps) {
  return (
    <div className="flex flex-col gap-16 items-center min-w-max pb-12 pt-4 px-8 mx-auto">
      {roots.map((root) => (
        <FlowChartNodeSubtree
          key={root.department.id}
          node={root}
          depthFilter={depthFilter}
          expandedIds={expandedIds}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
          onToggleExpand={onToggleExpand}
          onEdit={onEdit}
          onAssignManager={onAssignManager}
          onAddSubDepartment={onAddSubDepartment}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function FlowChartNodeSubtree({
  node,
  depthFilter,
  expandedIds,
  selectedNode,
  onSelectNode,
  onToggleExpand,
  onEdit,
  onAssignManager,
  onAddSubDepartment,
  onDelete,
}: {
  node: TreeNode;
  depthFilter: CommonChartProps["depthFilter"];
  expandedIds: Set<string>;
  selectedNode: TreeNode | null;
  onSelectNode: (node: TreeNode) => void;
  onToggleExpand: (id: string, e?: React.MouseEvent) => void;
  onEdit: CommonChartProps["onEdit"];
  onAssignManager: CommonChartProps["onAssignManager"];
  onAddSubDepartment: CommonChartProps["onAddSubDepartment"];
  onDelete: CommonChartProps["onDelete"];
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.department.id);
  const total = node.children.length;

  return (
    <div className="flex flex-col items-center">
      {/* Current Node Card */}
      <OrgCardNode
        node={node}
        depthFilter={depthFilter}
        expandedIds={expandedIds}
        isSelected={selectedNode?.department.id === node.department.id}
        onSelect={() => onSelectNode(node)}
        onToggleExpand={(e) => onToggleExpand(node.department.id, e)}
        onEdit={onEdit}
        onAssignManager={onAssignManager}
        onAddSubDepartment={onAddSubDepartment}
        onDelete={onDelete}
      />

      {/* Children Subtree with Exact Connectors */}
      {hasChildren && isExpanded && depthFilter !== "root" && (
        <div className="flex flex-col items-center w-full">
          {/* Vertical drop line down from parent */}
          <div className="w-0.5 h-6 bg-primary/40" />

          {/* Children Row with Mathematically Exact Crossbars */}
          <div className="flex justify-center items-start">
            {node.children.map((child, index) => (
              <div
                key={child.department.id}
                className="relative flex flex-col items-center px-4"
              >
                {/* Horizontal Crossbar for Multi-Child Groups */}
                {total > 1 && (
                  <div
                    className={`absolute top-0 h-0.5 bg-primary/40 ${
                      index === 0
                        ? "left-1/2 right-0"
                        : index === total - 1
                        ? "left-0 right-1/2"
                        : "left-0 right-0"
                    }`}
                  />
                )}

                {/* Vertical line connecting crossbar down to child card */}
                <div className="w-0.5 h-6 bg-primary/40" />

                {/* Recursive deeper child subtree */}
                <FlowChartNodeSubtree
                  node={child}
                  depthFilter={depthFilter}
                  expandedIds={expandedIds}
                  selectedNode={selectedNode}
                  onSelectNode={onSelectNode}
                  onToggleExpand={onToggleExpand}
                  onEdit={onEdit}
                  onAssignManager={onAssignManager}
                  onAddSubDepartment={onAddSubDepartment}
                  onDelete={onDelete}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
