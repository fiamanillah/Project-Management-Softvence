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
import type {
  ProjectWorkspaceItem,
  ChatMessage,
  ApprovalWorkflow,
  ProjectMediaItem,
  ProjectFileItem,
  ProjectLinkItem,
} from "../types";

interface ProjectDetailsSidebarProps {
  project: ProjectWorkspaceItem;
  messages?: ChatMessage[];
  onUpdateApproval?: (messageId: string, workflow: ApprovalWorkflow) => void;
  onTogglePin?: (projectId: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  onClose?: () => void;
  className?: string;
}

export function ProjectDetailsSidebar({
  project,
  messages = [],
  onUpdateApproval,
  onTogglePin,
  onScrollToMessage,
  onClose,
  className,
}: ProjectDetailsSidebarProps) {
  const [activeTab, setActiveTab] = React.useState("overview");

  // 1. Client messages count
  const clientMessagesCount = React.useMemo(() => {
    return messages.filter((m) => m.approval && m.approval.status !== "NOT_REQUIRED").length;
  }, [messages]);

  // 2. Media Items Aggregation (from project.media + chat message image attachments)
  const allMedia: ProjectMediaItem[] = React.useMemo(() => {
    const list: ProjectMediaItem[] = [...(project.media || [])];
    const seenUrls = new Set(list.map((m) => m.url));

    messages.forEach((msg) => {
      (msg.attachments || []).forEach((att) => {
        const isImage =
          att.type === "image" ||
          att.mimeType?.startsWith("image/") ||
          /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(att.name || att.url || "");

        if (isImage && att.url && !seenUrls.has(att.url)) {
          seenUrls.add(att.url);
          list.push({
            id: att.id || `media-${msg.id}-${att.name}`,
            title: att.name || "Image attachment",
            url: att.url,
            type: "image",
            uploadedAt: msg.timestamp || "Recently",
            uploaderName: msg.senderName || "Team Member",
            dimensions: att.dimensions
              ? `${att.dimensions.width} × ${att.dimensions.height}`
              : undefined,
          });
        }
      });
    });

    return list;
  }, [project.media, messages]);

  // 3. Documents & Files Aggregation (from project.files + chat message document attachments)
  const allFiles: ProjectFileItem[] = React.useMemo(() => {
    const list: ProjectFileItem[] = [...(project.files || [])];
    const seenUrls = new Set(list.map((f) => f.downloadUrl || f.id));

    messages.forEach((msg) => {
      (msg.attachments || []).forEach((att) => {
        const isImage =
          att.type === "image" ||
          att.mimeType?.startsWith("image/") ||
          /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(att.name || att.url || "");
        const isLink = att.type === "link";

        if (!isImage && !isLink && att.url && !seenUrls.has(att.url)) {
          seenUrls.add(att.url);
          const ext =
            att.extension ||
            att.name?.split(".").pop() ||
            (att.mimeType ? att.mimeType.split("/")[1] : "file") ||
            "file";

          const size =
            att.size ||
            (att.fileSizeBytes
              ? att.fileSizeBytes > 1024 * 1024
                ? `${(att.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.round(att.fileSizeBytes / 1024)} KB`
              : "Attachment");

          list.push({
            id: att.id || `file-${msg.id}-${att.name}`,
            name: att.name || "Project Document",
            size,
            extension: ext,
            uploadedAt: msg.timestamp || "Recently",
            uploaderName: msg.senderName || "Team Member",
            downloadUrl: att.url,
          });
        }
      });
    });

    return list;
  }, [project.files, messages]);

  // 4. External Links Aggregation (from project.links + links in messages)
  const allLinks: ProjectLinkItem[] = React.useMemo(() => {
    const list: ProjectLinkItem[] = [...(project.links || [])];
    const seenUrls = new Set(list.map((l) => l.url.toLowerCase()));

    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

    messages.forEach((msg) => {
      // Check link attachments
      (msg.attachments || []).forEach((att) => {
        if (att.type === "link" && att.url && !seenUrls.has(att.url.toLowerCase())) {
          seenUrls.add(att.url.toLowerCase());
          let category: "Figma" | "GitHub" | "Jira" | "Docs" | "Staging" | "Other" = "Other";
          const low = att.url.toLowerCase();
          if (low.includes("figma.com")) category = "Figma";
          else if (low.includes("github.com") || low.includes("gitlab.com")) category = "GitHub";
          else if (low.includes("jira.") || low.includes("atlassian.net")) category = "Jira";
          else if (low.includes("docs.google.com") || low.includes("notion.so")) category = "Docs";
          else if (low.includes("staging.") || low.includes("vercel.app") || low.includes("netlify.app"))
            category = "Staging";

          list.push({
            id: att.id || `link-${msg.id}-${att.url}`,
            title: att.name || `${category} Link`,
            url: att.url,
            category,
            addedAt: msg.timestamp || "Recently",
            description: `Shared by ${msg.senderName}`,
          });
        }
      });

      // Detect URLs in message text
      if (msg.text) {
        const matches = msg.text.match(urlRegex);
        if (matches) {
          matches.forEach((matchedUrl) => {
            const cleanUrl = matchedUrl.trim();
            if (!seenUrls.has(cleanUrl.toLowerCase())) {
              seenUrls.add(cleanUrl.toLowerCase());

              let category: "Figma" | "GitHub" | "Jira" | "Docs" | "Staging" | "Other" = "Other";
              const low = cleanUrl.toLowerCase();
              if (low.includes("figma.com")) category = "Figma";
              else if (low.includes("github.com") || low.includes("gitlab.com")) category = "GitHub";
              else if (low.includes("jira.") || low.includes("atlassian.net")) category = "Jira";
              else if (low.includes("docs.google.com") || low.includes("notion.so")) category = "Docs";
              else if (
                low.includes("staging.") ||
                low.includes("vercel.app") ||
                low.includes("netlify.app")
              )
                category = "Staging";

              let title = `${category} Resource`;
              if (category === "Other") {
                try {
                  const parsed = new URL(cleanUrl);
                  title = parsed.hostname.replace(/^www\./, "");
                } catch {
                  title = "Shared Link";
                }
              }

              list.push({
                id: `link-${msg.id}-${cleanUrl}`,
                title,
                url: cleanUrl,
                category,
                addedAt: msg.timestamp || "Recently",
                description: `Shared in message by ${msg.senderName}`,
              });
            }
          });
        }
      }
    });

    return list;
  }, [project.links, messages]);

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
      count: allFiles.length,
    },
    {
      id: "media",
      label: "Media",
      tooltip: "Pictures, Media & Mockups",
      icon: ImageIcon,
      count: allMedia.length,
    },
    {
      id: "links",
      label: "Links",
      tooltip: "External Links & Resources",
      icon: Link2,
      count: allLinks.length,
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
            <ProjectProfileHeader project={project} onTogglePin={onTogglePin} />
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
              <ProjectFilesTab files={allFiles} />
            </TabsContent>

            <TabsContent value="media" className="mt-0 outline-none">
              <ProjectMediaTab media={allMedia} />
            </TabsContent>

            <TabsContent value="links" className="mt-0 outline-none">
              <ProjectLinksTab links={allLinks} />
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
