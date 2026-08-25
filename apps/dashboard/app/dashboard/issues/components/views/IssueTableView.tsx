"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu";
import {
  Bug,
  ShieldAlert,
  Zap,
  Sparkles,
  MoreHorizontal,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MessageSquare,
  Paperclip,
  Check,
  FolderKanban,
  Flame,
  AlertTriangle,
  GitBranch,
} from "lucide-react";
import { useIssueStore } from "../../data/issue-store";
import type { IssueItem } from "../../types";

export function IssueTableView() {
  const { filteredIssues, setSelectedIssueId, updateIssueStatus, convertToTask } =
    useIssueStore();

  const getPriorityBadge = (issue: IssueItem) => {
    switch (issue.priorityLevel) {
      case 0:
        return (
          <Badge className="bg-rose-500 text-white text-[10px] gap-1 font-bold">
            <Flame className="h-3 w-3" /> P0 Blocker
          </Badge>
        );
      case 1:
        return (
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] gap-1 font-semibold">
            <AlertTriangle className="h-3 w-3" /> P1 Critical
          </Badge>
        );
      case 2:
        return (
          <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-500/30">
            P2 Major
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {issue.priorityName}
          </Badge>
        );
    }
  };

  const getStatusBadge = (category: IssueItem["statusCategory"], name: string) => {
    switch (category) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            {name}
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {name}
          </span>
        );
      case "QA_TESTING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            {name}
          </span>
        );
      case "RESOLVED":
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Check className="h-3 w-3 text-emerald-500" />
            {name}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-muted text-muted-foreground">
            {name}
          </span>
        );
    }
  };

  if (filteredIssues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
          <Bug className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-foreground">No Issues Match Filters</h3>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">
          Try resetting the search query, clearing severity filters, or reporting a new defect.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold">
                <th className="py-3 px-4 w-[110px]">Key</th>
                <th className="py-3 px-4 w-[130px]">Severity</th>
                <th className="py-3 px-4">Title & Context</th>
                <th className="py-3 px-4 w-[180px]">Project / Component</th>
                <th className="py-3 px-4 w-[120px]">Assignee</th>
                <th className="py-3 px-4 w-[140px]">Status</th>
                <th className="py-3 px-4 w-[130px]">SLA SLA Target</th>
                <th className="py-3 px-4 w-[60px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredIssues.map((issue) => (
                <tr
                  key={issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  {/* Key */}
                  <td className="py-3 px-4 font-mono font-bold text-foreground">
                    <span className="hover:text-primary transition-colors">
                      {issue.key}
                    </span>
                  </td>

                  {/* Severity */}
                  <td className="py-3 px-4">
                    {getPriorityBadge(issue)}
                  </td>

                  {/* Title & Metadata */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1 max-w-lg">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {issue.title}
                      </span>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>by {issue.authorName}</span>
                        {issue.commentsCount > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {issue.commentsCount}
                          </span>
                        )}
                        {issue.linkedTaskKey && (
                          <Badge variant="outline" className="text-[9px] gap-1 font-mono border-primary/30 text-primary">
                            <GitBranch className="h-2.5 w-2.5" /> {issue.linkedTaskKey}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Project / Component */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground truncate">
                        {issue.projectName}
                      </span>
                      {issue.componentName && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {issue.componentName}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Assignee */}
                  <td className="py-3 px-4">
                    {issue.assigneeName ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 border border-border">
                          <AvatarImage src={issue.assigneeAvatar || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {issue.assigneeName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate">{issue.assigneeName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Unassigned
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    {getStatusBadge(issue.statusCategory, issue.statusName)}
                  </td>

                  {/* SLA Target */}
                  <td className="py-3 px-4">
                    {issue.slaDueAt ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3 text-amber-500" />
                        <span>
                          {new Date(issue.slaDueAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Actions Menu */}
                  <td
                    className="py-3 px-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          />
                        }
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setSelectedIssueId(issue.id)}
                          className="text-xs cursor-pointer"
                        >
                          View Full Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {!issue.linkedTaskId && (
                          <DropdownMenuItem
                            onClick={() => convertToTask(issue.id)}
                            className="text-xs cursor-pointer text-primary"
                          >
                            Convert to Agile Task
                          </DropdownMenuItem>
                        )}
                        {!issue.isResolved ? (
                          <DropdownMenuItem
                            onClick={() =>
                              updateIssueStatus(issue.id, "RESOLVED", "Resolved")
                            }
                            className="text-xs cursor-pointer text-emerald-600 dark:text-emerald-400"
                          >
                            Mark Resolved
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              updateIssueStatus(issue.id, "OPEN", "Open / Triage")
                            }
                            className="text-xs cursor-pointer"
                          >
                            Re-open Issue
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
