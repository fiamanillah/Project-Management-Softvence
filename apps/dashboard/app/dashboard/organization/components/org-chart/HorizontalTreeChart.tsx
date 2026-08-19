"use client";

import * as React from "react";
import type { CommonChartProps, UnifiedTreeNode } from "./types";
import { UnifiedCardNode } from "./UnifiedCardNode";

export function HorizontalTreeChart({
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
    <div className="flex flex-col gap-12 min-w-max p-8">
      {roots.map((root) => (
        <HorizontalNodeSubtree
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

function HorizontalNodeSubtree({
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
    <div className="flex items-center">
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

      {/* Horizontal Children Branches with Spine Line */}
      {hasChildren && isExpanded && (
        <div className="flex items-center">
          {/* Horizontal line extending right from parent */}
          <div className="w-8 h-0.5 bg-primary/40 shrink-0" />

          {/* Children Vertical Stack */}
          <div className="flex flex-col justify-center">
            {treeNode.children.map((child, index) => (
              <div
                key={child.node.id}
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
