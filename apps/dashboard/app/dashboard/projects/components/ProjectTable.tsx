"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import {
  MoreHorizontal,
  Eye,
  Edit2,
  UsersRound,
  Layers,
  Trash2,
  Lock,
  Calendar,
  Building2,
  Briefcase,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { ProjectItem } from "@workspace/shared";
import { ProjectTeamsAndAssignees } from "./ProjectTeamsAndAssignees";

interface ProjectTableProps {
  projects: ProjectItem[];
  isLoading?: boolean;
  onViewDetails: (project: ProjectItem) => void;
  onEdit: (project: ProjectItem) => void;
  onManageMembers: (project: ProjectItem) => void;
  onManageComponents: (project: ProjectItem) => void;
  onDelete: (project: ProjectItem) => void;
}

export function ProjectTable({
  projects,
  isLoading,
  onViewDetails,
  onEdit,
  onManageMembers,
  onManageComponents,
  onDelete,
}: ProjectTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card/60 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[280px]">Project & Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service Line</TableHead>
              <TableHead>Teams & Roster</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-5 w-40 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-28 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-5 w-8 bg-muted animate-pulse rounded ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
          No projects match your active search or filter criteria. Try adjusting your filters or create a new project.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card/60 overflow-hidden shadow-2xs">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="font-semibold text-xs text-foreground min-w-[240px]">
              Project Code / Order
            </TableHead>
            <TableHead className="font-semibold text-xs text-foreground">Status</TableHead>
            <TableHead className="font-semibold text-xs text-foreground">Client</TableHead>
            <TableHead className="font-semibold text-xs text-foreground">Service Line / Platform</TableHead>
            <TableHead className="font-semibold text-xs text-foreground">Teams & Assignees</TableHead>
            <TableHead className="font-semibold text-xs text-foreground">Value</TableHead>
            <TableHead className="font-semibold text-xs text-foreground">Delivery Date</TableHead>
            <TableHead className="font-semibold text-xs text-foreground text-right w-[80px]">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const caps = project._capabilities;
            const canViewClient = caps?.canViewClient ?? false;
            const canViewFinancials = caps?.canViewFinancials ?? false;

            const activeTeams = project.teamAssignments || [];
            const activeUsers = project.userAssignments || [];

            return (
              <TableRow
                key={project.id}
                className="hover:bg-muted/30 transition-colors group cursor-pointer"
                onClick={() => onViewDetails(project)}
              >
                {/* 1. Project Code & Order ID with Hierarchy Tag */}
                <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => onViewDetails(project)}
                      className="text-left font-mono font-bold text-sm text-foreground hover:text-primary transition-colors hover:underline flex items-center gap-1.5"
                    >
                      {project.projectName}
                    </button>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] text-muted-foreground font-semibold px-1.5 py-0.2 bg-muted/60 rounded">
                        {project.orderId}
                      </span>
                      {project.orderLink && (
                        <a
                          href={project.orderLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary inline-flex items-center"
                          title="Open platform order"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                      {project.parentProject && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono flex items-center gap-0.5" title={`Parent Order: ${project.parentProject.orderId}`}>
                          ↳ {project.parentProject.projectName}
                        </span>
                      )}
                      {project.orderSource && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal bg-muted/40 text-muted-foreground">
                          {project.orderSource.name}
                        </Badge>
                      )}
                      {(project._count?.subProjects || 0) > 0 && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 font-normal">
                          {project._count?.subProjects} sub-orders
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* 2. Dynamic Status */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-medium tracking-tight border px-2 py-0.5"
                    style={{
                      borderColor: project.status?.color ? `${project.status.color}40` : undefined,
                      backgroundColor: project.status?.color ? `${project.status.color}15` : undefined,
                      color: project.status?.color || undefined,
                    }}
                  >
                    {project.status?.name || "Unknown"}
                  </Badge>
                </TableCell>

                {/* 3. Client (Sensitive Field) */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {canViewClient && project.client ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground">
                        {project.client.name}
                      </span>
                      {(project.client.email || project.email) && (
                        <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[140px]" title={project.client.email || project.email || undefined}>
                          {project.client.email || project.email}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Badge
                            variant="outline"
                            className="bg-muted/60 text-muted-foreground border-muted-foreground/20 text-[10px] gap-1 font-mono cursor-help"
                          >
                            <Lock className="size-2.5 text-amber-500" />
                            Confidential
                          </Badge>
                        }
                      />
                      <TooltipContent side="top" className="text-xs">
                        Client details are restricted to authorized accounts
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>

                {/* 4. Service Line & Profile */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-medium text-foreground truncate max-w-[160px]" title={project.service || project.serviceLine?.name || "General"}>
                      {project.service || project.serviceLine?.name || "General"}
                    </span>
                    {canViewClient && project.profile?.username ? (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        {project.profile?.platform?.name}: <span className="font-mono">{project.profile?.username}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                        <Lock className="size-2.5" /> Protected Profile
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* 5. Teams & Assignees */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <ProjectTeamsAndAssignees
                    teamAssignments={project.teamAssignments}
                    userAssignments={project.userAssignments}
                    maxVisibleTeams={2}
                    maxVisibleUsers={3}
                  />
                </TableCell>

                {/* 6. Value (Sensitive Field) */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {canViewFinancials ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-bold text-foreground">
                        ${Number(project.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {project.amount !== null && project.amount !== undefined && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          Amt: ${Number(project.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {project.percentage !== null && project.percentage !== undefined ? ` (-${project.percentage}%)` : ""}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Badge
                            variant="outline"
                            className="bg-muted/60 text-muted-foreground border-muted-foreground/20 text-[10px] gap-1 font-mono cursor-help"
                          >
                            <Lock className="size-2.5 text-amber-500" />
                            Confidential
                          </Badge>
                        }
                      />
                      <TooltipContent side="top" className="text-xs">
                        Financial value is restricted by scoped permissions
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>

                {/* 7. Delivery Date */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {project.deliveryDate ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="size-3.5 text-primary/70 shrink-0" />
                      <span>
                        {new Date(project.deliveryDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No deadline</span>
                  )}
                </TableCell>

                {/* 8. Capabilities-based Actions */}
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu</span>
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
