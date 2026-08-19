"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Plus, Pencil, ArrowRight, UserCheck, Building2, GitBranch, Users, Mail, Phone, MapPin, ShieldCheck } from "lucide-react";
import type { UnifiedOrgNode, OrgNodeType } from "@workspace/shared";
import type { UnifiedTreeNode } from "./types";

interface UnifiedSpotlightProps {
  selectedNode: UnifiedTreeNode;
  onClose: () => void;
  onAddChild: (parentNode: UnifiedOrgNode, childType: OrgNodeType) => void;
  onEdit: (node: UnifiedOrgNode) => void;
  onAssignLeadership: (node: UnifiedOrgNode) => void;
}

export function UnifiedSpotlight({
  selectedNode,
  onClose,
  onAddChild,
  onEdit,
  onAssignLeadership,
}: UnifiedSpotlightProps) {
  const { node, depth } = selectedNode;
  const isBranch = node.type === "BRANCH";
  const isDepartment = node.type === "DEPARTMENT";
  const isTeam = node.type === "TEAM";

  const ancestryPath = React.useMemo(() => {
    const path: UnifiedTreeNode[] = [];
    let curr: UnifiedTreeNode | undefined = selectedNode;
    while (curr) {
      path.unshift(curr);
      curr = curr.parent;
    }
    return path;
  }, [selectedNode]);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-lg border-primary/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200">
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30 font-bold">
            {node.code}
          </Badge>
          <h3 className="font-bold text-foreground text-base truncate">
            {node.name}
          </h3>
          <Badge
            variant="secondary"
            className={`text-xs ${
              isBranch
                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                : isDepartment
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            {node.type}
          </Badge>
        </div>

        {/* Corporate Ancestry Breadcrumb Path */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">Hierarchy Path:</span>
          {ancestryPath.map((step, idx, arr) => (
            <span key={step.node.id} className="inline-flex items-center gap-1">
              <span className={idx === arr.length - 1 ? "font-semibold text-primary" : ""}>
                {step.node.name}
              </span>
              {idx < arr.length - 1 && <ArrowRight className="size-3 text-muted-foreground/60" />}
            </span>
          ))}
        </div>

        {/* Dynamic Metadata Pills */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
          {isBranch && (
            <>
              <span className="inline-flex items-center gap-1 font-mono">
                <Building2 className="size-3.5 text-emerald-500" />
                {node.counts.departments ?? 0} Hosted Departments
              </span>
              <span className="inline-flex items-center gap-1 font-mono">
                <GitBranch className="size-3.5 text-indigo-500" />
                {node.counts.subBranches ?? 0} Sub-Branches
              </span>
            </>
          )}
          {isDepartment && (
            <>
              <span className="inline-flex items-center gap-1 font-mono">
                <Users className="size-3.5 text-amber-500" />
                {node.counts.teams ?? 0} Teams
              </span>
              <span className="inline-flex items-center gap-1 font-mono">
                <Building2 className="size-3.5 text-emerald-500" />
                {node.counts.designations ?? 0} Designations
              </span>
            </>
          )}
          {isTeam && (
            <span className="inline-flex items-center gap-1 font-mono">
              <Users className="size-3.5 text-amber-500" />
              {node.counts.members ?? 0} Active Members
            </span>
          )}
          {node.email && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px]">
              <Mail className="size-3" /> {node.email}
            </span>
          )}
        </div>
      </div>

      {/* Quick Action Triggers */}
      <div className="flex items-center gap-2 shrink-0">
        {isBranch && (
          <Button
            size="sm"
            onClick={() => onAddChild(node, "DEPARTMENT")}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-1.5 size-3.5" /> Add Department
          </Button>
        )}
        {isDepartment && (
          <Button
            size="sm"
            onClick={() => onAddChild(node, "TEAM")}
            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus className="mr-1.5 size-3.5" /> Add Team
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(node)}
          className="h-8 text-xs"
        >
          <Pencil className="mr-1.5 size-3.5" /> Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 text-xs text-muted-foreground"
        >
          Close Spotlight
        </Button>
      </div>
    </div>
  );
}
