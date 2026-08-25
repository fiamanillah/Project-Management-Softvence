"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Textarea } from "@workspace/ui/components/textarea";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Bug,
  Flame,
  AlertTriangle,
  Clock,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  FolderKanban,
  GitBranch,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Send,
  Lock,
  Globe,
  Terminal,
  Check,
} from "lucide-react";
import { useIssueStore } from "../../data/issue-store";

export function IssueDetailModal() {
  const {
    selectedIssueId,
    setSelectedIssueId,
    selectedIssue,
    comments,
    addComment,
    toggleReproductionStep,
    resolveIssue,
    updateIssueStatus,
    convertToTask,
  } = useIssueStore();

  const [commentText, setCommentText] = React.useState("");
  const [isInternalOnly, setIsInternalOnly] = React.useState(false);
  const [resolutionNotes, setResolutionNotes] = React.useState("");
  const [isResolving, setIsResolving] = React.useState(false);

  if (!selectedIssue) return null;

  const issueComments = comments[selectedIssue.id] || [];

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(selectedIssue.id, commentText.trim(), isInternalOnly);
    setCommentText("");
  };

  const handleConfirmResolve = () => {
    if (!resolutionNotes.trim()) return;
    resolveIssue(selectedIssue.id, resolutionNotes.trim());
    setIsResolving(false);
    setResolutionNotes("");
  };

  return (
    <Dialog
      open={Boolean(selectedIssueId)}
      onOpenChange={(open) => {
        if (!open) setSelectedIssueId(null);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/80 bg-card">
        {/* Modal Top Header */}
        <div className="flex items-start justify-between p-6 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col gap-2 flex-1 pr-6">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono font-bold text-sm text-primary">
                {selectedIssue.key}
              </span>
              <Badge variant="outline" className="text-xs">
                {selectedIssue.projectName}
              </Badge>
              {selectedIssue.componentName && (
                <Badge variant="secondary" className="text-xs">
                  {selectedIssue.componentName}
                </Badge>
              )}
              {selectedIssue.priorityLevel === 0 ? (
                <Badge className="bg-rose-500 text-white text-[10px] gap-1 font-bold">
                  <Flame className="h-3 w-3" /> P0 Blocker
                </Badge>
              ) : selectedIssue.priorityLevel === 1 ? (
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 font-semibold">
                  <AlertTriangle className="h-3 w-3" /> P1 Critical
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  {selectedIssue.priorityName}
                </Badge>
              )}
            </div>

            <DialogTitle className="text-lg font-bold text-foreground leading-snug">
              {selectedIssue.title}
            </DialogTitle>

            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
              <span>Reported by <strong>{selectedIssue.authorName}</strong></span>
              <span>•</span>
              <span>
                {new Date(selectedIssue.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Quick Resolution Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!selectedIssue.isResolved ? (
              <Button
                size="sm"
                onClick={() => setIsResolving(true)}
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Resolve Issue</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateIssueStatus(selectedIssue.id, "OPEN", "Open / Triage")
                }
                className="h-8 text-xs text-muted-foreground"
              >
                Re-open Issue
              </Button>
            )}
          </div>
        </div>

        {/* Modal Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          {/* Left 2 Cols: Description, Repro Steps, Comments */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Description */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Description & Symptoms
              </h3>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {selectedIssue.content || "No detailed description provided."}
              </div>
            </div>

            {/* Reproduction Steps */}
            {selectedIssue.reproductionSteps && selectedIssue.reproductionSteps.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Reproduction Checklist
                </h3>
                <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4">
                  {selectedIssue.reproductionSteps.map((step) => (
                    <div
                      key={step.id}
                      onClick={() => toggleReproductionStep(selectedIssue.id, step.id)}
                      className="flex items-start gap-2.5 cursor-pointer select-none group"
                    >
                      <Checkbox
                        checked={step.isChecked}
                        onCheckedChange={() =>
                          toggleReproductionStep(selectedIssue.id, step.id)
                        }
                        className="mt-0.5"
                      />
                      <span
                        className={`text-xs transition-colors ${
                          step.isChecked
                            ? "line-through text-muted-foreground"
                            : "text-foreground group-hover:text-primary"
                        }`}
                      >
                        {step.step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Notes (If Resolved) */}
            {selectedIssue.isResolved && selectedIssue.resolutionNotes && (
              <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Resolution Notes (Resolved by {selectedIssue.resolverName})
                </span>
                <p className="text-xs text-foreground">
                  {selectedIssue.resolutionNotes}
                </p>
              </div>
            )}

            {/* Resolve Form Dropdown (If resolving active) */}
            {isResolving && (
              <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  Complete Resolution Report
                </span>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe root cause and how this defect was fixed/verified..."
                  className="text-xs bg-background h-20"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsResolving(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmResolve}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Confirm Resolution
                  </Button>
                </div>
              </div>
            )}

            {/* Threaded Discussion */}
            <div className="flex flex-col gap-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" /> Discussion & Updates ({issueComments.length})
              </h3>

              <div className="flex flex-col gap-3">
                {issueComments.map((cm) => (
                  <div
                    key={cm.id}
                    className={`flex flex-col gap-1.5 rounded-xl border p-3.5 text-xs ${
                      cm.isInternalOnly
                        ? "border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/10"
                        : "border-border/60 bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={cm.authorAvatar} />
                          <AvatarFallback className="text-[9px]">
                            {cm.authorName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-foreground">
                          {cm.authorName}
                        </span>
                        {cm.isInternalOnly && (
                          <Badge variant="outline" className="text-[9px] gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
                            <Lock className="h-2.5 w-2.5" /> Internal Note
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(cm.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed pl-7">
                      {cm.content}
                    </p>
                  </div>
                ))}

                {/* Add Comment Input */}
                <form onSubmit={handlePostComment} className="flex flex-col gap-2 pt-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment or status update..."
                    className="text-xs bg-background min-h-[70px]"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={isInternalOnly}
                        onCheckedChange={(c) => setIsInternalOnly(Boolean(c))}
                      />
                      <span>Internal staff only note</span>
                    </label>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-7 text-xs gap-1.5 bg-primary text-primary-foreground"
                    >
                      <Send className="h-3 w-3" /> Post Comment
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Metadata, SLA, Environment, Agile Link */}
          <div className="flex flex-col gap-4">
            {/* Status Card */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4">
              <span className="text-xs font-bold text-foreground">
                Triage State
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {selectedIssue.statusName}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Assignee:</span>
                <span className="font-medium text-foreground">
                  {selectedIssue.assigneeName || "Unassigned"}
                </span>
              </div>
              {selectedIssue.slaDueAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">SLA Deadline:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {new Date(selectedIssue.slaDueAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Environment Details */}
            {selectedIssue.environment && (
              <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card p-4 text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-primary" /> Environment Specs
                </span>
                <div className="flex flex-col gap-1.5 pt-1 text-muted-foreground">
                  {selectedIssue.environment.os && (
                    <div className="flex justify-between">
                      <span>OS:</span>
                      <strong className="text-foreground">{selectedIssue.environment.os}</strong>
                    </div>
                  )}
                  {selectedIssue.environment.browser && (
                    <div className="flex justify-between">
                      <span>Runtime:</span>
                      <strong className="text-foreground">{selectedIssue.environment.browser}</strong>
                    </div>
                  )}
                  {selectedIssue.environment.version && (
                    <div className="flex justify-between">
                      <span>Build Version:</span>
                      <strong className="text-foreground font-mono">{selectedIssue.environment.version}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Linked Agile Task */}
            <div className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-card p-4">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-primary" /> Agile Sprint Link
              </span>

              {selectedIssue.linkedTaskId ? (
                <div className="flex flex-col gap-1 rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary">
                      {selectedIssue.linkedTaskKey}
                    </span>
                    <Badge variant="outline" className="text-[9px]">
                      Linked Task
                    </Badge>
                  </div>
                  <span className="text-xs text-foreground line-clamp-2 mt-1">
                    {selectedIssue.linkedTaskTitle || selectedIssue.title}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-xs">
                  <p className="text-muted-foreground text-[11px]">
                    Not yet linked to any sprint task in the backlog.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => convertToTask(selectedIssue.id)}
                    className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Convert to Agile Task</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
