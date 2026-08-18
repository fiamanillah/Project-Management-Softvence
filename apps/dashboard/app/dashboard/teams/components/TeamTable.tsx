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
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import type { TeamItem } from "@workspace/shared";
import { TeamMembersAndLeads } from "./TeamMembersAndLeads";
import {
  MoreHorizontal,
  Users,
  Eye,
  Settings,
  Trash2,
  Building2,
  Clock,
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
            return (
              <TableRow
                key={team.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onViewDetails(team)}
              >
                {/* Team Info */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 rounded-lg border border-primary/20 shrink-0 shadow-2xs">
                      {team.avatarUrl && (
                        <AvatarImage
                          src={team.avatarUrl}
                          alt={team.name}
                          className="rounded-lg object-cover"
                        />
                      )}
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                        {team.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 truncate">
                        {team.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono truncate">
                        {team.slug}
                      </span>
                    </div>
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
                  <TeamMembersAndLeads
                    members={team.members}
                    leads={team.leads}
                    maxVisible={4}
                    showLeadBadge={true}
                  />
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
