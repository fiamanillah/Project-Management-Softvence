"use client";

import * as React from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  GitFork,
  Plus,
  ArrowUpRight,
  CornerDownRight,
  ExternalLink,
  Briefcase,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  UsersRound,
} from "lucide-react";
import type { ProjectDetailItem, ProjectItem } from "@workspace/shared";
import { PermissionGate } from "@/components/permission-gate/PermissionGate";

interface ProjectHierarchyTabProps {
  project: ProjectDetailItem | ProjectItem;
  canViewFinancials: boolean;
  onSelectProject?: (project: ProjectItem) => void;
  onAddSubProject?: (parentProject: ProjectItem) => void;
}

export function ProjectHierarchyTab({
  project,
  canViewFinancials,
  onSelectProject,
  onAddSubProject,
}: ProjectHierarchyTabProps) {
  const p = project;
  const parent = p.parentProject;
  const subProjects = (p as any).subProjects || [];

  return (
    <div className="space-y-6">
      {/* 1. Parent Project Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <GitFork className="size-4 rotate-180" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Parent Project & Master Order
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Root contract or umbrella initiative this deliverable belongs to
              </p>
            </div>
          </div>
        </div>

        {parent ? (
          <Card className="border bg-blue-500/5 border-blue-500/20 shadow-2xs">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-foreground px-2 py-0.5 bg-background border rounded">
                    {parent.projectName}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                    Order: {parent.orderId}
                  </span>
                  {parent.status && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold"
                      style={{
                        borderColor: parent.status.color ? `${parent.status.color}50` : undefined,
                        backgroundColor: parent.status.color ? `${parent.status.color}15` : undefined,
                        color: parent.status.color || undefined,
                      }}
                    >
                      {parent.status.name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pt-0.5">
                  Linked parent platform order reference: <span className="font-mono font-medium text-foreground">{p.parentOrderId || parent.orderId}</span>
                </p>
              </div>

              {onSelectProject && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectProject(parent as any)}
                  className="text-xs h-8 gap-1.5 shrink-0 bg-background"
                >
                  View Parent Project <ArrowUpRight className="size-3.5" />
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-dashed bg-card/30">
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-xs font-medium text-muted-foreground">This is a top-level standalone project</p>
              <p className="text-[11px] text-muted-foreground">
                It is not nested under any parent project or master order.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. Nested Sub-Projects & Child Orders Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <GitFork className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nested Sub-Projects & Sub-Orders ({subProjects.length})
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Subsequent milestones, add-on orders, or child deliverables linked to this project
              </p>
            </div>
          </div>

          <PermissionGate code="project.create">
            {onAddSubProject && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddSubProject(p as any)}
                className="text-xs h-8 gap-1.5"
              >
                <Plus className="size-3.5" /> Add Sub-Project
              </Button>
            )}
          </PermissionGate>
        </div>

        {subProjects.length > 0 ? (
          <div className="space-y-2">
            {subProjects.map((child: any) => {
              const childTeams = child.teamAssignments?.filter((ta: any) => !ta.unassignedAt) || [];
              return (
                <Card
                  key={child.id}
                  className="border bg-card/60 hover:bg-muted/30 transition-all cursor-pointer group shadow-2xs"
                  onClick={() => onSelectProject?.(child)}
                >
                  <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground mt-0.5">
                        <CornerDownRight className="size-4 text-emerald-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {child.projectName}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                            Order: {child.orderId}
                          </span>
                          {child.status && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold"
                              style={{
                                borderColor: child.status.color ? `${child.status.color}50` : undefined,
                                backgroundColor: child.status.color ? `${child.status.color}15` : undefined,
                                color: child.status.color || undefined,
                              }}
                            >
                              {child.status.name}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          {child.deliveryDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3 text-muted-foreground" />
                              Due: {new Date(child.deliveryDate).toLocaleDateString()}
                            </span>
                          )}
                          {childTeams.length > 0 && (
                            <span className="flex items-center gap-1">
                              <UsersRound className="size-3 text-muted-foreground" />
                              {childTeams.map((ta: any) => ta.team?.name).filter(Boolean).join(", ")}
                            </span>
                          )}
                          {canViewFinancials && child.value !== null && (
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              ${Number(child.value).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      <span>View details</span>
                      <ChevronRight className="size-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border border-dashed bg-card/30">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                <GitFork className="size-5" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h5 className="text-xs font-semibold text-foreground">No nested sub-projects yet</h5>
                <p className="text-[11px] text-muted-foreground">
                  If this project expands into multiple platform orders or distinct deliverable phases, create nested sub-projects to coordinate them under this parent.
                </p>
              </div>

              <PermissionGate code="project.create">
                {onAddSubProject && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddSubProject(p as any)}
                    className="text-xs h-8 gap-1.5 mt-2"
                  >
                    <Plus className="size-3.5" /> Create First Sub-Project
                  </Button>
                )}
              </PermissionGate>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
