"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Badge } from "@workspace/ui/components/badge";
import {
  X,
  Info,
  Image as ImageIcon,
  FileText,
  Link2,
  CheckSquare,
  Users,
  Send,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { ProjectProfileHeader } from "./ProjectProfileHeader";
import { ProjectOverviewSection } from "./ProjectOverviewSection";
import { ProjectMediaTab } from "./ProjectMediaTab";
import { ProjectFilesTab } from "./ProjectFilesTab";
import { ProjectLinksTab } from "./ProjectLinksTab";
import { ProjectMilestonesTab } from "./ProjectMilestonesTab";
import { ProjectMembersTab } from "./ProjectMembersTab";
import { ProjectClientDispatchTab } from "./ProjectClientDispatchTab";
import type { ProjectWorkspaceItem, ChatMessage, ApprovalWorkflow } from "../types";

interface ProjectDetailsSidebarProps {
  project: ProjectWorkspaceItem;
  messages?: ChatMessage[];
  onUpdateApproval?: (messageId: string, workflow: ApprovalWorkflow) => void;
  onScrollToMessage?: (messageId: string) => void;
  onClose?: () => void;
  className?: string;
}

export function ProjectDetailsSidebar({
  project,
  messages = [],
  onUpdateApproval,
  onScrollToMessage,
  onClose,
  className,
}: ProjectDetailsSidebarProps) {
  const [activeTab, setActiveTab] = React.useState("overview");

  // Client messages count
  const clientMessagesCount = React.useMemo(() => {
    return messages.filter((m) => m.approval && m.approval.status !== "NOT_REQUIRED").length;
  }, [messages]);

  const tabsConfig = [
    {
      id: "overview",
      label: "Overview",
      tooltip: "Project Overview & Details",
      icon: Info,
    },
    {
      id: "dispatch",
      label: "Dispatch",
      tooltip: "Client Outbound & Approvals",
      icon: Send,
      count: clientMessagesCount,
      hasNotification: (project.pendingApprovalsCount ?? 0) > 0,
    },
    {
      id: "milestones",
      label: "Milestones",
      tooltip: "Task Milestones & Deliverables",
      icon: CheckSquare,
      count: project.milestones?.length,
    },
    {
      id: "files",
      label: "Files",
      tooltip: "Documents & Project Files",
      icon: FileText,
      count: project.files?.length,
    },
    {
      id: "media",
      label: "Media",
      tooltip: "Pictures, Media & Mockups",
      icon: ImageIcon,
      count: project.media?.length,
    },
    {
      id: "links",
      label: "Links",
      tooltip: "External Links & Resources",
      icon: Link2,
      count: project.links?.length,
    },
    {
      id: "members",
      label: "Team",
      tooltip: "Project Team Roster",
      icon: Users,
      count: project.members?.length,
    },
  ];

  return (
    <TooltipProvider delay={150}>
      <div
        className={cn(
          "flex h-full flex-col bg-card/85 backdrop-blur-md border-l border-border/60 select-none overflow-hidden",
          className
        )}
      >
        {/* Top Header Bar */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20 shrink-0">
              {project.code}
            </span>
            <h3 className="text-xs font-bold text-foreground tracking-tight truncate">
              Project Details
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            {project.status && (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold px-2 py-0.5 bg-muted/60 border-border/60"
              >
                {project.status.name}
              </Badge>
            )}
            {onClose && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={onClose}
                      className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted/80 ml-1"
                    >
                      <X className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent side="left" sideOffset={6}>
                  Close sidebar
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Main Tabs Container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
          {/* Profile Card & Quick Actions (Fixed at Top) */}
          <div className="shrink-0">
            <ProjectProfileHeader project={project} />
          </div>

          {/* Fixed Tab Navigation Bar (Completely separate from ScrollArea and scrollbars) */}
          <div className="px-3 py-2 border-b border-border/40 bg-card/95 backdrop-blur-md shadow-2xs shrink-0">
            <TabsList className="w-full h-9 p-1 grid grid-cols-7 gap-1 bg-muted/70 dark:bg-muted/40 rounded-xl border border-border/40">
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                  <Tooltip key={tab.id}>
                    <TooltipTrigger
                      render={
                        <TabsTrigger
                          value={tab.id}
                          className={cn(
                            "relative flex size-full h-7 items-center justify-center rounded-lg transition-all duration-200 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isActive
                              ? "bg-background text-primary shadow-xs font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-3.5 shrink-0 transition-colors",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />

                          {/* Notification Dot for Dispatch / Approvals */}
                          {tab.hasNotification && (
                            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-500 ring-2 ring-card animate-pulse" />
                          )}
                        </TabsTrigger>
                      }
                    />
                    <TooltipContent side="bottom" sideOffset={6} className="text-xs font-medium">
                      <p className="font-semibold">{tab.tooltip}</p>
                      {tab.count !== undefined && (
                        <p className="text-[10px] text-muted-foreground">
                          {tab.count} {tab.count === 1 ? "item" : "items"}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TabsList>
          </div>

          {/* Scrollable Tab Contents Container (Scrollbar starts below the tabs bar) */}
          <ScrollArea className="flex-1 min-h-0">
            <TabsContent value="overview" className="mt-0 outline-none">
              <ProjectOverviewSection project={project} />
            </TabsContent>

            <TabsContent value="dispatch" className="mt-0 outline-none">
              <ProjectClientDispatchTab
                messages={messages}
                onUpdateApproval={onUpdateApproval}
                onScrollToMessage={onScrollToMessage}
              />
            </TabsContent>

            <TabsContent value="milestones" className="mt-0 outline-none">
              <ProjectMilestonesTab milestones={project.milestones || []} />
            </TabsContent>

            <TabsContent value="files" className="mt-0 outline-none">
              <ProjectFilesTab files={project.files || []} />
            </TabsContent>

            <TabsContent value="media" className="mt-0 outline-none">
              <ProjectMediaTab media={project.media || []} />
            </TabsContent>

            <TabsContent value="links" className="mt-0 outline-none">
              <ProjectLinksTab links={project.links || []} />
            </TabsContent>

            <TabsContent value="members" className="mt-0 outline-none">
              <ProjectMembersTab members={project.members || []} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
