"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Briefcase,
  GitFork,
  Layers,
  UsersRound,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  Copy,
  Check,
  Building2,
  ExternalLink,
  Sparkles,
  Hash,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ProjectDetailItem, ProjectItem } from "@workspace/shared";
import { ProjectOverviewTab } from "./ProjectOverviewTab";
import { ProjectHierarchyTab } from "./ProjectHierarchyTab";
import { ProjectComponentsTab } from "./ProjectComponentsTab";
import { ProjectRosterTab } from "./ProjectRosterTab";

interface ProjectDetailDialogProps {
  project: ProjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (project: ProjectItem) => void;
  onManageMembers: (project: ProjectItem) => void;
  onManageComponents: (project: ProjectItem) => void;
  onAddSubProject?: (parentProject: ProjectItem) => void;
  onDelete: (project: ProjectItem) => void;
  onRefresh?: () => void;
}

export function ProjectDetailDialog({
  project,
  open,
  onOpenChange,
  onEdit,
  onManageMembers,
  onManageComponents,
  onAddSubProject,
  onDelete,
  onRefresh,
}: ProjectDetailDialogProps) {
  const [detail, setDetail] = React.useState<ProjectDetailItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [copiedOrderId, setCopiedOrderId] = React.useState(false);

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
  const canManageMembers = caps?.canManageMembers ?? false;
  const canManageComponents = caps?.canManageComponents ?? false;
  const canEdit = caps?.canEdit ?? false;
  const canDelete = caps?.canDelete ?? false;

  const componentsCount = p.components?.length || 0;
  const activeMembersCount = detail?.activeMembers?.length || p.userAssignments?.filter((ua: any) => !ua.unassignedAt).length || 0;
  const subProjectsCount = (detail?.subProjects || (p as any).subProjects || []).length;

  const handleCopyCode = () => {
    if (!p.projectName) return;
    navigator.clipboard.writeText(p.projectName);
    setCopiedCode(true);
    toast.success("Project Code copied to clipboard");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyOrderId = () => {
    if (!p.orderId) return;
    navigator.clipboard.writeText(p.orderId);
    setCopiedOrderId(true);
    toast.success("Platform Order ID copied to clipboard");
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleSelectRelatedProject = (related: ProjectItem) => {
    if (related.id) {
      fetchProjectDetails(related.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl lg:max-w-5xl w-full p-0 flex flex-col max-h-[90vh] bg-background overflow-hidden border shadow-2xl rounded-2xl">
        {/* 1. DIALOG HEADER WITH PRIMARY CODE & ACTIONS */}
        <div className="p-5 pb-4 border-b border-border/40 bg-card/40 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            {/* Identity & Badges */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Auto-Generated Project Code (Primary Identity) */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="font-mono text-base sm:text-lg font-bold text-foreground px-3 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-lg flex items-center gap-1.5 hover:bg-primary/15 transition-colors"
                  title="Click to copy Project Code"
                >
                  <Sparkles className="size-4" />
                  <span>{p.projectName}</span>
                  {copiedCode ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
                </button>

                {/* Platform Order ID */}
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground font-semibold px-2.5 py-1 bg-muted rounded-md border border-border/40 flex items-center gap-1.5 transition-colors"
                  title="Click to copy Platform Order ID"
                >
                  <Hash className="size-3 text-muted-foreground" />
                  <span>Order: {p.orderId}</span>
                  {copiedOrderId ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
                </button>

                {/* Parent Project Tag (if nested) */}
                {p.parentProject && (
                  <Badge variant="secondary" className="text-[11px] gap-1 font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20 py-0.5">
                    <GitFork className="size-3 rotate-180" /> Parent: {p.parentProject.projectName}
                  </Badge>
                )}

                {/* Status Badge */}
                <Badge
                  variant="outline"
                  className="text-xs font-semibold px-2.5 py-1 border"
                  style={{
                    borderColor: p.status?.color ? `${p.status.color}50` : undefined,
                    backgroundColor: p.status?.color ? `${p.status.color}15` : undefined,
                    color: p.status?.color || undefined,
                  }}
                >
                  {p.status?.name || "Active"}
                </Badge>
              </div>

              {/* Sub-label info */}
              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap pt-0.5">
                {p.service && (
                  <>
                    <span className="font-semibold text-foreground">{p.service}</span>
                    <span>•</span>
                  </>
                )}
                <span>Service Line: <span className="text-foreground font-medium">{p.serviceLine?.name || "General"}</span></span>
                <span>•</span>
                <span>
                  Platform:{" "}
                  <span className="text-foreground font-medium">
                    {canViewClient ? p.profile?.platform?.name || "Direct" : "Protected Platform"}
                  </span>
                </span>
                {canViewClient && p.profile?.username && (
                  <>
                    <span>•</span>
                    <span>Account: <span className="font-mono font-medium text-foreground">{p.profile.username}</span></span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions Toolbar */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {onAddSubProject && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onAddSubProject(p);
                  }}
                  className="gap-1 text-xs h-8"
                  title="Add child sub-project"
                >
                  <Plus className="size-3.5" /> Sub-Project
                </Button>
              )}

              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(p)}
                  className="gap-1 text-xs h-8 text-blue-600 dark:text-blue-400"
                >
                  <Edit2 className="size-3.5" /> Edit
                </Button>
              )}

              {canDelete && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onDelete(p)}
                  className="size-8"
                  title="Delete project"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 2. SHADCN TABS NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-5 py-2.5 border-b border-border/40 bg-muted/30 shrink-0">
            <TabsList className="grid w-full grid-cols-4 bg-muted/70 p-1 rounded-xl h-9">
              <TabsTrigger
                value="overview"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
              >
                Overview
              </TabsTrigger>

              <TabsTrigger
                value="hierarchy"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-1.5"
              >
                <span>Hierarchy</span>
                {subProjectsCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {subProjectsCount}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="components"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-1.5"
              >
                <span>Components</span>
                {componentsCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {componentsCount}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="roster"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-1.5"
              >
                <span>Team & Roster</span>
                {activeMembersCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {activeMembersCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 3. SCROLLABLE TAB BODY */}
          <div className="flex-1 overflow-y-auto p-5">
            {isLoading && !detail ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-xs gap-2">
                <Loader2 className="size-4 animate-spin text-primary" /> Loading project details...
              </div>
            ) : (
              <>
                <TabsContent value="overview" className="mt-0 focus-visible:outline-hidden">
                  <ProjectOverviewTab
                    project={p}
                    canViewClient={canViewClient}
                    canViewFinancials={canViewFinancials}
                    onEdit={() => onEdit(p)}
                  />
                </TabsContent>

                <TabsContent value="hierarchy" className="mt-0 focus-visible:outline-hidden">
                  <ProjectHierarchyTab
                    project={p}
                    canViewFinancials={canViewFinancials}
                    onSelectProject={handleSelectRelatedProject}
                    onAddSubProject={(parentProj) => {
                      onOpenChange(false);
                      onAddSubProject?.(parentProj);
                    }}
                  />
                </TabsContent>

                <TabsContent value="components" className="mt-0 focus-visible:outline-hidden">
                  <ProjectComponentsTab
                    project={p}
                    canManageComponents={canManageComponents}
                    onManageComponents={() => onManageComponents(p)}
                  />
                </TabsContent>

                <TabsContent value="roster" className="mt-0 focus-visible:outline-hidden">
                  <ProjectRosterTab
                    project={p}
                    canManageMembers={canManageMembers}
                    onManageMembers={() => onManageMembers(p)}
                  />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
