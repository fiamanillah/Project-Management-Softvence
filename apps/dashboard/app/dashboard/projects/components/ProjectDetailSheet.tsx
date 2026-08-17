"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@workspace/ui/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import {
  Briefcase,
  Calendar,
  DollarSign,
  Lock,
  ExternalLink,
  UsersRound,
  Layers,
  Edit2,
  Trash2,
  Building2,
  CheckCircle2,
  Clock,
  User,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ProjectDetailItem, ProjectItem } from "@workspace/shared";

interface ProjectDetailSheetProps {
  project: ProjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (project: ProjectItem) => void;
  onManageMembers: (project: ProjectItem) => void;
  onManageComponents: (project: ProjectItem) => void;
  onDelete: (project: ProjectItem) => void;
  onRefresh?: () => void;
}

export function ProjectDetailSheet({
  project,
  open,
  onOpenChange,
  onEdit,
  onManageMembers,
  onManageComponents,
  onDelete,
  onRefresh,
}: ProjectDetailSheetProps) {
  const [detail, setDetail] = React.useState<ProjectDetailItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");

  const fetchProjectDetails = React.useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/projects/${id}`);
      setDetail(res?.data || res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load project details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open && project?.id) {
      fetchProjectDetails(project.id);
    } else {
      setDetail(null);
      setActiveTab("overview");
    }
  }, [open, project?.id, fetchProjectDetails]);

  const p = detail || (project as any);
  if (!p) return null;

  const caps = p._capabilities;
  const canViewClient = caps?.canViewClient ?? false;
  const canViewFinancials = caps?.canViewFinancials ?? false;

  const activeTeams = detail?.activeTeams || p.teamAssignments || [];
  const activeMembers = detail?.activeMembers || p.userAssignments || [];
  const pastMembers = detail?.pastMembers || [];
  const components = p.components || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl md:max-w-2xl w-full p-0 flex flex-col h-full bg-background overflow-hidden">
        {/* Top Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border/40 bg-card/40 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground font-semibold px-2 py-0.5 bg-muted rounded">
                  {p.orderId}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs font-semibold px-2.5 py-0.5 border"
                  style={{
                    borderColor: p.status?.color ? `${p.status.color}40` : undefined,
                    backgroundColor: p.status?.color ? `${p.status.color}15` : undefined,
                    color: p.status?.color || undefined,
                  }}
                >
                  {p.status?.name || "Status"}
                </Badge>
              </div>
              <SheetTitle className="text-xl font-bold tracking-tight text-foreground">
                {p.projectName}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Service Line: {p.serviceLine?.name || "General"} • Platform: {p.profile?.platform?.name || "Platform"} ({p.profile?.username})
              </SheetDescription>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {caps?.canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(p)}
                  className="gap-1.5 text-xs h-8"
                >
                  <Edit2 className="size-3.5 text-blue-500" /> Edit
                </Button>
              )}
              {caps?.canDelete && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onDelete(p)}
                  className="size-8"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 border-b border-border/40 bg-card/20">
            <TabsList className="bg-transparent h-11 p-0 gap-6 border-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2.5 font-medium text-xs text-muted-foreground data-[state=active]:text-foreground"
              >
                Overview & Sensitive Info
              </TabsTrigger>
              <TabsTrigger
                value="components"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2.5 font-medium text-xs text-muted-foreground data-[state=active]:text-foreground"
              >
                Components ({components.length})
              </TabsTrigger>
              <TabsTrigger
                value="roster"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2.5 font-medium text-xs text-muted-foreground data-[state=active]:text-foreground"
              >
                Team & Members ({activeMembers.length})
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2.5 font-medium text-xs text-muted-foreground data-[state=active]:text-foreground"
              >
                System Details
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              {/* Financial & Client Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Financial Value Card */}
                <Card className="border bg-card/50 shadow-2xs">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="size-4 text-emerald-500" /> Contract Value
                      </span>
                      {canViewFinancials ? (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-mono">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20 font-mono gap-1">
                          <Lock className="size-2.5" /> Sensitive
                        </Badge>
                      )}
                    </div>
                    {canViewFinancials ? (
                      <div className="space-y-1">
                        <p className="text-2xl font-bold tracking-tight text-foreground font-mono">
                          ${Number(p.value || 0).toLocaleString()}
                        </p>
                        {p.orderSheetUrl && (
                          <a
                            href={p.orderSheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium pt-1"
                          >
                            <ExternalLink className="size-3" /> View Order Sheet
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/40 rounded-lg border border-dashed text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Access Restricted</p>
                        <p className="text-[11px] mt-0.5">Project financial metrics are hidden by your security permission scope.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Client Identity Card */}
                <Card className="border bg-card/50 shadow-2xs">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Briefcase className="size-4 text-blue-500" /> Client Details
                      </span>
                      {canViewClient ? (
                        <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-500/10 border-blue-500/20 font-mono">
                          {p.profile?.platform?.name || "Platform"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20 font-mono gap-1">
                          <Lock className="size-2.5" /> Sensitive
                        </Badge>
                      )}
                    </div>
                    {canViewClient && p.client ? (
                      <div className="space-y-1">
                        <p className="text-base font-bold text-foreground">
                          {p.client.name}
                        </p>
                        {p.client.contactNotes && (
                          <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded border text-[11px]">
                            {p.client.contactNotes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/40 rounded-lg border border-dashed text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Client Confidential</p>
                        <p className="text-[11px] mt-0.5">Client names & contact points are hidden by your security permission scope.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Timeline Card */}
              <Card className="border bg-card/50 shadow-2xs">
                <CardContent className="p-4 space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-4 text-primary" /> Delivery & Timeline Schedule
                  </span>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Start Date</span>
                      <span className="font-medium text-foreground">
                        {p.startDate ? new Date(p.startDate).toLocaleDateString(undefined, { dateStyle: "long" }) : "Not specified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Target Delivery Date</span>
                      <span className="font-medium text-foreground">
                        {p.deliveryDate ? new Date(p.deliveryDate).toLocaleDateString(undefined, { dateStyle: "long" }) : "Not specified"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Teams Card */}
              <Card className="border bg-card/50 shadow-2xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <UsersRound className="size-4 text-purple-500" /> Primary Allocated Teams
                    </span>
                    {(caps?.canManageMembers || caps?.canReassign) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onManageMembers(p)}
                        className="text-xs h-7 text-primary"
                      >
                        Modify Teams
                      </Button>
                    )}
                  </div>
                  {activeTeams.length > 0 ? (
                    <div className="space-y-2">
                      {activeTeams.map((ta: any) => (
                        <div
                          key={ta.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 text-primary" />
                            <div>
                              <p className="font-semibold text-foreground">{ta.team?.name}</p>
                              <p className="text-[11px] text-muted-foreground">Department: {ta.team?.department?.name}</p>
                            </div>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Assigned: {new Date(ta.assignedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No teams currently allocated to this project.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: COMPONENTS */}
            <TabsContent value="components" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Project Components</h4>
                  <p className="text-xs text-muted-foreground">Module breakdown and team task assignments</p>
                </div>
                {caps?.canManageComponents && (
                  <Button
                    size="sm"
                    onClick={() => onManageComponents(p)}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Plus className="size-3.5" /> Manage Components
                  </Button>
                )}
              </div>

              {components.length > 0 ? (
                <div className="space-y-2.5">
                  {components.map((comp: any) => (
                    <div
                      key={comp.id}
                      className="p-3.5 rounded-xl border bg-card/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Layers className="size-4 text-primary" />
                          <span className="font-semibold text-sm text-foreground">{comp.name}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium"
                          style={{
                            borderColor: comp.status?.color ? `${comp.status.color}40` : undefined,
                            backgroundColor: comp.status?.color ? `${comp.status.color}15` : undefined,
                            color: comp.status?.color || undefined,
                          }}
                        >
                          {comp.status?.name || "Status"}
                        </Badge>
                      </div>

                      {/* Component Assignees */}
                      {comp.userAssignments && comp.userAssignments.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/40">
                          <span className="text-[11px] text-muted-foreground">Assigned:</span>
                          {comp.userAssignments.map((ua: any) => (
                            <Badge
                              key={ua.id}
                              variant="secondary"
                              className="text-[10px] bg-muted/80 text-foreground px-1.5 py-0 gap-1"
                            >
                              <User className="size-2.5" />
                              {ua.user?.firstName} {ua.user?.lastName} ({ua.role?.name})
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed rounded-xl p-6 bg-card/30">
                  <Layers className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium text-foreground">No components defined</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Divide this project into manageable milestone components.</p>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: ROSTER */}
            <TabsContent value="roster" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Active Member Roster</h4>
                  <p className="text-xs text-muted-foreground">Individual users and leadership roles on this project</p>
                </div>
                {caps?.canManageMembers && (
                  <Button
                    size="sm"
                    onClick={() => onManageMembers(p)}
                    className="gap-1.5 text-xs h-8"
                  >
                    <UsersRound className="size-3.5" /> Assign Members
                  </Button>
                )}
              </div>

              {activeMembers.length > 0 ? (
                <div className="space-y-2">
                  {activeMembers.map((ua: any) => (
                    <div
                      key={ua.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card/60 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 border border-background">
                          <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                            {ua.user?.firstName?.[0]}
                            {ua.user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">
                            {ua.user?.firstName} {ua.user?.lastName}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {ua.user?.employeeId} • {ua.user?.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-muted px-2 py-0.5">
                          {ua.role?.name || "Role"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          Joined {new Date(ua.assignedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No individual users assigned yet.</p>
              )}

              {/* Past Members History */}
              {pastMembers.length > 0 && (
                <div className="pt-4 border-t border-border/40 space-y-2">
                  <h5 className="text-xs font-semibold text-muted-foreground">Past Assignee History</h5>
                  <div className="space-y-1.5">
                    {pastMembers.map((pm: any) => (
                      <div
                        key={pm.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border text-[11px] text-muted-foreground"
                      >
                        <span>{pm.user?.firstName} {pm.user?.lastName} ({pm.role?.name})</span>
                        <span>Unassigned: {new Date(pm.unassignedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 4: SYSTEM DETAILS */}
            <TabsContent value="activity" className="mt-0 space-y-3 text-xs">
              <Card className="border bg-card/40">
                <CardContent className="p-4 space-y-2.5 font-mono text-[11px]">
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-muted-foreground">Project UUID:</span>
                    <span className="text-foreground">{p.id}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="text-foreground">{p.orderId}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-muted-foreground">Status ID:</span>
                    <span className="text-foreground">{p.statusId}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-muted-foreground">Created At:</span>
                    <span className="text-foreground">{new Date(p.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated At:</span>
                    <span className="text-foreground">{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "Never"}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
