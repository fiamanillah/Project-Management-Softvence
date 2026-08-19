"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Plus, Pencil, ArrowRight, UserCheck, Building2, MapPin, Mail, Phone } from "lucide-react";
import type { BranchWithCapabilities, TreeNode } from "./types";

interface NodeDetailSpotlightProps {
  selectedNode: TreeNode;
  onClose: () => void;
  onEdit: (branch: BranchWithCapabilities) => void;
  onAddSubBranch: (parentBranch: BranchWithCapabilities) => void;
}

export function NodeDetailSpotlight({
  selectedNode,
  onClose,
  onEdit,
  onAddSubBranch,
}: NodeDetailSpotlightProps) {
  const { branch, depth } = selectedNode;
  const activeManagers = branch.managers?.filter((m) => !m.unassignedAt) || [];

  const ancestryPath = React.useMemo(() => {
    const path: TreeNode[] = [];
    let curr: TreeNode | undefined = selectedNode;
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
            {branch.code}
          </Badge>
          <h3 className="font-bold text-foreground text-base truncate">
            {branch.name}
          </h3>
          {depth === 0 ? (
            <Badge variant="default" className="text-xs">Enterprise Root Branch</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Level {depth} Sub-Hub
            </Badge>
          )}
        </div>

        {/* Ancestry Path */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">Corporate Path:</span>
          {ancestryPath.map((step, idx, arr) => (
            <span key={step.branch.id} className="inline-flex items-center gap-1">
              <span className={idx === arr.length - 1 ? "font-semibold text-primary" : ""}>
                {step.branch.name}
              </span>
              {idx < arr.length - 1 && <ArrowRight className="size-3 text-muted-foreground/60" />}
            </span>
          ))}
        </div>

        {/* Metadata pills */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
          {activeManagers.length > 0 && (
            <span className="inline-flex items-center gap-1 text-foreground font-medium">
              <UserCheck className="size-3.5 text-primary" />
              {activeManagers[0]?.user?.firstName} {activeManagers[0]?.user?.lastName}
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-mono">
            <Building2 className="size-3.5 text-primary" />
            {branch._count?.departments ?? 0} Departments Hosted
          </span>
          {branch.email && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px]">
              <Mail className="size-3" /> {branch.email}
            </span>
          )}
          {branch.phone && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px]">
              <Phone className="size-3" /> {branch.phone}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => onAddSubBranch(branch)}
          className="h-8 text-xs"
        >
          <Plus className="mr-1.5 size-3.5" /> Add Sub-Branch
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(branch)}
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
