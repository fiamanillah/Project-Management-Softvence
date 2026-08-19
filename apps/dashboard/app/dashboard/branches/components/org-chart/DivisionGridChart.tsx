"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { GitBranch, Layers, Building2, Plus } from "lucide-react";
import type { CommonChartProps } from "./types";

export function DivisionGridChart({
  roots,
  selectedNode,
  onSelectNode,
  onEdit,
  onAssignManager,
  onAddSubBranch,
}: CommonChartProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-4 max-w-7xl mx-auto">
      {roots.map((root) => {
        const isSelected = selectedNode?.branch.id === root.branch.id;

        return (
          <div
            key={root.branch.id}
            onClick={() => onSelectNode(root)}
            className={`rounded-2xl border bg-card/90 shadow-sm p-4 space-y-4 hover:border-primary/40 transition-all cursor-pointer ${
              isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary" : ""
            }`}
          >
            {/* Division Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  <GitBranch className="size-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-foreground text-sm truncate">
                    {root.branch.name}
                  </h4>
                  <p className="font-mono text-xs text-primary font-semibold">
                    {root.branch.code}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 shrink-0">
                {root.children.length} Sub-Branches
              </Badge>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-muted/40 border">
                <p className="text-[10px] text-muted-foreground">Sub-Hubs</p>
                <p className="font-bold text-foreground mt-0.5">{root.children.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border">
                <p className="text-[10px] text-muted-foreground">Departments</p>
                <p className="font-bold text-foreground mt-0.5">{root.branch._count?.departments ?? 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border">
                <p className="text-[10px] text-muted-foreground">Managers</p>
                <p className="font-bold text-foreground mt-0.5">
                  {root.branch.managers?.filter((m) => !m.unassignedAt).length ?? 0}
                </p>
              </div>
            </div>

            {/* Sub-branches list preview */}
            {root.children.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Nested Sub-Branches & Hubs
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {root.children.map((child) => (
                    <div
                      key={child.branch.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(child);
                      }}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/70 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Layers className="size-3 text-primary shrink-0" />
                        <span className="font-medium truncate">{child.branch.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                        {child.branch.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="pt-2 border-t flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddSubBranch(root.branch)}
                className="h-7 text-xs px-2"
              >
                <Plus className="mr-1 size-3" /> Sub-Branch
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(root.branch)}
                  className="h-7 text-xs px-2"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAssignManager(root.branch)}
                  className="h-7 text-xs px-2"
                >
                  Manager
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
