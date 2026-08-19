"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { X, Info, Image as ImageIcon, FileText, Link2, CheckSquare, Users, Send } from "lucide-react";
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

  return (
    <div className={`flex h-full flex-col bg-card/85 backdrop-blur-md border-l border-border/60 select-none overflow-hidden ${className || ""}`}>
      {/* Top Bar with Title & Close Button */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            {project.code}
          </span>
          <h3 className="text-xs font-bold text-foreground tracking-tight">
            Project Information
          </h3>
        </div>
        {onClose && (
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onClose}
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            title="Close sidebar"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Shadcn ScrollArea Container for right panel */}
      <ScrollArea className="flex-1">
        {/* Profile Card & Action Bar */}
        <ProjectProfileHeader project={project} />

        {/* Assets & Details Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-3 pt-3 border-b border-border/40 bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
            <TabsList className="grid grid-cols-7 h-9 p-0.5 bg-muted/60 rounded-xl">
              <TabsTrigger
                value="overview"
                className="rounded-lg text-[11px] font-medium p-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
                title="Overview & Team"
              >
                <Info className="size-3.5" />
              </TabsTrigger>
              <TabsTrigger
                value="dispatch"
                className="rounded-lg text-[11px] font-medium p-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs relative"
                title="Client Outbound & Approvals"
              >
                <Send className="size-3.5 text-sky-500" />
                {project.pendingApprovalsCount && project.pendingApprovalsCount > 0 ? (
                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500 ring-2 ring-card" />
                ) : null}
              </TabsTrigger>
              <TabsTrigger
                value="milestones"
                className="rounded-lg text-[11px] font-medium p-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
                title="Milestones & Deliverables"
              >
                <CheckSquare className="size-3.5" />
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="rounded-lg text-[11px] font-medium p-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
                title="Documents & Files"
              >
                <FileText className="size-3.5" />
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="rounded-lg text-[11px] font-medium p-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
                title="Media & Mockups"
              >
                <ImageIcon className="size-3.5" />
              </TabsTrigger>
              <TabsTrigger
                value="links"
                className="rounded-lg text-[11px] font-medium p-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
                title="External Links & Tools"
              >
                <Link2 className="size-3.5" />
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="rounded-lg text-[11px] font-medium p-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
                title="Full Team Roster"
              >
                <Users className="size-3.5" />
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0">
            <ProjectOverviewSection project={project} />
          </TabsContent>

          <TabsContent value="dispatch" className="mt-0">
            <ProjectClientDispatchTab
              messages={messages}
              onUpdateApproval={onUpdateApproval}
              onScrollToMessage={onScrollToMessage}
            />
          </TabsContent>

          <TabsContent value="milestones" className="mt-0">
            <ProjectMilestonesTab milestones={project.milestones || []} />
          </TabsContent>

          <TabsContent value="files" className="mt-0">
            <ProjectFilesTab files={project.files || []} />
          </TabsContent>

          <TabsContent value="media" className="mt-0">
            <ProjectMediaTab media={project.media || []} />
          </TabsContent>

          <TabsContent value="links" className="mt-0">
            <ProjectLinksTab links={project.links || []} />
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            <ProjectMembersTab members={project.members || []} />
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}
