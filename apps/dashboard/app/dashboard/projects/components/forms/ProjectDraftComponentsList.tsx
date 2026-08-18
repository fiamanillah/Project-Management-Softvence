"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import type { ProjectStatusItem } from "@workspace/shared";
import { Layers, Plus, Trash2 } from "lucide-react";

export interface ProjectDraftComponentsListProps {
  components: { name: string; statusId: string }[];
  newComponentName: string;
  setNewComponentName: (val: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  statuses?: ProjectStatusItem[];
}

export function ProjectDraftComponentsList({
  components,
  newComponentName,
  setNewComponentName,
  onAdd,
  onRemove,
  statuses = [],
}: ProjectDraftComponentsListProps) {
  return (
    <div className="rounded-xl border bg-card/60 p-4 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="size-3.5 text-amber-500" /> Sub-deliverables & Components (Optional)
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {components.length} {components.length === 1 ? "component" : "components"}
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="e.g. Wireframes, Landing Page, Mobile App MVP..."
          value={newComponentName}
          onChange={(e) => setNewComponentName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          className="text-xs h-9 flex-1"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAdd}
          disabled={!newComponentName.trim()}
          className="text-xs h-9 gap-1"
        >
          <Plus className="size-3" /> Add
        </Button>
      </div>

      {components.length > 0 && (
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {components.map((comp, idx) => {
            const st = statuses.find((s) => s.id === comp.statusId);
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 border border-border/40 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate text-foreground">{comp.name}</span>
                  {st && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {st.name}
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
