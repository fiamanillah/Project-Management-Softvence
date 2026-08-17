"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import type { TeamItem } from "@workspace/shared";
import {
  MoreHorizontal,
  Users,
  Eye,
  Settings,
  Trash2,
  Building2,
  Clock,
  Crown,
  FolderGit2,
  Shield,
} from "lucide-react";

interface TeamCardGridProps {
  teams: TeamItem[];
  onViewDetails: (team: TeamItem) => void;
  onManageMembers: (team: TeamItem) => void;
  onEdit: (team: TeamItem) => void;
  onDelete: (team: TeamItem) => void;
}

export function TeamCardGrid({
  teams,
  onViewDetails,
  onManageMembers,
  onEdit,
  onDelete,
}: TeamCardGridProps) {
  const getInitials = (first?: string, last?: string) => {
    return `${(first?.[0] || "").toUpperCase()}${(last?.[0] || "").toUpperCase()}` || "U";
  };

  if (teams.length === 0) {
    return (
      <div className="py-16 text-center border rounded-xl bg-card space-y-2">
        <Users className="size-8 mx-auto text-muted-foreground/50" />
        <h3 className="text-sm font-semibold text-foreground">No Teams Found</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          No teams match your current search or filter criteria. Try adjusting your search query.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map((team) => {
        const activeMembers = team.members || [];
        const leads = team.leads || activeMembers.filter((m) => m.role?.qualifiesForTeamScope);
        const displayMembers = activeMembers.slice(0, 5);
        const remainingCount = activeMembers.length - 5;
        const projectCount = team._count?.projectAssignments || 0;

        return (
          <Card
            key={team.id}
            className="flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-xs group cursor-pointer"
            onClick={() => onViewDetails(team)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {team.name}
                    </CardTitle>
                    <Badge
                      variant={team.isActive ? "default" : "secondary"}
                      className="text-[10px] py-0"
                    >
                      {team.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-mono text-muted-foreground truncate">
                    {team.slug}
                  </CardDescription>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 text-xs">
                      <DropdownMenuLabel>Team Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewDetails(team)} className="gap-2">
                        <Eye className="size-3.5 text-muted-foreground" /> View Details
                      </DropdownMenuItem>

                      {team._capabilities?.canManageMembers && (
                        <DropdownMenuItem onClick={() => onManageMembers(team)} className="gap-2">
                          <Users className="size-3.5 text-primary" /> Manage Members
                        </DropdownMenuItem>
                      )}

                      {team._capabilities?.canEdit && (
                        <DropdownMenuItem onClick={() => onEdit(team)} className="gap-2">
                          <Settings className="size-3.5 text-muted-foreground" /> Edit Team
                        </DropdownMenuItem>
                      )}

                      {team._capabilities?.canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(team)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5" /> Deactivate Team
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Department & Shift Tags */}
              <div className="flex items-center gap-2 pt-2 text-xs flex-wrap">
                <span className="flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md text-[11px]">
                  <Building2 className="size-3 text-primary" /> {team.department.name}
                </span>
                {team.shift && (
                  <span className="flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md text-[11px]">
                    <Clock className="size-3" /> {team.shift}
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pb-3">
              {/* Team Lead Info */}
              {leads[0] ? (
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <div className="p-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                    <Crown className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {leads[0]?.user?.firstName} {leads[0]?.user?.lastName}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Team Lead &bull; {leads[0]?.user?.designation?.name || "Lead"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg border border-dashed bg-muted/10 text-center">
                  <p className="text-[11px] text-muted-foreground italic">No Team Lead Assigned</p>
                </div>
              )}

              {/* Members Avatar Row & Projects Count */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {activeMembers.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground italic">0 Members</span>
                  ) : (
                    <div className="flex items-center -space-x-2">
                      {displayMembers.map((member) => (
                        <Tooltip key={member.id}>
                          <TooltipTrigger>
                            <Avatar className="size-7 border-2 border-background ring-1 ring-border shadow-2xs cursor-pointer">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                                {getInitials(member.user.firstName, member.user.lastName)}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-semibold">
                              {member.user.firstName} {member.user.lastName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{member.role.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}

                      {remainingCount > 0 && (
                        <div className="flex items-center justify-center size-7 rounded-full bg-muted border-2 border-background ring-1 ring-border text-[10px] font-semibold text-muted-foreground">
                          +{remainingCount}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <FolderGit2 className="size-3.5 text-primary" />
                  <span>{projectCount} Project{projectCount === 1 ? "" : "s"}</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-3 border-t bg-muted/10 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(team)}
                className="text-xs h-8 flex-1"
              >
                <Eye className="mr-1.5 size-3.5" /> Details
              </Button>

              {team._capabilities?.canManageMembers && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onManageMembers(team)}
                  className="text-xs h-8 flex-1 gap-1"
                >
                  <Users className="size-3.5" /> Roster
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
