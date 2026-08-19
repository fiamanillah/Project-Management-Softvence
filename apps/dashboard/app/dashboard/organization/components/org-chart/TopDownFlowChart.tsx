"use client";

import * as React from "react";
import type { CommonChartProps, UnifiedTreeNode } from "./types";
import { UnifiedCardNode } from "./UnifiedCardNode";

export function TopDownFlowChart({
  roots,
  depthFilter,
  expandedIds,
  selectedNode,
  onSelectNode,
  onToggleExpand,
  onAddChild,
  onEdit,
  onAssignLeadership,
  onDelete,
}: CommonChartProps) {
  return (
    <div className="flex flex-col gap-16 items-center min-w-max pb-12 pt-4 px-8 mx-auto">
      {roots.map((root) => (
        <FlowChartNodeSubtree
          key={root.node.id}
          treeNode={root}
          depthFilter={depthFilter}
          expandedIds={expandedIds}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
          onToggleExpand={onToggleExpand}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onAssignLeadership={onAssignLeadership}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function FlowChartNodeSubtree({
  treeNode,
  depthFilter,
  expandedIds,
  selectedNode,
  onSelectNode,
  onToggleExpand,
  onAddChild,
  onEdit,
  onAssignLeadership,
  onDelete,
}: {
  treeNode: UnifiedTreeNode;
  depthFilter: CommonChartProps["depthFilter"];
  expandedIds: Set<string>;
  selectedNode: UnifiedTreeNode | null;
  onSelectNode: (node: UnifiedTreeNode) => void;
  onToggleExpand: (id: string, e?: React.MouseEvent) => void;
  onAddChild: CommonChartProps["onAddChild"];
  onEdit: CommonChartProps["onEdit"];
  onAssignLeadership: CommonChartProps["onAssignLeadership"];
  onDelete: CommonChartProps["onDelete"];
}) {
  const hasChildren = treeNode.children.length > 0;
  const isExpanded = expandedIds.has(treeNode.node.id);
  const total = treeNode.children.length;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <UnifiedCardNode
        treeNode={treeNode}
        depthFilter={depthFilter}
        expandedIds={expandedIds}
        isSelected={selectedNode?.node.id === treeNode.node.id}
        onSelect={() => onSelectNode(treeNode)}
        onToggleExpand={(e) => onToggleExpand(treeNode.node.id, e)}
        onAddChild={onAddChild}
        onEdit={onEdit}
        onAssignLeadership={onAssignLeadership}
        onDelete={onDelete}
      />

      {/* Children Subtree with SVG/CSS Connectors */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center w-full">
          {/* Vertical Drop Line from Parent */}
          <div className="w-0.5 h-6 bg-primary/40" />

          {/* Children Row with Crossbars */}
          <div className="flex justify-center items-start">
            {treeNode.children.map((child, index) => (
              <div
                key={child.node.id}
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

                {/* Vertical Drop Line connecting to child card */}
                <div className="w-0.5 h-6 bg-primary/40" />

                {/* Recursive deeper child subtree */}
                <FlowChartNodeSubtree
                  treeNode={child}
                  depthFilter={depthFilter}
                  expandedIds={expandedIds}
                  selectedNode={selectedNode}
                  onSelectNode={onSelectNode}
                  onToggleExpand={onToggleExpand}
                  onAddChild={onAddChild}
                  onEdit={onEdit}
                  onAssignLeadership={onAssignLeadership}
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
