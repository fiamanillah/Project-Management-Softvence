"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import {
  Users,
  Crown,
  Mail,
  StickyNote,
  User as UserIcon,
  Briefcase,
} from "lucide-react";
import type { TeamMemberItem } from "@workspace/shared";

interface TeamMembersAndLeadsProps {
  members?: TeamMemberItem[];
  leads?: TeamMemberItem[];
  maxVisible?: number;
  showLeadBadge?: boolean;
  compact?: boolean;
  className?: string;
}

function getUserInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.trim()?.[0] || "";
  const l = lastName?.trim()?.[0] || "";
  return (f + l).toUpperCase() || "U";
}

export function TeamMembersAndLeads({
  members = [],
  leads,
  maxVisible = 4,
  showLeadBadge = true,
  compact = false,
  className = "",
}: TeamMembersAndLeadsProps) {
  // Active members only
  const activeMembers = React.useMemo(() => {
    const list = members.filter((m) => !m.leftAt);
    // Sort so Leads appear first
    return list.sort((a, b) => {
      const aIsLead = a.role?.qualifiesForTeamScope ? 1 : 0;
      const bIsLead = b.role?.qualifiesForTeamScope ? 1 : 0;
      return bIsLead - aIsLead;
    });
  }, [members]);

  const activeLeads = React.useMemo(() => {
    if (leads && leads.length > 0) return leads.filter((l) => !l.leftAt);
    return activeMembers.filter((m) => m.role?.qualifiesForTeamScope);
  }, [leads, activeMembers]);

  const visibleMembers = activeMembers.slice(0, maxVisible);
  const remainingMembers = activeMembers.slice(maxVisible);
  const remainingCount = remainingMembers.length;

  if (activeMembers.length === 0) {
    return (
      <div
        className={`flex items-center gap-1.5 text-[11px] text-muted-foreground/70 italic ${className}`}
        aria-label="No members assigned to this team"
      >
        <Users className="size-3.5 opacity-50" aria-hidden="true" />
        <span>No members</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 flex-wrap ${className}`}
      role="group"
      aria-label="Team members and leads"
    >
      {/* 1. Avatar Stack */}
      <div className="flex items-center -space-x-1.5 overflow-visible">
        {visibleMembers.map((member) => {
          const user = member.user;
          const role = member.role;
          const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Team Member";
          const initials = getUserInitials(user?.firstName, user?.lastName);
          const isLead = role?.qualifiesForTeamScope;

          return (
            <Tooltip key={member.id}>
              <TooltipTrigger
                type="button"
                aria-label={`Member: ${fullName}, Role: ${role?.name || "Member"}${isLead ? " (Team Lead)" : ""}`}
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
                        {role?.name || "Team Member"}
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

                  {user?.designation?.name && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="size-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Briefcase className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 truncate">
                        <span className="text-[11px] text-foreground font-medium truncate">
                          {user.designation.name}
                        </span>
                      </div>
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

                  {member.note && (
                    <div className="mt-2 p-2 rounded-lg bg-muted/60 border border-border/50 text-[10px] text-muted-foreground flex items-start gap-1.5 italic">
                      <StickyNote className="size-3 text-primary shrink-0 mt-0.5" />
                      <span>{member.note}</span>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Overflow (+N) */}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label={`+${remainingCount} more team members`}
              className="relative z-10 flex items-center justify-center size-6 rounded-full bg-muted border-2 border-background ring-1 ring-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-help hover:scale-105"
            >
              +{remainingCount}
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
                    <Users className="size-3.5" />
                  </div>
                  <span className="font-bold text-xs text-foreground">Team Members</span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono font-semibold px-2 py-0.5">
                  {remainingCount} more
                </Badge>
              </div>

              {/* List */}
              <div className="p-2 space-y-1.5 max-h-56 overflow-y-auto bg-card/40">
                {remainingMembers.map((m) => {
                  const u = m.user;
                  const r = m.role;
                  const name = `${u?.firstName || ""} ${u?.lastName || ""}`.trim() || "Member";
                  const initials = getUserInitials(u?.firstName, u?.lastName);
                  const isLead = r?.qualifiesForTeamScope;

                  return (
                    <div
                      key={m.id}
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

      {/* 2. Optional Lead Tag badge */}
      {showLeadBadge && activeLeads[0] && (
        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-medium"
        >
          <Crown className="size-2.5 text-amber-500" />
          <span>{activeLeads[0].user?.firstName}</span>
        </Badge>
      )}
    </div>
  );
}
