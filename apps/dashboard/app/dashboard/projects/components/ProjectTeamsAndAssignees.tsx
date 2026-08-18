"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import {
  UsersRound,
  Building2,
  Clock,
  Crown,
  Mail,
  StickyNote,
  User as UserIcon,
} from "lucide-react";
import type {
  ProjectTeamAssignmentItem,
  ProjectUserAssignmentItem,
} from "@workspace/shared";

interface ProjectTeamsAndAssigneesProps {
  teamAssignments?: ProjectTeamAssignmentItem[];
  userAssignments?: ProjectUserAssignmentItem[];
  maxVisibleTeams?: number;
  maxVisibleUsers?: number;
  compact?: boolean;
  className?: string;
}

function getUserInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.trim()?.[0] || "";
  const l = lastName?.trim()?.[0] || "";
  return (f + l).toUpperCase() || "U";
}

function getTeamInitials(name?: string): string {
  if (!name) return "TM";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  if (first && second) {
    return `${first}${second}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ProjectTeamsAndAssignees({
  teamAssignments = [],
  userAssignments = [],
  maxVisibleTeams = 2,
  maxVisibleUsers = 3,
  compact = false,
  className = "",
}: ProjectTeamsAndAssigneesProps) {
  // Filter only active assignments
  const activeTeams = React.useMemo(
    () => teamAssignments.filter((ta) => !ta.unassignedAt),
    [teamAssignments],
  );

  const activeUsers = React.useMemo(
    () => userAssignments.filter((ua) => !ua.unassignedAt),
    [userAssignments],
  );

  const visibleTeams = activeTeams.slice(0, maxVisibleTeams);
  const remainingTeams = activeTeams.slice(maxVisibleTeams);
  const remainingTeamsCount = remainingTeams.length;

  const visibleUsers = activeUsers.slice(0, maxVisibleUsers);
  const remainingUsers = activeUsers.slice(maxVisibleUsers);
  const remainingUsersCount = remainingUsers.length;

  const hasTeams = activeTeams.length > 0;
  const hasUsers = activeUsers.length > 0;

  if (!hasTeams && !hasUsers) {
    return (
      <div
        className={`flex items-center gap-1.5 text-[11px] text-muted-foreground/70 italic ${className}`}
        aria-label="No teams or members assigned"
      >
        <UsersRound className="size-3.5 opacity-50" aria-hidden="true" />
        <span>Unassigned</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 flex-wrap ${className}`}
      role="group"
      aria-label="Assigned teams and members"
    >
      {/* 1. Teams Presentation (Avatar Stack) */}
      {hasTeams && (
        <div className="flex items-center -space-x-1.5 overflow-visible">
          {visibleTeams.map((ta) => {
            const team = ta.team;
            const teamName = team?.name || "Unnamed Team";
            const deptName = team?.department?.name;
            const deptCode = team?.department?.code;
            const shift = team?.shift;
            const initials = getTeamInitials(teamName);

            return (
              <Tooltip key={ta.id}>
                <TooltipTrigger
                  type="button"
                  aria-label={`Team: ${teamName}${deptName ? `, Department: ${deptName}` : ""}${shift ? `, Shift: ${shift}` : ""}`}
                  className="relative group/team focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-md cursor-help hover:z-20 transition-transform hover:scale-110"
                >
                  <Avatar className="size-6 rounded-md border-2 border-background ring-1 ring-border/80 shadow-2xs">
                    {team?.avatarUrl && (
                      <AvatarImage
                        src={team.avatarUrl}
                        alt={teamName}
                        className="rounded-md object-cover"
                      />
                    )}
                    <AvatarFallback className="rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[9px] font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  variant="card"
                  className="w-72 shadow-2xl"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent p-3 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-9 rounded-lg border-2 border-background ring-1 ring-blue-500/30 shadow-xs shrink-0">
                        {team?.avatarUrl && (
                          <AvatarImage
                            src={team.avatarUrl}
                            alt={teamName}
                            className="rounded-lg object-cover"
                          />
                        )}
                        <AvatarFallback className="rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-700 dark:text-blue-300 font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-foreground truncate">{teamName}</p>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shrink-0 font-normal">
                            Team
                          </Badge>
                        </div>
                        {team?.slug && (
                          <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
                            @{team.slug}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-3 space-y-2 bg-card/50">
                    {deptName && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Building2 className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                          <span className="text-[11px] font-medium text-foreground truncate">{deptName}</span>
                          {deptCode && (
                            <Badge variant="secondary" className="font-mono text-[9px] px-1 py-0 shrink-0">
                              {deptCode}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {shift && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Clock className="size-3.5" />
                        </div>
                        <div className="text-[11px]">
                          <span className="text-muted-foreground">Shift: </span>
                          <span className="font-medium text-foreground">{shift}</span>
                        </div>
                      </div>
                    )}

                    {ta.note && (
                      <div className="mt-2 p-2 rounded-lg bg-muted/60 border border-border/50 text-[10px] text-muted-foreground flex items-start gap-1.5 italic">
                        <StickyNote className="size-3 text-primary shrink-0 mt-0.5" />
                        <span>{ta.note}</span>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Teams Overflow (+N) */}
          {remainingTeamsCount > 0 && (
            <Tooltip>
              <TooltipTrigger
                type="button"
                aria-label={`+${remainingTeamsCount} more teams assigned`}
                className="relative z-10 flex items-center justify-center size-6 rounded-md bg-muted border-2 border-background ring-1 ring-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-help hover:scale-105"
              >
                +{remainingTeamsCount}
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                variant="card"
                className="w-80 shadow-2xl"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent p-3 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <UsersRound className="size-3.5" />
                    </div>
                    <span className="font-bold text-xs text-foreground">Assigned Teams</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono font-semibold px-2 py-0.5">
                    {remainingTeamsCount} more
                  </Badge>
                </div>

                {/* List */}
                <div className="p-2 space-y-1.5 max-h-56 overflow-y-auto bg-card/40">
                  {remainingTeams.map((ta) => {
                    const t = ta.team;
                    const initials = getTeamInitials(t?.name);
                    return (
                      <div
                        key={ta.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-card/60 hover:bg-muted/60 border border-border/50 transition-colors"
                      >
                        <Avatar className="size-7 rounded-md border border-primary/20 shrink-0">
                          {t?.avatarUrl && (
                            <AvatarImage
                              src={t.avatarUrl}
                              alt={t?.name || "Team"}
                              className="rounded-md object-cover"
                            />
                          )}
                          <AvatarFallback className="rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-semibold text-foreground truncate text-xs">
                              {t?.name || "Team"}
                            </p>
                            {t?.shift && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0 font-normal">
                                {t.shift}
                              </Badge>
                            )}
                          </div>
                          {t?.department?.name && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                              <span>{t.department.name}</span>
                              {t.department.code && (
                                <span className="font-mono opacity-80">({t.department.code})</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Divider if both teams and users exist */}
      {hasTeams && hasUsers && !compact && (
        <div className="h-4 w-px bg-border/80 shrink-0" aria-hidden="true" />
      )}

      {/* 2. Assignees (Users) Avatar Stack */}
      {hasUsers && (
        <div className="flex items-center -space-x-1.5 overflow-visible">
          {visibleUsers.map((ua) => {
            const user = ua.user;
            const role = ua.role;
            const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Assignee";
            const initials = getUserInitials(user?.firstName, user?.lastName);
            const isLead = role?.qualifiesForTeamScope;

            return (
              <Tooltip key={ua.id}>
                <TooltipTrigger
                  type="button"
                  aria-label={`Assignee: ${fullName}, Role: ${role?.name || "Member"}${isLead ? " (Lead)" : ""}`}
                  className="relative group/avatar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-full cursor-help hover:z-20 transition-transform hover:scale-110"
                >
                  <Avatar className="size-6 border-2 border-background ring-1 ring-border/80 shadow-2xs">
                    {user?.avatarUrl && (
                      <AvatarImage
                        src={user.avatarUrl}
                        alt={fullName}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="text-[9px] bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {isLead && (
                    <span
                      className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-500 text-white flex items-center justify-center ring-1 ring-background shadow-2xs"
                      title="Team Lead"
                      aria-hidden="true"
                    >
                      <Crown className="size-2" />
                    </span>
                  )}
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  variant="card"
                  className="w-72 shadow-2xl"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-purple-500/15 via-primary/10 to-transparent p-3 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-9 border-2 border-background ring-1 ring-purple-500/30 shadow-xs shrink-0">
                        {user?.avatarUrl && (
                          <AvatarImage
                            src={user.avatarUrl}
                            alt={fullName}
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-primary/20 text-primary font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-foreground truncate">{fullName}</p>
                          {isLead && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] gap-0.5 px-1 py-0 font-medium shrink-0">
                              <Crown className="size-2.5" /> Lead
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-muted-foreground truncate mt-0.5">
                          {role?.name || "Project Member"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-3 space-y-2 bg-card/50">
                    {user?.email && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Mail className="size-3.5" />
                        </div>
                        <span className="font-mono text-[11px] text-foreground truncate select-all">
                          {user.email}
                        </span>
                      </div>
                    )}

                    {user?.employeeId && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <UserIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            ID: <span className="font-semibold text-foreground">{user.employeeId}</span>
                          </span>
                          {user?.systemRole && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
                              {user.systemRole}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {ua.note && (
                      <div className="mt-2 p-2 rounded-lg bg-muted/60 border border-border/50 text-[10px] text-muted-foreground flex items-start gap-1.5 italic">
                        <StickyNote className="size-3 text-primary shrink-0 mt-0.5" />
                        <span>{ua.note}</span>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Assignees Overflow (+N) */}
          {remainingUsersCount > 0 && (
            <Tooltip>
              <TooltipTrigger
                type="button"
                aria-label={`+${remainingUsersCount} more assignees`}
                className="relative z-10 flex items-center justify-center size-6 rounded-full bg-muted border-2 border-background ring-1 ring-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-help hover:scale-105"
              >
                +{remainingUsersCount}
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="center"
                variant="card"
                className="w-80 shadow-2xl"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-500/15 via-primary/10 to-transparent p-3 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <UserIcon className="size-3.5" />
                    </div>
                    <span className="font-bold text-xs text-foreground">Assigned Members</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono font-semibold px-2 py-0.5">
                    {remainingUsersCount} more
                  </Badge>
                </div>

                {/* List */}
                <div className="p-2 space-y-1.5 max-h-56 overflow-y-auto bg-card/40">
                  {remainingUsers.map((ua) => {
                    const u = ua.user;
                    const r = ua.role;
                    const name = `${u?.firstName || ""} ${u?.lastName || ""}`.trim() || "Member";
                    const initials = getUserInitials(u?.firstName, u?.lastName);
                    const isLead = r?.qualifiesForTeamScope;

                    return (
                      <div
                        key={ua.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-card/60 hover:bg-muted/60 border border-border/50 transition-colors"
                      >
                        <Avatar className="size-7 border border-primary/20 shrink-0">
                          {u?.avatarUrl && (
                            <AvatarImage
                              src={u.avatarUrl}
                              alt={name}
                              className="object-cover"
                            />
                          )}
                          <AvatarFallback className="bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-semibold text-foreground truncate text-xs flex items-center gap-1">
                              {name}
                              {isLead && <Crown className="size-2.5 text-amber-500 shrink-0" />}
                            </p>
                            <Badge
                              variant={isLead ? "default" : "outline"}
                              className={`text-[9px] px-1 py-0 shrink-0 font-normal ${
                                isLead
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  : ""
                              }`}
                            >
                              {r?.name || "Member"}
                            </Badge>
                          </div>
                          {u?.email && (
                            <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                              {u.email}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}
