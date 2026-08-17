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
  UserPlus,
} from "lucide-react";

interface TeamTableProps {
  teams: TeamItem[];
  onViewDetails: (team: TeamItem) => void;
  onManageMembers: (team: TeamItem) => void;
  onEdit: (team: TeamItem) => void;
  onDelete: (team: TeamItem) => void;
}

export function TeamTable({
  teams,
  onViewDetails,
  onManageMembers,
  onEdit,
  onDelete,
}: TeamTableProps) {
  const getInitials = (first?: string, last?: string) => {
    return `${(first?.[0] || "").toUpperCase()}${(last?.[0] || "").toUpperCase()}` || "U";
  };

  if (teams.length === 0) {
    return (
      <div className="py-16 text-center border rounded-xl bg-card space-y-2">
        <Users className="size-8 mx-auto text-muted-foreground/50" />
        <h3 className="text-sm font-semibold text-foreground">No Teams Found</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          No teams match your search or filter criteria. Try changing your filters or create a new team.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[280px]">Team Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Shift</TableHead>
            <TableHead>Members & Leads</TableHead>
            <TableHead className="text-center">Projects</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => {
            const activeMembers = team.members || [];
            const leads = team.leads || activeMembers.filter((m) => m.role?.qualifiesForTeamScope);
            const displayMembers = activeMembers.slice(0, 4);
            const remainingCount = activeMembers.length - 4;

            return (
              <TableRow
                key={team.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onViewDetails(team)}
              >
                {/* Team Info */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                      {team.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {team.slug}
                    </span>
                  </div>
                </TableCell>

                {/* Department */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    <span>{team.department.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                      {team.department.code}
                    </Badge>
                  </div>
                </TableCell>

                {/* Shift */}
                <TableCell>
                  {team.shift ? (
                    <Badge variant="secondary" className="text-[10px] gap-1 font-normal">
                      <Clock className="size-3" /> {team.shift}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Members & Avatar Stack */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {/* Avatar Group */}
                    {activeMembers.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">No members</span>
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
                            <TooltipContent side="top" className="text-xs space-y-0.5">
                              <p className="font-semibold flex items-center gap-1">
                                {member.user.firstName} {member.user.lastName}
                                {member.role.qualifiesForTeamScope && (
                                  <Crown className="size-2.5 text-amber-500" />
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Role: {member.role.name}
                              </p>
                              {member.user.designation?.name && (
                                <p className="text-[10px] text-muted-foreground">
                                  Title: {member.user.designation.name}
                                </p>
                              )}
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

                    {/* Leads tag */}
                    {leads[0] && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 ml-1">
                        <Crown className="size-2.5" />
                        <span>{leads[0]?.user?.firstName}</span>
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Projects Count */}
                <TableCell className="text-center">
                  <span className="text-xs font-semibold text-foreground">
                    {team._count?.projectAssignments || 0}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge
                    variant={team.isActive ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {team.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>

                {/* Actions Dropdown */}
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                          <UserPlus className="size-3.5 text-primary" /> Manage Roster
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
