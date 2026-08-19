"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import {
  Crown,
  Mail,
  User as UserIcon,
  Briefcase,
  ShieldCheck,
  UserX,
} from "lucide-react";

export interface LeadershipUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string | null;
  employeeId?: string;
  systemRole?: string;
  designation?: {
    id?: string;
    code?: string;
    name?: string;
  } | null;
  designationName?: string | null;
}

export interface LeadershipItem {
  id: string;
  userId?: string;
  assignedAt?: string | Date;
  unassignedAt?: string | Date | null;
  fullName?: string;
  email?: string;
  avatarUrl?: string | null;
  employeeId?: string;
  systemRole?: string;
  designationName?: string | null;
  roleTitle?: string;
  isLead?: boolean;
  user?: LeadershipUser;
}

interface UnitLeadershipStackProps {
  items?: LeadershipItem[] | any[];
  singleLead?: LeadershipItem | any | null;
  roleTitle?: string;
  maxVisible?: number;
  showLeadBadge?: boolean;
  emptyLabel?: string;
  className?: string;
}

function getUserInitials(firstName?: string, lastName?: string, fallback = "U"): string {
  const f = firstName?.trim()?.[0] || "";
  const l = lastName?.trim()?.[0] || "";
  const res = (f + l).toUpperCase();
  return res || fallback.slice(0, 2).toUpperCase() || "U";
}

