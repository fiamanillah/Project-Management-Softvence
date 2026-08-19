"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { GitBranch, Building2, Users, Plus, Layers } from "lucide-react";
import type { CommonChartProps } from "./types";

export function DivisionGridChart({
  roots,
  selectedNode,
  onSelectNode,
  onAddChild,
  onEdit,
  onAssignLeadership,
}: CommonChartProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-4 max-w-7xl mx-auto">
      {roots.map((root) => {
        const isSelected = selectedNode?.node.id === root.node.id;
        const isBranch = root.node.type === "BRANCH";

        return (
          <div
            key={root.node.id}
            onClick={() => onSelectNode(root)}
            className={`rounded-2xl border bg-card/90 shadow-sm p-4 space-y-4 hover:border-primary/40 transition-all cursor-pointer ${
              isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary" : ""
            }`}
          >
            {/* Division Card Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`size-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                    isBranch ? "bg-indigo-500/10 text-indigo-600" : "bg-emerald-500/10 text-emerald-600"
                  }`}
                >
                  {isBranch ? <GitBranch className="size-4" /> : <Building2 className="size-4" />}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-foreground text-sm truncate">
                    {root.node.name}
                  </h4>
                  <p className="font-mono text-xs text-primary font-semibold">
                    {root.node.code}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 shrink-0">
                {root.children.length} Nested Units
              </Badge>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-muted/40 border">
                <p className="text-[10px] text-muted-foreground">{isBranch ? "Depts" : "Teams"}</p>
                <p className="font-bold text-foreground mt-0.5">
                  {isBranch ? (root.node.counts.departments ?? 0) : (root.node.counts.teams ?? 0)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border">
                <p className="text-[10px] text-muted-foreground">{isBranch ? "Sub-Hubs" : "Sub-Depts"}</p>
                <p className="font-bold text-foreground mt-0.5">
                  {isBranch ? (root.node.counts.subBranches ?? 0) : (root.node.counts.subDepartments ?? 0)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border">
                <p className="text-[10px] text-muted-foreground">Leads</p>
                <p className="font-bold text-foreground mt-0.5">
                  {root.node.managers?.length ?? 0}
                </p>
              </div>
            </div>

            {/* Children List Preview */}
            {root.children.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Hosted Units & Sub-Divisions
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {root.children.map((child) => (
                    <div
                      key={child.node.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(child);
                      }}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/70 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {child.node.type === "BRANCH" && <GitBranch className="size-3 text-indigo-500 shrink-0" />}
                        {child.node.type === "DEPARTMENT" && <Building2 className="size-3 text-emerald-500 shrink-0" />}
                        {child.node.type === "TEAM" && <Users className="size-3 text-amber-500 shrink-0" />}
                        <span className="font-medium truncate">{child.node.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                        {child.node.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="pt-2 border-t flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              {isBranch ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddChild(root.node, "DEPARTMENT")}
                  className="h-7 text-xs px-2"
                >
                  <Plus className="mr-1 size-3 text-emerald-500" /> Dept
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddChild(root.node, "TEAM")}
                  className="h-7 text-xs px-2"
                >
                  <Plus className="mr-1 size-3 text-amber-500" /> Team
                </Button>
              )}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(root.node)}
                  className="h-7 text-xs px-2"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAssignLeadership(root.node)}
                  className="h-7 text-xs px-2"
                >
                  Lead
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
