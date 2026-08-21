// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/dispatch-modal/DispatchAuditTimeline.tsx
"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  History,
  Timer,
  FileDiff,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Send,
  Pencil,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { ApprovalWorkflow, ProjectMessageRevision } from "../../types";

interface DispatchAuditTimelineProps {
  workflow: ApprovalWorkflow;
  revisions: ProjectMessageRevision[];
  elapsedFormatted: string;
  isTerminal: boolean;
  currentContent?: string;
}

type TimelineFilter = "ALL" | "STAGES" | "REVISIONS";

interface TimelineItem {
  id: string;
  type: "AUDIT" | "REVISION";
  stageKey: string;
  title: string;
  actorName: string;
  actorRole?: string | null;
  actorAvatar?: string | null;
  timestamp: string;
  durationMinutes?: number | null;
  notes?: string | null;
  contentSnippet?: string | null;
  color: "emerald" | "amber" | "rose" | "blue" | "violet" | "gray" | "slate";
  iconType: "check" | "alert" | "send" | "edit" | "rotate" | "sparkles" | "history";
  rawDate: Date;
}

export function DispatchAuditTimeline({
  workflow,
  revisions,
  elapsedFormatted,
  isTerminal,
  currentContent,
}: DispatchAuditTimelineProps) {
  const [filter, setFilter] = React.useState<TimelineFilter>("ALL");
  const [expandedRevisionIds, setExpandedRevisionIds] = React.useState<Set<string>>(new Set());

  const toggleExpandRevision = (id: string) => {
    setExpandedRevisionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Merge workflow audits and message revisions into a unified chronological activity timeline
  const combinedTimeline = React.useMemo(() => {
    const items: TimelineItem[] = [];

    const existingAudits = [...(workflow.auditTrail || [])];

    // Ensure Draft Created is always represented as the foundation event
    const hasDraftAudit = existingAudits.some(
      (a) =>
        a.stageKey === "DRAFTED" ||
        a.stageKey === "DRAFT_CREATED" ||
        a.stageName.toLowerCase().includes("draft")
    );

    if (!hasDraftAudit && workflow.requestedBy) {
      existingAudits.unshift({
        id: `draft-${workflow.id || "init"}`,
        stageKey: "DRAFTED",
        stageName: "Draft Created",
        actorName: workflow.requestedBy,
        actorRole: "Author",
        timestamp: workflow.requestedAt || "Original",
        notes: `Initial outbound draft created for ${workflow.targetClient}`,
      });
    }

    // Process stage audits
    existingAudits.forEach((a, idx) => {
      let color: TimelineItem["color"] = "gray";
      let iconType: TimelineItem["iconType"] = "history";

      const key = a.stageKey?.toUpperCase() || "";

      if (key === "LEAD_REVIEW" || key === "LEAD_APPROVED" || a.stageName.toLowerCase().includes("approve")) {
        color = "emerald";
        iconType = "check";
      } else if (key === "REVISION_REQUESTED" || a.stageName.toLowerCase().includes("reject")) {
        color = "rose";
        iconType = "alert";
      } else if (key === "REVISION_RESUBMITTED") {
        color = "amber";
        iconType = "rotate";
      } else if (key === "DRAFT_EDITED") {
        color = "amber";
        iconType = "edit";
      } else if (key === "LEAD_EDIT" || key === "SALES_EDIT") {
        color = "violet";
        iconType = "edit";
      } else if (key === "SALES_DISPATCH" || key === "DISPATCHED") {
        color = "blue";
        iconType = "send";
      } else if (key === "POST_DISPATCH_EDIT") {
        color = "violet";
        iconType = "history";
      } else if (key === "DRAFTED" || key === "DRAFT_CREATED") {
        color = "blue";
        iconType = "sparkles";
      }

      items.push({
        id: a.id || `audit-${idx}`,
        type: "AUDIT",
        stageKey: a.stageKey,
        title: a.stageName,
        actorName: a.actorName,
        actorRole: a.actorRole,
        actorAvatar: a.actorAvatar,
        timestamp: a.timestamp,
        durationMinutes: a.durationMinutes,
        notes: a.notes,
        color,
        iconType,
        rawDate: new Date(),
      });
    });

    // Process message revisions
    revisions.forEach((rev, idx) => {
      const formattedDate = new Date(rev.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      items.push({
        id: rev.id || `rev-${idx}`,
        type: "REVISION",
        stageKey: "CONTENT_EDIT",
        title: `Content Edit (v${revisions.length - idx})`,
        actorName: rev.editorName,
        actorRole: rev.editorDesignation || "Editor",
        actorAvatar: rev.editorAvatar,
        timestamp: formattedDate,
        notes: rev.reason || "Content revised",
        contentSnippet: rev.content,
        color: "violet",
        iconType: "edit",
        rawDate: new Date(rev.createdAt),
      });
    });

    return items;
  }, [workflow, revisions]);

  // Filtered view
  const filteredTimeline = React.useMemo(() => {
    if (filter === "STAGES") {
      return combinedTimeline.filter((item) => item.type === "AUDIT");
    }
    if (filter === "REVISIONS") {
      return combinedTimeline.filter((item) => item.type === "REVISION");
    }
    return combinedTimeline;
  }, [combinedTimeline, filter]);

  const revisionCount = revisions.length;
  const auditCount = workflow.auditTrail?.length || 1;

  const renderIcon = (item: TimelineItem) => {
    switch (item.iconType) {
      case "check":
        return <Check className="size-2.5 stroke-[3]" />;
      case "alert":
        return <AlertTriangle className="size-2.5 stroke-[2.5]" />;
      case "send":
        return <Send className="size-2.5" />;
      case "rotate":
        return <RotateCcw className="size-2.5" />;
      case "edit":
        return <Pencil className="size-2.5" />;
      case "sparkles":
        return <Sparkles className="size-2.5" />;
      default:
        return <History className="size-2.5" />;
    }
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3 shadow-2xs">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5 min-w-0">
          <History className="size-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground truncate">
            Audit Log & Revision History
          </span>
          <Badge variant="outline" className="text-[10px] font-mono bg-muted/60 px-1.5 py-0">
            {combinedTimeline.length} events
          </Badge>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60 text-[10px]">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={cn(
              "px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer",
              filter === "ALL"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({combinedTimeline.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("STAGES")}
            className={cn(
              "px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer",
              filter === "STAGES"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Stages ({auditCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("REVISIONS")}
            className={cn(
              "px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer",
              filter === "REVISIONS"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Edits ({revisionCount})
          </button>
        </div>
      </div>

      {/* Active Stage Live Dwell Callout */}
      {!isTerminal && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs">
          <div className="flex items-center gap-2">
            <Timer className="size-4 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
            <div>
              <p className="font-bold text-foreground text-[11px]">
                Active Stage:{" "}
                {workflow.status === "PENDING_LEAD"
                  ? "Tech Lead Review"
                  : workflow.status === "PENDING_SALES"
                  ? "Sales Dispatch"
                  : "Revision Addressing"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Live dwell time:{" "}
                <strong className="text-foreground font-mono">{elapsedFormatted}</strong>
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] font-bold uppercase shrink-0",
              workflow.slaStatus === "BREACHED"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                : workflow.slaStatus === "AT_RISK"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            )}
          >
            {workflow.slaStatus || "ON_TRACK"}
          </Badge>
        </div>
      )}

      {/* Scrollable Timeline Stream */}
      <ScrollArea className="max-h-[380px] pr-2 -mr-1">
        <div className="relative pl-3 space-y-3 pt-1 border-l-2 border-border/70 ml-2.5 my-1">
          {filteredTimeline.map((item, i) => {
            const isExpanded = expandedRevisionIds.has(item.id);
            return (
              <div key={item.id || i} className="relative group text-xs">
                {/* Node Icon on Connected Line */}
                <div
                  className={cn(
                    "absolute -left-[21px] top-1 flex size-5 items-center justify-center rounded-full text-white shadow-2xs transition-transform group-hover:scale-110",
                    item.color === "emerald"
                      ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                      : item.color === "rose"
                      ? "bg-rose-500 ring-2 ring-rose-500/20"
                      : item.color === "amber"
                      ? "bg-amber-500 ring-2 ring-amber-500/20"
                      : item.color === "blue"
                      ? "bg-blue-500 ring-2 ring-blue-500/20"
                      : item.color === "violet"
                      ? "bg-violet-500 ring-2 ring-violet-500/20"
                      : "bg-primary ring-2 ring-primary/20"
                  )}
                >
                  {renderIcon(item)}
                </div>

                {/* Event Card */}
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 hover:border-border/90 hover:bg-muted/40 transition-colors space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-bold text-foreground text-[11px] flex items-center gap-1.5">
                      <span>{item.title}</span>
                      {item.type === "REVISION" && (
                        <Badge className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30 text-[9px] font-mono px-1 py-0">
                          Edit
                        </Badge>
                      )}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {item.timestamp}{" "}
                      {item.durationMinutes ? `(+${item.durationMinutes}m dwell)` : ""}
                    </span>
                  </div>

                  {/* Actor Badge */}
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {item.actorAvatar ? (
                      <Avatar className="size-3.5 rounded-full ring-1 ring-border/40">
                        <AvatarImage src={item.actorAvatar} alt={item.actorName} />
                        <AvatarFallback className="text-[6px]">
                          {item.actorName.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="size-3.5 rounded-full bg-muted flex items-center justify-center text-[7px] font-bold text-foreground">
                        {item.actorName.slice(0, 1)}
                      </div>
                    )}
                    <span className="font-semibold text-foreground/90">{item.actorName}</span>
                    {item.actorRole && <span>• {item.actorRole}</span>}
                  </div>

                  {/* Notes / Reason / Feedback */}
                  {item.notes && (
                    <p
                      className={cn(
                        "text-[11px] leading-relaxed p-2 rounded-lg border font-sans break-words",
                        item.color === "rose"
                          ? "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20 font-medium"
                          : item.color === "amber"
                          ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20"
                          : item.color === "violet"
                          ? "bg-violet-500/10 text-violet-800 dark:text-violet-300 border-violet-500/20"
                          : "bg-background/90 text-foreground/90 border-border/50"
                      )}
                    >
                      <strong>
                        {item.color === "rose"
                          ? "Feedback: "
                          : item.type === "REVISION"
                          ? "Change Reason: "
                          : "Note: "}
                      </strong>
                      {item.notes}
                    </p>
                  )}

                  {/* Revision Content Diff Viewer Toggle */}
                  {item.contentSnippet && (
                    <div className="pt-0.5 space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleExpandRevision(item.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <FileDiff className="size-3" />
                        <span>
                          {isExpanded ? "Hide previous version" : "Inspect previous version snippet"}
                        </span>
                        {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      </button>

                      {isExpanded && (
                        <div className="p-2.5 rounded-lg bg-background/95 border border-border/70 text-[10px] leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-36 overflow-y-auto font-sans space-y-1.5">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono pb-1 border-b border-border/40">
                            <span>Snapshot before this edit:</span>
                            <Badge variant="outline" className="text-[8px] py-0 px-1">
                              {item.contentSnippet.length} chars
                            </Badge>
                          </div>
                          <p className="text-foreground/90 font-mono text-[10px]">{item.contentSnippet}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
