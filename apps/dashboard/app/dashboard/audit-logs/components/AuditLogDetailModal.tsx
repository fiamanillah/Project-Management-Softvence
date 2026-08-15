"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Separator } from "@workspace/ui/components/separator";
import { Input } from "@workspace/ui/components/input";
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  User,
  Clock,
  Terminal,
  Copy,
  Check,
  FileCode2,
  Network,
  ArrowRightLeft,
  Search,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Server,
  Hash,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { AuditLogItem } from "./AuditLogTable";

interface AuditLogDetailModalProps {
  log: AuditLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseUserAgent(ua?: string) {
  if (!ua || ua === "N/A") return { browser: "Unknown Browser", os: "Unknown OS" };
  let browser = "Web Browser";
  let os = "Desktop";

  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("PostmanRuntime")) browser = "Postman API Client";
  else if (ua.includes("curl/")) browser = "cURL Client";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return { browser, os };
}

function getInitials(email?: string) {
  if (!email) return "SYS";
  return email.substring(0, 2).toUpperCase();
}

export function AuditLogDetailModal({ log, open, onOpenChange }: AuditLogDetailModalProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [diffSearch, setDiffSearch] = React.useState("");
  const [diffViewMode, setDiffViewMode] = React.useState<"table" | "split">("table");

  if (!log) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const actorEmail = log.actor?.email || "System Automated Worker";
  const actorIp = log.actor?.ipAddress || log.ipAddress || "127.0.0.1";
  const userAgent = log.actor?.userAgent || log.userAgent || "N/A";
  const { browser, os } = parseUserAgent(userAgent);
  const eventId = log.auditId || log._id;

  const diffEntries = log.changes?.diff ? Object.entries(log.changes.diff) : [];
  const filteredDiffEntries = diffEntries.filter(([key]) =>
    key.toLowerCase().includes(diffSearch.toLowerCase())
  );
  const diffCount = diffEntries.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl lg:max-w-6xl max-h-[90vh] h-[90vh] flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl bg-background rounded-2xl gap-0">
        {/* Top Hero Banner / Header */}
        <div className="px-6 py-4 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`size-10 rounded-xl flex items-center justify-center border shadow-xs shrink-0 ${
                log.status === "SUCCESS"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-500"
              }`}
            >
              {log.status === "SUCCESS" ? (
                <ShieldCheck className="size-5" />
              ) : (
                <ShieldAlert className="size-5" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground font-mono">
                  {log.action}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] font-semibold uppercase px-2 h-5 bg-primary/10 text-primary border-primary/20"
                >
                  {log.module}
                </Badge>
                {log.status === "SUCCESS" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] h-5 font-bold gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    SUCCESS
                  </Badge>
                ) : (
                  <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] h-5 font-bold gap-1">
                    <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                    FAILED
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Event ID: <span className="font-mono text-foreground font-medium">{eventId}</span></span>
                <span>•</span>
                <span>{new Date(log.createdAt).toLocaleString()}</span>
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(eventId, "Event ID")}
              className="h-8 text-xs gap-1.5 border-border/80 hover:bg-muted"
            >
              {copiedField === "Event ID" ? (
                <Check className="size-3.5 text-emerald-500" />
              ) : (
                <Hash className="size-3.5" />
              )}
              {copiedField === "Event ID" ? "Copied ID" : "Copy ID"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(log, null, 2), "Full JSON")}
              className="h-8 text-xs gap-1.5 border-border/80 hover:bg-muted"
            >
              {copiedField === "Full JSON" ? (
                <Check className="size-3.5 text-emerald-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copiedField === "Full JSON" ? "Copied JSON" : "Copy JSON"}
            </Button>
          </div>
        </div>

        {/* Master-Detail Split Workspace */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Forensic Sidebar (Identity & Context) */}
          <div className="w-full md:w-80 lg:w-84 border-b md:border-b-0 md:border-r border-border/60 bg-muted/10 flex flex-col shrink-0 min-h-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 text-xs">
                {/* Failure Banner if Error */}
                {log.errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>Security Exception / Error</span>
                    </div>
                    <p className="font-mono text-[11px] leading-relaxed break-words">
                      {log.errorMessage}
                    </p>
                  </div>
                )}

                {/* Actor Identity Card */}
                <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <User className="size-3.5 text-primary" /> Actor Identity
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] h-4.5 px-1.5 font-semibold">
                      {log.actor?.role || "Staff"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2.5 pt-0.5">
                    <Avatar className="size-9 border border-border shrink-0">
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {getInitials(actorEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate" title={actorEmail}>
                        {actorEmail}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate" title={log.actor?.id || "N/A"}>
                        ID: {log.actor?.id || "System"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Network & Device Context */}
                <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Globe className="size-3.5 text-primary" /> Client & Network
                  </span>

                  <div className="space-y-2 pt-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">IP Address</span>
                      <span className="font-mono font-semibold text-foreground">{actorIp}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Platform / OS</span>
                      <Badge variant="secondary" className="text-[10px] font-medium h-5">
                        {os}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Client Agent</span>
                      <Badge variant="secondary" className="text-[10px] font-medium h-5">
                        {browser}
                      </Badge>
                    </div>
                    {log.httpContext?.durationMs !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Latency / Duration</span>
                        <span className="font-mono text-foreground font-medium">
                          {log.httpContext.durationMs} ms
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <span className="block text-[10px] text-muted-foreground mb-1">Raw User-Agent</span>
                    <p className="font-mono text-[10px] text-muted-foreground bg-muted/40 p-2 rounded-lg break-all leading-tight">
                      {userAgent}
                    </p>
                  </div>
                </div>

                {/* Target Entity Context */}
                <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" /> Target Entity
                  </span>

                  <div className="space-y-2 pt-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Entity Type</span>
                      <span className="font-mono font-bold text-foreground">
                        {log.entityTable || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground mb-1">Entity Identifier</span>
                      <span className="font-mono text-[11px] text-foreground font-medium bg-muted/40 p-1.5 rounded block truncate select-all">
                        {log.entityId || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Request Correlation */}
                {log.httpContext?.requestId && (
                  <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1.5 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity className="size-3.5 text-primary" /> Request Correlation
                    </span>
                    <span className="font-mono text-[10px] text-foreground block bg-muted/40 p-2 rounded-lg break-all select-all">
                      {log.httpContext.requestId}
                    </span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Main Panel (Interactive Inspector Workstation) */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
            <Tabs defaultValue="changes" className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Tab Navigation Bar */}
              <div className="px-4 pt-3 pb-2 border-b border-border/60 flex items-center justify-between gap-3 shrink-0 bg-muted/10">
                <TabsList className="h-9 bg-muted/60 p-1 text-xs grid grid-cols-3 max-w-md">
                  <TabsTrigger value="changes" className="text-xs font-semibold gap-1.5">
                    <ArrowRightLeft className="size-3.5" />
                    <span>State Changes</span>
                    {diffCount > 0 && (
                      <span className="size-4.5 px-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                        {diffCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="http" className="text-xs font-semibold gap-1.5">
                    <Network className="size-3.5" />
                    <span>HTTP Trace</span>
                  </TabsTrigger>
                  <TabsTrigger value="raw" className="text-xs font-semibold gap-1.5">
                    <Code2 className="size-3.5" />
                    <span>Raw Record</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Content Container */}
              <ScrollArea className="flex-1 min-h-0 p-4">
                {/* 1. STATE CHANGES TAB */}
                <TabsContent value="changes" className="space-y-4 mt-0 min-h-0 focus-visible:outline-none">
                  {log.changes?.diff || log.changes?.before || log.changes?.after ? (
                    <div className="space-y-3.5">
                      {/* Diff Header Bar & Controls */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <Sparkles className="size-3.5 text-primary" />
                            Entity Mutation Forensic Log
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px] font-medium">
                            {diffCount} attribute{diffCount !== 1 ? "s" : ""} modified
                          </Badge>
                        </div>

                        {diffCount > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="relative w-44 sm:w-56">
                              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Filter changed keys..."
                                value={diffSearch}
                                onChange={(e) => setDiffSearch(e.target.value)}
                                className="h-8 pl-8 text-xs bg-muted/20"
                              />
                            </div>
                            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 shrink-0">
                              <Button
                                variant={diffViewMode === "table" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setDiffViewMode("table")}
                                className="h-7 text-xs px-2.5"
                              >
                                Table
                              </Button>
                              <Button
                                variant={diffViewMode === "split" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setDiffViewMode("split")}
                                className="h-7 text-xs px-2.5"
                              >
                                Split
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* View Mode 1: Clean Unified Diff Table */}
                      {diffViewMode === "table" && diffCount > 0 && (
                        <div className="rounded-xl border border-border/80 overflow-hidden shadow-2xs bg-card">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-muted/50 border-b border-border/70 font-semibold text-muted-foreground">
                                <tr>
                                  <th className="py-2.5 px-3.5 w-1/4 font-semibold">Field / Key</th>
                                  <th className="py-2.5 px-3.5 w-3/8 font-semibold text-rose-500">
                                    Previous State (Before)
                                  </th>
                                  <th className="py-2.5 px-3.5 w-3/8 font-semibold text-emerald-500">
                                    New State (After)
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                                {filteredDiffEntries.length === 0 ? (
                                  <tr>
                                    <td colSpan={3} className="py-6 text-center text-muted-foreground">
                                      No fields matching &ldquo;{diffSearch}&rdquo;
                                    </td>
                                  </tr>
                                ) : (
                                  filteredDiffEntries.map(([key, change]: [string, any]) => {
                                    const beforeVal = change?.before !== undefined ? change.before : change?.old;
                                    const afterVal = change?.after !== undefined ? change.after : change?.new;

                                    return (
                                      <tr key={key} className="hover:bg-muted/15 transition-colors">
                                        <td className="py-2.5 px-3.5 font-bold text-foreground bg-muted/10">
                                          {key}
                                        </td>
                                        <td className="py-2.5 px-3.5 bg-rose-500/5 text-rose-600 dark:text-rose-400 break-all leading-relaxed align-top">
                                          {beforeVal === undefined || beforeVal === null ? (
                                            <span className="italic text-muted-foreground text-[10px]">null / empty</span>
                                          ) : typeof beforeVal === "object" ? (
                                            <pre className="text-[10px] whitespace-pre-wrap">{JSON.stringify(beforeVal, null, 2)}</pre>
                                          ) : (
                                            String(beforeVal)
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3.5 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 break-all leading-relaxed align-top">
                                          {afterVal === undefined || afterVal === null ? (
                                            <span className="italic text-muted-foreground text-[10px]">null / empty</span>
                                          ) : typeof afterVal === "object" ? (
                                            <pre className="text-[10px] whitespace-pre-wrap">{JSON.stringify(afterVal, null, 2)}</pre>
                                          ) : (
                                            String(afterVal)
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* View Mode 2: Split Before vs After Payloads */}
                      {(diffViewMode === "split" || diffCount === 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {log.changes?.before ? (
                            <div className="rounded-xl border border-border/80 overflow-hidden shadow-2xs bg-card">
                              <div className="px-3.5 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
                                <span className="font-bold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                  Previous State Snapshot
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(JSON.stringify(log.changes?.before, null, 2), "Previous State")}
                                  className="h-6 text-[10px] text-rose-500 hover:text-rose-600 gap-1 px-1.5"
                                >
                                  <Copy className="size-3" /> Copy
                                </Button>
                              </div>
                              <pre className="p-3 bg-zinc-950 text-rose-300 font-mono text-[11px] overflow-auto max-h-80 leading-relaxed">
                                {JSON.stringify(log.changes.before, null, 2)}
                              </pre>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-1">
                              <span>No previous state payload captured</span>
                            </div>
                          )}

                          {log.changes?.after ? (
                            <div className="rounded-xl border border-border/80 overflow-hidden shadow-2xs bg-card">
                              <div className="px-3.5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                                <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                  New State Snapshot
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(JSON.stringify(log.changes?.after, null, 2), "New State")}
                                  className="h-6 text-[10px] text-emerald-500 hover:text-emerald-600 gap-1 px-1.5"
                                >
                                  <Copy className="size-3" /> Copy
                                </Button>
                              </div>
                              <pre className="p-3 bg-zinc-950 text-emerald-300 font-mono text-[11px] overflow-auto max-h-80 leading-relaxed">
                                {JSON.stringify(log.changes.after, null, 2)}
                              </pre>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-1">
                              <span>No post-mutation state payload captured</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-12 text-center border border-dashed rounded-xl bg-card text-muted-foreground space-y-2">
                      <ArrowRightLeft className="size-8 mx-auto text-muted-foreground/40" />
                      <p className="font-semibold text-foreground text-sm">No State Mutation Recorded</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        This event did not modify database entity properties or was a read-only telemetry action.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* 2. HTTP & PAYLOAD TRACE TAB */}
                <TabsContent value="http" className="space-y-4 mt-0 min-h-0 focus-visible:outline-none">
                  {log.httpContext ? (
                    <div className="space-y-3.5">
                      {/* Endpoint Banner */}
                      <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="font-mono font-bold text-xs bg-primary text-primary-foreground">
                              {log.httpContext.method || "GET"}
                            </Badge>
                            <span className="font-mono font-bold text-xs text-foreground">
                              {log.httpContext.path || "/api/v1"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <Badge
                              variant="outline"
                              className={
                                log.httpContext.statusCode && log.httpContext.statusCode < 400
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold"
                                  : "bg-rose-500/10 text-rose-600 border-rose-500/30 font-bold"
                              }
                            >
                              Status {log.httpContext.statusCode || 200}
                            </Badge>
                            {log.httpContext.durationMs !== undefined && (
                              <Badge variant="secondary" className="font-mono text-[10px]">
                                {log.httpContext.durationMs}ms
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Query & Route Params */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {log.httpContext.query && Object.keys(log.httpContext.query).length > 0 && (
                          <div className="rounded-xl border border-border/80 overflow-hidden shadow-2xs bg-card">
                            <div className="px-3.5 py-2 bg-muted/40 border-b flex items-center justify-between">
                              <span className="font-bold text-xs text-foreground">Query Parameters</span>
                            </div>
                            <pre className="p-3 bg-zinc-950 text-sky-300 font-mono text-[11px] overflow-auto max-h-48">
                              {JSON.stringify(log.httpContext.query, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.httpContext.params && Object.keys(log.httpContext.params).length > 0 && (
                          <div className="rounded-xl border border-border/80 overflow-hidden shadow-2xs bg-card">
                            <div className="px-3.5 py-2 bg-muted/40 border-b flex items-center justify-between">
                              <span className="font-bold text-xs text-foreground">Route Parameters</span>
                            </div>
                            <pre className="p-3 bg-zinc-950 text-amber-300 font-mono text-[11px] overflow-auto max-h-48">
                              {JSON.stringify(log.httpContext.params, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>

                      {/* Request Payload / Body */}
                      {log.httpContext.requestBody && Object.keys(log.httpContext.requestBody).length > 0 && (
                        <div className="rounded-xl border border-border/80 overflow-hidden shadow-2xs bg-card">
                          <div className="px-3.5 py-2 bg-muted/40 border-b flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              <Server className="size-3.5 text-primary" /> Request Body Payload
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(JSON.stringify(log.httpContext?.requestBody, null, 2), "Request Body")}
                              className="h-6 text-[10px] gap-1 px-1.5"
                            >
                              <Copy className="size-3" /> Copy
                            </Button>
                          </div>
                          <pre className="p-3 bg-zinc-950 text-emerald-300 font-mono text-[11px] overflow-auto max-h-64 leading-relaxed">
                            {JSON.stringify(log.httpContext.requestBody, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-12 text-center border border-dashed rounded-xl bg-card text-muted-foreground space-y-2">
                      <Network className="size-8 mx-auto text-muted-foreground/40" />
                      <p className="font-semibold text-foreground text-sm">No HTTP Context Attached</p>
                      <p className="text-xs text-muted-foreground">
                        This was an internal daemon/worker invocation without HTTP route parameters.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* 3. RAW RECORD TAB */}
                <TabsContent value="raw" className="space-y-4 mt-0 min-h-0 focus-visible:outline-none">
                  <div className="rounded-xl border border-border/80 overflow-hidden shadow-2xs bg-card">
                    <div className="px-3.5 py-2 bg-muted/40 border-b flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <Terminal className="size-3.5 text-primary" /> Complete Forensic Audit JSON Record
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(log, null, 2), "Full Audit Record")}
                        className="h-6 text-xs gap-1"
                      >
                        <Copy className="size-3" /> Copy JSON
                      </Button>
                    </div>
                    <pre className="p-3.5 bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-auto max-h-[460px] leading-relaxed">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
