"use client";

import * as React from "react";
import type { CommonChartProps, TreeNode } from "./types";
import { OrgCardNode } from "./OrgCardNode";

export function HorizontalTreeChart({
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
    <div className="flex flex-col gap-12 min-w-max p-8">
      {roots.map((root) => (
        <HorizontalNodeSubtree
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

function HorizontalNodeSubtree({
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
    <div className="flex items-center">
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

      {/* Horizontal Children Branches with Exact Connector Spine */}
      {hasChildren && isExpanded && depthFilter !== "root" && (
        <div className="flex items-center">
          {/* Horizontal line extending right from parent */}
          <div className="w-8 h-0.5 bg-primary/40 shrink-0" />

          {/* Children Vertical Stack */}
          <div className="flex flex-col justify-center">
            {node.children.map((child, index) => (
              <div
                key={child.department.id}
                className="relative flex items-center py-3 pl-8"
              >
                {/* Vertical Spine Line */}
                {total > 1 && (
                  <div
                    className={`absolute left-0 w-0.5 bg-primary/40 ${
                      index === 0
                        ? "top-1/2 bottom-0"
                        : index === total - 1
                        ? "top-0 bottom-1/2"
                        : "top-0 bottom-0"
                    }`}
                  />
                )}

                {/* Horizontal branch line into child card */}
                <div className="absolute left-0 top-1/2 w-8 h-0.5 bg-primary/40 -translate-y-1/2" />

                {/* Recursive child subtree */}
                <HorizontalNodeSubtree
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
