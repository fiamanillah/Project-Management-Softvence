"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Plus, Pencil, ArrowRight } from "lucide-react";
import type { DepartmentWithCapabilities } from "../DepartmentTable";
import type { TreeNode } from "./types";

interface NodeDetailSpotlightProps {
  selectedNode: TreeNode;
  onClose: () => void;
  onEdit: (department: DepartmentWithCapabilities) => void;
  onAddSubDepartment: (parentDepartment: DepartmentWithCapabilities) => void;
}

export function NodeDetailSpotlight({
  selectedNode,
  onClose,
  onEdit,
  onAddSubDepartment,
}: NodeDetailSpotlightProps) {
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
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30 font-bold">
            {selectedNode.department.code}
          </Badge>
          <h3 className="font-bold text-foreground text-base truncate">
            {selectedNode.department.name}
          </h3>
          {selectedNode.depth === 0 ? (
            <Badge variant="default" className="text-xs">Root Division</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Level {selectedNode.depth} Sub-Unit
            </Badge>
          )}
        </div>

        {/* Ancestry Path */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">Hierarchy Path:</span>
          {ancestryPath.map((step, idx, arr) => (
            <span key={step.department.id} className="inline-flex items-center gap-1">
              <span className={idx === arr.length - 1 ? "font-semibold text-primary" : ""}>
                {step.department.name}
              </span>
              {idx < arr.length - 1 && <ArrowRight className="size-3 text-muted-foreground/60" />}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => onAddSubDepartment(selectedNode.department)}
          className="h-8 text-xs"
        >
          <Plus className="mr-1.5 size-3.5" /> Add Sub-Department
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(selectedNode.department)}
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
