"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Progress } from "@workspace/ui/components/progress";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import {
  Calendar,
  Sparkles,
  Crown,
  Send,
  Building2,
  Users,
} from "lucide-react";
import type { ProjectWorkspaceItem } from "../types";

interface ProjectOverviewSectionProps {
  project: ProjectWorkspaceItem;
}

export function ProjectOverviewSection({ project }: ProjectOverviewSectionProps) {
  const onlineMembersCount = project.members.filter((m) => m.isOnline).length;

  return (
    <div className="space-y-4 p-4 text-xs">
      {/* 1. Progress & Delivery Timeline */}
      <div className="rounded-xl border border-border/60 bg-card/70 p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
            <Sparkles className="size-3 text-primary" /> Delivery Progress
          </span>
          <span className="font-bold text-primary font-mono">{project.progress}%</span>
        </div>
        <Progress value={project.progress} className="h-1.5" />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" /> Due: {project.deadline}
          </span>
          <span className="font-medium text-foreground">{project.serviceLine}</span>
        </div>
      </div>

      {/* 2. Commercial & Status Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/60 bg-card/70 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Status
          </span>
          <p className="font-semibold text-foreground mt-0.5 text-xs truncate">
            {project.status.name}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/70 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Priority
          </span>
          <p className="font-semibold text-foreground mt-0.5 text-xs truncate">
            {project.priority.name}
          </p>
        </div>

        {project.budget !== null && project.budget !== undefined && (
          <div className="rounded-xl border border-border/60 bg-card/70 p-2.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Budget
            </span>
            <p className="font-semibold text-foreground mt-0.5 text-xs font-mono">
              {typeof project.budget === "number" ? `$${project.budget.toLocaleString()}` : project.budget}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border/60 bg-card/70 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Source Platform
          </span>
          <p className="font-semibold text-foreground mt-0.5 text-xs truncate">
            {project.orderSource}
          </p>
        </div>
      </div>

      {/* 3. Assigned Teams Stack */}
      {project.teams && project.teams.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/70 p-3 space-y-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Assigned Teams ({project.teams.length})
          </span>
          <div className="space-y-1.5">
            {project.teams.map((tm) => (
              <div
                key={tm.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-[10px] shrink-0 font-mono">
                    {tm.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate leading-tight">
                      {tm.name}
                    </p>
                    {tm.departmentName && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {tm.departmentName} {tm.leadName ? `• Lead: ${tm.leadName}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/50 shrink-0">
                  {tm.memberCount} members
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Active Assignees & Roster */}
      <div className="rounded-xl border border-border/60 bg-card/70 p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Project Assignees ({project.members.length})
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {onlineMembersCount} online
          </span>
        </div>

        <div className="space-y-2">
          {project.members.map((member) => {
            const memberInitials = member.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0] ?? "")
              .join("")
              .toUpperCase();

            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <Avatar className="size-8 rounded-full ring-1 ring-border/50">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {memberInitials}
                      </AvatarFallback>
                    </Avatar>
                    {member.isOnline ? (
                      <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-1 ring-card" />
                    ) : (
                      <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-muted-foreground/40 ring-1 ring-card" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-xs text-foreground truncate leading-tight">
                        {member.name}
                      </p>
                      {member.role === "Tech Lead" || member.role === "Admin" ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="inline-flex">
                                <Crown className="size-3 text-amber-500 shrink-0" />
                              </span>
                            }
                          />
                          <TooltipContent side="top" className="text-xs">
                            {member.role}
                          </TooltipContent>
                        </Tooltip>
                      ) : member.role === "Sales Lead" ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="inline-flex">
                                <Send className="size-2.5 text-blue-500 shrink-0" />
                              </span>
                            }
                          />
                          <TooltipContent side="top" className="text-xs">
                            Sales Lead
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>

                    <p className="text-[10px] text-muted-foreground truncate">
                      {member.designation} {member.shift ? `• ${member.shift.split(" ")[0]}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-medium text-muted-foreground/80 bg-background/80 px-1.5 py-0.5 rounded border border-border/40">
                    {member.role}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
