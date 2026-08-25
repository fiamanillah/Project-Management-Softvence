"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
  Flame,
  AlertTriangle,
  Clock,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  FolderKanban,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { useIssueStore } from "../../data/issue-store";
import type { IssueItem } from "../../types";

const KANBAN_COLUMNS: {
  category: IssueItem["statusCategory"];
  label: string;
  color: string;
}[] = [
  { category: "OPEN", label: "Open / Triage", color: "#ef4444" },
  { category: "IN_PROGRESS", label: "Investigating / In Progress", color: "#f59e0b" },
  { category: "QA_TESTING", label: "Ready for QA", color: "#8b5cf6" },
  { category: "RESOLVED", label: "Resolved & Closed", color: "#10b981" },
];

export function IssueKanbanView() {
  const { filteredIssues, setSelectedIssueId, updateIssueStatus } = useIssueStore();

  return (
    <div className="flex gap-4 overflow-x-auto p-6 min-h-[calc(100vh-220px)] items-start">
      {KANBAN_COLUMNS.map((col) => {
        const columnIssues = filteredIssues.filter(
          (i) =>
            i.statusCategory === col.category ||
            (col.category === "RESOLVED" && i.statusCategory === "CLOSED")
        );

        return (
          <div
            key={col.category}
            className="flex flex-col flex-1 min-w-[300px] max-w-[380px] rounded-2xl border border-border/80 bg-muted/20 p-3 shadow-2xs gap-3 shrink-0"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1 py-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <span className="text-xs font-bold text-foreground">
                  {col.label}
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold h-5 px-2">
                {columnIssues.length}
              </Badge>
            </div>

            {/* Cards List */}
            <div className="flex flex-col gap-2.5 min-h-[150px]">
              {columnIssues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  className="flex flex-col rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer gap-2.5"
                >
                  {/* Top: Key & Severity */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground hover:text-primary">
                      {issue.key}
                    </span>
                    {issue.priorityLevel === 0 ? (
                      <Badge className="bg-rose-500 text-white text-[9px] gap-1 font-bold h-4 px-1.5">
                        <Flame className="h-2.5 w-2.5" /> P0 Blocker
                      </Badge>
                    ) : issue.priorityLevel === 1 ? (
                      <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] gap-1 font-semibold h-4 px-1.5">
                        <AlertTriangle className="h-2.5 w-2.5" /> P1 Critical
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {issue.priorityName}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-relaxed">
                    {issue.title}
                  </h4>

                  {/* Project & Component info */}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                    <FolderKanban className="h-3 w-3 shrink-0 text-primary" />
                    <span className="truncate">{issue.projectName}</span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {issue.commentsCount > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {issue.commentsCount}
                        </span>
                      )}
                      {issue.linkedTaskKey && (
                        <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary h-4 px-1">
                          {issue.linkedTaskKey}
                        </Badge>
                      )}
                    </div>

                    {/* Assignee Avatar */}
                    {issue.assigneeName ? (
                      <Avatar className="h-5 w-5 border border-border">
                        <AvatarImage src={issue.assigneeAvatar || undefined} />
                        <AvatarFallback className="text-[9px]">
                          {issue.assigneeName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="text-[10px] italic">Unassigned</span>
                    )}
                  </div>
                </div>
              ))}

              {columnIssues.length === 0 && (
                <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border/60 rounded-xl text-muted-foreground text-xs">
                  <span>No issues in this stage</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
