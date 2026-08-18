"use client";

import * as React from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  Layers,
  Plus,
  Settings2,
  UsersRound,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import type { ProjectDetailItem, ProjectItem } from "@workspace/shared";

interface ProjectComponentsTabProps {
  project: ProjectDetailItem | ProjectItem;
  canManageComponents: boolean;
  onManageComponents?: () => void;
}

export function ProjectComponentsTab({
  project,
  canManageComponents,
  onManageComponents,
}: ProjectComponentsTabProps) {
  const components = project.components || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Project Deliverable Components ({components.length})
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Granular modules, deliverables, and sub-workstreams for this project
          </p>
        </div>

        {canManageComponents && onManageComponents && (
          <Button
            size="sm"
            variant="outline"
            onClick={onManageComponents}
            className="text-xs h-8 gap-1.5"
          >
            <Settings2 className="size-3.5" /> Manage Components
          </Button>
        )}
      </div>

      {components.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {components.map((comp) => {
            const compTeams = comp.teamAssignments?.filter((ta) => !ta.unassignedAt) || [];
            const compMembers = comp.userAssignments?.filter((ua) => !ua.unassignedAt) || [];

            return (
              <Card key={comp.id} className="border bg-card/60 shadow-2xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h5 className="text-sm font-bold text-foreground">{comp.name}</h5>
                      <span className="text-[10px] text-muted-foreground">
                        Created {new Date(comp.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold"
                      style={{
                        borderColor: comp.status?.color ? `${comp.status.color}50` : undefined,
                        backgroundColor: comp.status?.color ? `${comp.status.color}15` : undefined,
                        color: comp.status?.color || undefined,
                      }}
                    >
                      {comp.status?.name || "Pending"}
                    </Badge>
                  </div>

                  {/* Component Assignments */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <UsersRound className="size-3.5" />
                      <span>{compTeams.length} Teams • {compMembers.length} Assignees</span>
                    </div>

                    {compMembers.length > 0 && (
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {compMembers.slice(0, 4).map((member) => (
                          <Avatar key={member.id} className="size-5 border border-background">
                            <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary">
                              {member.user.firstName[0]}
                              {member.user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border border-dashed bg-card/30">
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
              <Layers className="size-5" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h5 className="text-xs font-semibold text-foreground">No components defined</h5>
              <p className="text-[11px] text-muted-foreground">
                Break down this project into trackable components, functional modules, and deliverables.
              </p>
            </div>

            {canManageComponents && onManageComponents && (
              <Button
                size="sm"
                variant="outline"
                onClick={onManageComponents}
                className="text-xs h-8 gap-1.5 mt-2"
              >
                <Plus className="size-3.5" /> Add First Component
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
