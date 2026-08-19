"use client";

import * as React from "react";
import type { CommonChartProps, TreeNode } from "./types";
import { BranchCardNode } from "./BranchCardNode";

export function TopDownFlowChart({
  roots,
  depthFilter,
  expandedIds,
  selectedNode,
  onSelectNode,
  onToggleExpand,
  onEdit,
  onAssignManager,
  onAddSubBranch,
  onDelete,
}: CommonChartProps) {
  return (
    <div className="flex flex-col gap-16 items-center min-w-max pb-12 pt-4 px-8 mx-auto">
      {roots.map((root) => (
        <FlowChartNodeSubtree
          key={root.branch.id}
          node={root}
          depthFilter={depthFilter}
          expandedIds={expandedIds}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
          onToggleExpand={onToggleExpand}
          onEdit={onEdit}
          onAssignManager={onAssignManager}
          onAddSubBranch={onAddSubBranch}
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
  onAddSubBranch,
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
  onAddSubBranch: CommonChartProps["onAddSubBranch"];
  onDelete: CommonChartProps["onDelete"];
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.branch.id);
  const total = node.children.length;

  return (
    <div className="flex flex-col items-center">
      {/* Current Branch Card Node */}
      <BranchCardNode
        node={node}
        depthFilter={depthFilter}
        expandedIds={expandedIds}
        isSelected={selectedNode?.branch.id === node.branch.id}
        onSelect={() => onSelectNode(node)}
        onToggleExpand={(e) => onToggleExpand(node.branch.id, e)}
        onEdit={onEdit}
        onAssignManager={onAssignManager}
        onAddSubBranch={onAddSubBranch}
        onDelete={onDelete}
      />

      {/* Children Subtree with Connectors */}
      {hasChildren && isExpanded && depthFilter !== "root" && (
        <div className="flex flex-col items-center w-full">
          {/* Vertical drop line down from parent */}
          <div className="w-0.5 h-6 bg-primary/40" />

          {/* Children Row with Crossbars */}
          <div className="flex justify-center items-start">
            {node.children.map((child, index) => (
              <div
                key={child.branch.id}
                className="relative flex flex-col items-center px-4"
              >
                {/* Horizontal Crossbar */}
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
                  onAddSubBranch={onAddSubBranch}
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
