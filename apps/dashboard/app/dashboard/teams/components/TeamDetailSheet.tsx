"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@workspace/ui/components/sheet";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Card, CardContent } from "@workspace/ui/components/card";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { TeamDetailItem, TeamItem } from "@workspace/shared";
import {
  Users,
  Building2,
  Clock,
  FolderGit2,
  Crown,
  Calendar,
  Briefcase,
  Loader2,
  Settings,
  Search,
  UserPlus,
} from "lucide-react";

interface TeamDetailSheetProps {
  teamId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onManageMembers?: (team: TeamItem) => void;
  onEdit?: (team: TeamItem) => void;
}

export function TeamDetailSheet({
  teamId,
  open,
  onOpenChange,
  onManageMembers,
  onEdit,
}: TeamDetailSheetProps) {
  const [team, setTeam] = React.useState<TeamDetailItem | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [memberSearch, setMemberSearch] = React.useState("");

  const fetchTeamDetails = React.useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const data = await api.get(`/teams/${teamId}`);
      setTeam(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load team details");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  React.useEffect(() => {
    if (open && teamId) {
      fetchTeamDetails();
      setMemberSearch("");
    }
  }, [open, teamId, fetchTeamDetails]);

  const getInitials = (first?: string, last?: string) => {
    return `${(first?.[0] || "").toUpperCase()}${(last?.[0] || "").toUpperCase()}` || "U";
  };

  const filteredMembers = React.useMemo(() => {
    if (!team?.activeMembers) return [];
    if (!memberSearch.trim()) return team.activeMembers;
    const q = memberSearch.toLowerCase().trim();
    return team.activeMembers.filter((m) => {
      const fullName = `${m.user.firstName || ""} ${m.user.lastName || ""}`.toLowerCase();
      const email = (m.user.email || "").toLowerCase();
      const empId = (m.user.employeeId || "").toLowerCase();
      const role = (m.role.name || "").toLowerCase();
      const desig = (m.user.designation?.name || "").toLowerCase();
      return fullName.includes(q) || email.includes(q) || empId.includes(q) || role.includes(q) || desig.includes(q);
    });
  }, [team?.activeMembers, memberSearch]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl sm:min-w-[620px] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading team details...</p>
          </div>
        ) : !team ? (
          <div className="flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground">
            No team details found.
          </div>
        ) : (
          <>
            {/* Sheet Header */}
            <SheetHeader className="p-6 pb-4 border-b bg-muted/20">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SheetTitle className="text-xl font-bold">{team.name}</SheetTitle>
                    <Badge variant={team.isActive ? "default" : "secondary"} className="text-[10px]">
                      {team.isActive ? "Active Team" : "Inactive"}
                    </Badge>
                  </div>
                  <SheetDescription className="text-xs font-mono text-muted-foreground">
                    {team.slug}
                  </SheetDescription>
                </div>

                <div className="flex items-center gap-2">
                  {team._capabilities?.canEdit && onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(team)}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Settings className="size-3.5" /> Edit
                    </Button>
                  )}
                  {team._capabilities?.canManageMembers && onManageMembers && (
                    <Button
                      size="sm"
                      onClick={() => onManageMembers(team)}
                      className="h-8 text-xs gap-1.5 font-medium shadow-2xs"
                    >
                      <UserPlus className="size-3.5" /> Manage Roster
                    </Button>
                  )}
                </div>
              </div>

              {/* Department & Shift Info */}
              <div className="flex items-center gap-3 pt-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Building2 className="size-3.5 text-primary" /> {team.department.name} ({team.department.code})
                </span>
                {team.shift && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {team.shift} Shift
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" /> Created {new Date(team.createdAt).toLocaleDateString()}
                </span>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stat Tiles */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-card shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Active Members
                    </p>
                    <p className="text-xl font-bold mt-0.5">{team.activeMembers?.length || 0}</p>
                  </CardContent>
                </Card>

                <Card className="bg-card shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Team Leads
                    </p>
                    <p className="text-xl font-bold mt-0.5 text-amber-600 dark:text-amber-400">
                      {team.leads?.length || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card shadow-2xs">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Assigned Projects
                    </p>
                    <p className="text-xl font-bold mt-0.5 text-primary">
                      {team._count?.projectAssignments || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Roster, Projects & Timeline Tabs */}
              <Tabs defaultValue="roster" className="w-full space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
                  <TabsList className="grid w-full sm:w-[360px] grid-cols-3">
                    <TabsTrigger value="roster" className="text-xs">
                      Roster ({team.activeMembers?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="text-xs">
                      Projects ({team.projectAssignments?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-xs">
                      Timeline ({team.pastMembers?.length || 0})
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab 1: Active Roster */}
                <TabsContent value="roster" className="mt-0 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Filter team members..."
                        className="h-8 pl-8 text-xs"
                      />
                    </div>

                    {team._capabilities?.canManageMembers && onManageMembers && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onManageMembers(team)}
                        className="h-8 text-xs gap-1.5 shrink-0"
                      >
                        <UserPlus className="size-3" /> Add / Edit
                      </Button>
                    )}
                  </div>

                  {!team.activeMembers || team.activeMembers.length === 0 ? (
                    <div className="py-10 text-center rounded-xl border border-dashed text-xs text-muted-foreground bg-muted/10">
                      <Users className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-semibold text-foreground">No active members in this team</p>
                      <p className="max-w-xs mx-auto text-muted-foreground mt-1">
                        Manage members to assign engineers and leads.
                      </p>
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="py-8 text-center rounded-xl border border-dashed text-xs text-muted-foreground bg-muted/10">
                      No members match "{memberSearch}"
                    </div>
                  ) : (
                    <div className="divide-y rounded-xl border bg-card overflow-hidden shadow-2xs">
                      {filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="size-8.5 border">
                              <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                                {getInitials(member.user.firstName, member.user.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-foreground truncate">
                                  {member.user.firstName} {member.user.lastName}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  ({member.user.employeeId})
                                </span>
                                {member.role.qualifiesForTeamScope && (
                                  <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1">
                                    <Crown className="size-2.5" /> Lead
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {member.user.email}
                              </p>
                              {member.note && (
                                <p className="text-[10px] text-muted-foreground italic mt-0.5">
                                  "{member.note}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="outline" className="text-[11px] font-medium">
                              {member.role.name}
                            </Badge>
                            {member.user.designation ? (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Briefcase className="size-2.5" />
                                {member.user.designation.name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">
                                No designation
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 2: Projects */}
                <TabsContent value="projects" className="mt-0 space-y-3">
                  {!team.projectAssignments || team.projectAssignments.length === 0 ? (
                    <div className="py-10 text-center rounded-xl border border-dashed text-xs text-muted-foreground bg-muted/10">
                      <FolderGit2 className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-semibold text-foreground">No Projects Assigned</p>
                      <p className="max-w-xs mx-auto text-muted-foreground mt-1">
                        Projects linked to this team will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-xl border bg-card overflow-hidden shadow-2xs">
                      {team.projectAssignments.map((assignment) => (
                        <div key={assignment.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <FolderGit2 className="size-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {assignment.project.projectName}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                #{assignment.project.orderId}
                              </p>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: Past History */}
                <TabsContent value="history" className="mt-0 space-y-3">
                  {!team.pastMembers || team.pastMembers.length === 0 ? (
                    <div className="py-10 text-center rounded-xl border border-dashed text-xs text-muted-foreground bg-muted/10">
                      <Clock className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-semibold text-foreground">No Past Member History</p>
                      <p className="max-w-xs mx-auto text-muted-foreground mt-1">
                        Offboarded team members and their tenures will be recorded here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-xl border bg-card overflow-hidden shadow-2xs">
                      {team.pastMembers.map((member) => (
                        <div key={member.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border grayscale">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(member.user.firstName, member.user.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">
                                {member.user.firstName} {member.user.lastName}{" "}
                                <span className="text-[10px] text-muted-foreground">({member.role.name})</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(member.joinedAt).toLocaleDateString()} &rarr;{" "}
                                {member.leftAt ? new Date(member.leftAt).toLocaleDateString() : "—"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Past Member
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