export function UnitLeadershipStack({
  items = [],
  singleLead = null,
  roleTitle = "Manager",
  maxVisible = 3,
  showLeadBadge = true,
  emptyLabel = "Unassigned",
  className = "",
}: UnitLeadershipStackProps) {
  // Normalize items to standard structure
  const activeLeaders = React.useMemo<LeadershipItem[]>(() => {
    if (singleLead) {
      const u = singleLead.user || singleLead;
      return [
        {
          id: singleLead.id || u.id || "lead",
          userId: singleLead.userId || u.id,
          fullName:
            singleLead.fullName ||
            `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
            u.email ||
            "Team Lead",
          email: singleLead.email || u.email || "",
          avatarUrl: singleLead.avatarUrl !== undefined ? singleLead.avatarUrl : u.avatarUrl,
          employeeId: singleLead.employeeId || u.employeeId,
          systemRole: singleLead.systemRole || u.systemRole,
          designationName:
            singleLead.designationName || u.designation?.name || u.designationName,
          roleTitle: singleLead.roleTitle || roleTitle || "Team Lead",
          isLead: true,
          user: u,
        },
      ];
    }

    if (!items || items.length === 0) return [];

    return items
      .filter((item) => !item.unassignedAt && !item.leftAt)
      .map((item) => {
        const u = item.user || item;
        const firstName = u.firstName || "";
        const lastName = u.lastName || "";
        const nameFromParts = `${firstName} ${lastName}`.trim();
        const fullName =
          item.fullName || nameFromParts || u.email || item.email || "Leader";

        return {
          id: item.id || u.id || Math.random().toString(),
          userId: item.userId || u.id,
          assignedAt: item.assignedAt,
          fullName,
          email: item.email || u.email || "",
          avatarUrl: item.avatarUrl !== undefined ? item.avatarUrl : u.avatarUrl,
          employeeId: item.employeeId || u.employeeId,
          systemRole: item.systemRole || u.systemRole,
          designationName:
            item.designationName || u.designation?.name || u.designationName,
          roleTitle: item.roleTitle || item.role?.name || roleTitle,
          isLead: item.isPrimary ?? item.isLead ?? true,
          user: u,
        };
      })
      .sort((a, b) => (b.isLead ? 1 : 0) - (a.isLead ? 1 : 0));
  }, [items, singleLead, roleTitle]);

  const visibleLeaders = activeLeaders.slice(0, maxVisible);
  const remainingLeaders = activeLeaders.slice(maxVisible);
  const remainingCount = remainingLeaders.length;

  if (activeLeaders.length === 0) {
    return (
      <div
        className={`flex items-center gap-1 text-xs text-muted-foreground/70 italic ${className}`}
        aria-label="No leadership assigned"
      >
        <UserX className="size-3.5 opacity-50" aria-hidden="true" />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  const primaryLead = activeLeaders[0];

  return (
    <div
      className={`flex items-center gap-2 flex-wrap ${className}`}
      role="group"
      aria-label="Active leadership roster"
    >
      {/* 1. Avatar Stack */}
      <div className="flex items-center -space-x-1.5 overflow-visible">
        {visibleLeaders.map((leader, index) => {
          const u = leader.user;
          const fullName = leader.fullName || "Leader";
          const initials = getUserInitials(u?.firstName, u?.lastName, fullName);
          const isPrimary = index === 0;

          return (
            <Tooltip key={leader.id}>
              <TooltipTrigger
                type="button"
                aria-label={`Leader: ${fullName}, Role: ${leader.roleTitle || roleTitle}`}
                className="relative group/avatar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-full cursor-help hover:z-20 transition-transform hover:scale-110"
              >
                <Avatar className="size-6 border-2 border-background ring-1 ring-border/80 shadow-2xs">
                  {leader.avatarUrl && (
                    <AvatarImage
                      src={leader.avatarUrl}
                      alt={fullName}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="text-[9px] bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isPrimary && (
                  <span
                    className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-500 text-white flex items-center justify-center ring-1 ring-background shadow-2xs"
                    title={leader.roleTitle || "Active Lead"}
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
                <div className="bg-gradient-to-r from-indigo-500/15 via-primary/10 to-transparent p-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-9 border-2 border-background ring-1 ring-indigo-500/30 shadow-xs shrink-0">
                      {leader.avatarUrl && (
                        <AvatarImage
                          src={leader.avatarUrl}
                          alt={fullName}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500/20 to-primary/20 text-primary font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-foreground truncate">{fullName}</p>
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] gap-0.5 px-1 py-0 font-medium shrink-0">
                          <Crown className="size-2.5" /> {leader.roleTitle || roleTitle}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-medium text-muted-foreground truncate mt-0.5">
                        {leader.designationName || leader.roleTitle || "Executive Leadership"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-3 space-y-2 bg-card/50">
                  {leader.email && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="size-6 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Mail className="size-3.5" />
                      </div>
                      <span className="font-mono text-[11px] text-foreground truncate select-all">
                        {leader.email}
                      </span>
                    </div>
                  )}

                  {leader.designationName && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="size-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Briefcase className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 truncate">
                        <span className="text-[11px] text-foreground font-medium truncate">
                          {leader.designationName}
                        </span>
                      </div>
                    </div>
                  )}

                  {(leader.employeeId || leader.systemRole) && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <UserIcon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                        {leader.employeeId && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            ID: <span className="font-semibold text-foreground">{leader.employeeId}</span>
                          </span>
                        )}
                        {leader.systemRole && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
                            {leader.systemRole}
                          </Badge>
                        )}
                      </div>
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
              aria-label={`+${remainingCount} more leaders`}
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
              <div className="bg-gradient-to-r from-indigo-500/15 via-primary/10 to-transparent p-3 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <ShieldCheck className="size-3.5" />
                  </div>
                  <span className="font-bold text-xs text-foreground">Unit Leadership</span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono font-semibold px-2 py-0.5">
                  {remainingCount} more
                </Badge>
              </div>

              {/* List */}
              <div className="p-2 space-y-1.5 max-h-56 overflow-y-auto bg-card/40">
                {remainingLeaders.map((m) => {
                  const u = m.user;
                  const name = m.fullName || "Leader";
                  const initials = getUserInitials(u?.firstName, u?.lastName, name);

                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-card/60 hover:bg-muted/60 border border-border/50 transition-colors"
                    >
                      <Avatar className="size-7 border border-primary/20 shrink-0">
                        {m.avatarUrl && (
                          <AvatarImage
                            src={m.avatarUrl}
                            alt={name}
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-foreground truncate text-xs flex items-center gap-1">
                            {name}
                            <Crown className="size-2.5 text-amber-500 shrink-0" />
                          </p>
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 shrink-0 font-normal bg-secondary/80"
                          >
                            {m.roleTitle || roleTitle}
                          </Badge>
                        </div>
                        {m.email && (
                          <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                            {m.email}
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

      {/* 2. Lead Tag badge */}
      {showLeadBadge && primaryLead && (
        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-medium"
        >
          <Crown className="size-2.5 text-amber-500" />
          <span className="truncate max-w-[110px]">
            {primaryLead.user?.firstName || primaryLead.fullName?.split(" ")[0]}
          </span>
          {activeLeaders.length > 1 && (
            <span className="text-[9px] opacity-75 font-mono">+{activeLeaders.length - 1}</span>
          )}
        </Badge>
      )}
    </div>
  );
}
