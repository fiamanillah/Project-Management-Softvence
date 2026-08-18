"use client";

import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit2,
  UsersRound,
  Layers,
  Trash2,
  Lock,
  Calendar,
  DollarSign,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import type { ProjectItem } from "@workspace/shared";

interface ProjectCardGridProps {
  projects: ProjectItem[];
  isLoading?: boolean;
  onViewDetails: (project: ProjectItem) => void;
  onEdit: (project: ProjectItem) => void;
  onManageMembers: (project: ProjectItem) => void;
  onManageComponents: (project: ProjectItem) => void;
  onDelete: (project: ProjectItem) => void;
}

export function ProjectCardGrid({
  projects,
  isLoading,
  onViewDetails,
  onEdit,
  onManageMembers,
  onManageComponents,
  onDelete,
}: ProjectCardGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border bg-card/60 animate-pulse">
            <CardHeader className="p-4 space-y-2">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-5 w-48 bg-muted rounded" />
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground mb-3">
          <Briefcase className="size-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No projects found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          No projects match your active search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => {
        const caps = project._capabilities;
        const canViewClient = caps?.canViewClient ?? false;
        const canViewFinancials = caps?.canViewFinancials ?? false;

        const activeTeams = project.teamAssignments || [];
        const activeUsers = project.userAssignments || [];
        const componentsCount = project._count?.components ?? project.components?.length ?? 0;

        return (
          <Card
            key={project.id}
            className="border bg-card/60 backdrop-blur-xs shadow-2xs hover:shadow-md transition-all hover:border-primary/30 flex flex-col justify-between group cursor-pointer"
            onClick={() => onViewDetails(project)}
          >
            <div>
              {/* Header */}
              <CardHeader className="p-4 pb-2.5 flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[11px] text-muted-foreground font-semibold px-1.5 py-0.5 bg-muted/60 rounded">
                      {project.orderId}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium tracking-tight border px-1.5 py-0"
                      style={{
                        borderColor: project.status?.color ? `${project.status.color}40` : undefined,
                        backgroundColor: project.status?.color ? `${project.status.color}15` : undefined,
                        color: project.status?.color || undefined,
                      }}
                    >
                      {project.status?.name || "Unknown"}
                    </Badge>
                    {project.orderSource && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal bg-muted/40 text-muted-foreground">
                        {project.orderSource.name}
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-mono font-bold text-sm text-foreground tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {project.projectName}
                  </h4>
                  {project.parentProject && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono block">
                      ↳ Sub-project of {project.parentProject.projectName}
                    </span>
                  )}
                  {(project._count?.subProjects || 0) > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 font-normal">
                      {project._count?.subProjects} sub-orders
                    </Badge>
                  )}
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon" className="size-7 shrink-0">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Project Actions
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => onViewDetails(project)}
                        className="cursor-pointer gap-2"
                      >
                        <Eye className="size-4 text-primary" /> View Details
                      </DropdownMenuItem>

                      {caps?.canEdit && (
                        <DropdownMenuItem
                          onClick={() => onEdit(project)}
                          className="cursor-pointer gap-2"
                        >
                          <Edit2 className="size-4 text-blue-500" /> Edit Project
                        </DropdownMenuItem>
                      )}

                      {(caps?.canManageMembers || caps?.canReassign) && (
                        <DropdownMenuItem
                          onClick={() => onManageMembers(project)}
                          className="cursor-pointer gap-2"
                        >
                          <UsersRound className="size-4 text-purple-500" /> Manage Roster
                        </DropdownMenuItem>
                      )}

                      {caps?.canManageComponents && (
                        <DropdownMenuItem
                          onClick={() => onManageComponents(project)}
                          className="cursor-pointer gap-2"
                        >
                          <Layers className="size-4 text-amber-500" /> Manage Components
                        </DropdownMenuItem>
                      )}

                      {caps?.canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(project)}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4 text-destructive" /> Delete Project
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              {/* Content / Metadata */}
              <CardContent className="p-4 pt-1 space-y-3 text-xs">
                {/* Client & Financial info */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Client</span>
                    {canViewClient && project.client ? (
                      <div className="truncate">
                        <span className="font-medium text-foreground truncate block">
                          {project.client.name}
                        </span>
                        {(project.client.email || project.email) && (
                          <span className="font-mono text-[10px] text-muted-foreground truncate block" title={project.client.email || project.email || undefined}>
                            {project.client.email || project.email}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-muted/60 text-muted-foreground border-muted-foreground/20 text-[10px] gap-1 font-mono mt-0.5"
                      >
                        <Lock className="size-2.5 text-amber-500" /> Confidential
                      </Badge>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block">Value (Net)</span>
                    {canViewFinancials ? (
                      <div>
                        <span className="font-mono font-semibold text-foreground block">
                          ${Number(project.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {project.amount !== null && project.amount !== undefined && (
                          <span className="font-mono text-[10px] text-muted-foreground block">
                            Amt: ${Number(project.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {project.percentage !== null && project.percentage !== undefined ? ` (-${project.percentage}%)` : ""}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-muted/60 text-muted-foreground border-muted-foreground/20 text-[10px] gap-1 font-mono mt-0.5"
                      >
                        <Lock className="size-2.5 text-amber-500" /> Confidential
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Service Line & Components count */}
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="truncate max-w-[170px]" title={project.service || project.serviceLine?.name || "General Service"}>
                    {project.service || project.serviceLine?.name || "General Service"}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-normal gap-1 shrink-0">
                    <Layers className="size-3 text-primary" />
                    {componentsCount} {componentsCount === 1 ? "Component" : "Components"}
                  </Badge>
                </div>
              </CardContent>
            </div>

            {/* Footer */}
            <CardFooter className="p-4 pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              {/* Teams & User Avatars */}
              <div className="flex items-center gap-1.5 min-w-0">
                {activeTeams.length > 0 ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium bg-muted/60 text-foreground px-1.5 py-0 truncate max-w-[120px]"
                  >
                    <UsersRound className="size-2.5 mr-1 text-primary shrink-0" />
                    {activeTeams[0]?.team?.name}
                  </Badge>
                ) : (
                  <span className="text-[11px] italic">No team</span>
                )}

                {activeUsers.length > 0 && (
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {activeUsers.slice(0, 3).map((ua) => (
                      <Avatar key={ua.id} className="size-5 border border-background">
                        <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-bold">
                          {ua.user?.firstName?.[0]}
                          {ua.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
              </div>

              {/* Deadline */}
              {project.deliveryDate ? (
                <div className="flex items-center gap-1 text-[11px] shrink-0">
                  <Calendar className="size-3 text-primary/70" />
                  <span>
                    {new Date(project.deliveryDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] italic">No date</span>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
