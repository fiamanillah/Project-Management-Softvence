"use client";

import * as React from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  UsersRound,
  Building2,
  UserCheck,
  UserX,
  Settings2,
  Clock,
  Hash,
} from "lucide-react";
import type { ProjectDetailItem, ProjectItem } from "@workspace/shared";

interface ProjectRosterTabProps {
  project: ProjectDetailItem | ProjectItem;
  canManageMembers: boolean;
  onManageMembers?: () => void;
}

export function ProjectRosterTab({
  project,
  canManageMembers,
  onManageMembers,
}: ProjectRosterTabProps) {
  const detail = project as ProjectDetailItem;
  const activeTeams = detail.activeTeams || project.teamAssignments?.filter((ta) => !ta.unassignedAt) || [];
  const activeMembers = detail.activeMembers || project.userAssignments?.filter((ua) => !ua.unassignedAt) || [];
  const pastMembers = detail.pastMembers || project.userAssignments?.filter((ua) => ua.unassignedAt !== null) || [];

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Project Teams & Staff Roster
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Allocated delivery teams and dedicated individual staff members
          </p>
        </div>

        {canManageMembers && onManageMembers && (
          <Button
            size="sm"
            variant="outline"
            onClick={onManageMembers}
            className="text-xs h-8 gap-1.5 shadow-2xs"
          >
            <Settings2 className="size-3.5" /> Manage Roster
          </Button>
        )}
      </div>

      {/* 2. Teams Section */}
      <div className="space-y-2.5">
        <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Building2 className="size-4 text-primary" /> Allocated Teams ({activeTeams.length})
        </h5>

        {activeTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activeTeams.map((ta) => (
              <Card key={ta.id} className="border bg-card/60 shadow-2xs hover:border-primary/30 transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">{ta.team.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>Dept: {ta.team.department?.name || "General"}</span>
                      {ta.team.shift && (
                        <span className="font-mono opacity-80 flex items-center gap-0.5">
                          • <Clock className="size-2.5" /> {ta.team.shift}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-primary bg-primary/10 border-primary/20">
                    Allocated
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center rounded-xl bg-muted/20 border border-dashed text-xs text-muted-foreground">
            No primary teams allocated to this project yet.
          </div>
        )}
      </div>

      {/* 3. Active Members Section */}
      <div className="space-y-2.5">
        <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <UserCheck className="size-4 text-emerald-500" /> Active Member Assignments ({activeMembers.length})
        </h5>

        {activeMembers.length > 0 ? (
          <ScrollArea className="max-h-[300px] pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeMembers.map((ua) => (
                <Card key={ua.id} className="border bg-card/60 shadow-2xs hover:border-purple-500/30 transition-colors">
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-8 shrink-0 border">
                        {ua.user.avatarUrl && (
                          <AvatarImage
                            src={ua.user.avatarUrl}
                            alt={`${ua.user.firstName || ""} ${ua.user.lastName || ""}`.trim()}
                          />
                        )}
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                          {ua.user.firstName?.[0] || "U"}
                          {ua.user.lastName?.[0] || ""}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {ua.user.firstName} {ua.user.lastName}
                          </p>
                          {ua.user.employeeId && (
                            <span className="font-mono text-[9px] text-muted-foreground">
                              #{ua.user.employeeId}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{ua.user.email}</p>
                        {ua.note && (
                          <p className="text-[10px] text-foreground/80 italic truncate">
                            "{ua.note}"
                          </p>
                        )}
                      </div>
                    </div>

                    <Badge variant="secondary" className="text-[10px] shrink-0 font-semibold px-2 py-0.5 bg-muted/80">
                      {ua.role.name}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-4 text-center rounded-xl bg-muted/20 border border-dashed text-xs text-muted-foreground">
            No individual staff members assigned yet.
          </div>
        )}
      </div>

      {/* 4. Past Roster (Audit Log) */}
      {pastMembers.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-border/40">
          <h5 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <UserX className="size-3.5 text-muted-foreground" /> Historical / Unassigned Members ({pastMembers.length})
          </h5>

          <ScrollArea className="max-h-[160px]">
            <div className="space-y-1.5">
              {pastMembers.map((ua) => (
                <div
                  key={ua.id}
                  className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/20 border border-border/30"
                >
                  <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                    <span className="font-medium text-foreground truncate">
                      {ua.user.firstName} {ua.user.lastName}
                    </span>
                    <span className="text-[10px] font-mono">({ua.role.name})</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    Unassigned {ua.unassignedAt ? new Date(ua.unassignedAt).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
