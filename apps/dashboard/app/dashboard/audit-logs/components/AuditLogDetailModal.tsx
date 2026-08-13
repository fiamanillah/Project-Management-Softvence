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
} from "lucide-react";
import { toast } from "sonner";
import type { AuditLogItem } from "./AuditLogTable";

interface AuditLogDetailModalProps {
  log: AuditLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDetailModal({ log, open, onOpenChange }: AuditLogDetailModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!log) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    toast.success("Audit log JSON copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const actorEmail = log.actor?.email || "System";
  const actorIp = log.actor?.ipAddress || log.ipAddress || "127.0.0.1";
  const userAgent = log.actor?.userAgent || log.userAgent || "N/A";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden border border-border shadow-2xl">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {log.status === "SUCCESS" ? (
                <ShieldCheck className="size-5 text-emerald-500" />
              ) : (
                <ShieldAlert className="size-5 text-rose-500" />
              )}
              Forensic Security Audit Record
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleCopyJson} className="h-8 text-xs gap-1.5">
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy JSON"}
            </Button>
          </div>
          <DialogDescription className="text-xs">
            Captured action <span className="font-mono font-bold text-foreground">{log.action}</span> in module{" "}
            <span className="font-semibold text-foreground">{log.module}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col pt-2 overflow-hidden">
          <TabsList className="grid grid-cols-4 h-9 bg-muted/60 p-1 text-xs">
            <TabsTrigger value="overview" className="text-xs font-medium">Overview</TabsTrigger>
            <TabsTrigger value="actor" className="text-xs font-medium">Actor & Network</TabsTrigger>
            <TabsTrigger value="changes" className="text-xs font-medium">
              State Changes
              {log.changes?.diff && Object.keys(log.changes.diff).length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                  {Object.keys(log.changes.diff).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-xs font-medium">Raw Metadata</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-3 mt-3">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 text-xs mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event Header Status Card */}
                <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
                  <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5 text-sm">
                    <Clock className="size-4 text-primary" /> Event Overview
                  </h4>

                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Execution Status</span>
                      {log.status === "SUCCESS" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold">
                          SUCCESS
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold">
                          FAILED / DENIED
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Audit Event ID</span>
                      <span className="font-mono text-[11px] text-foreground font-semibold">
                        {log.auditId || log._id}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Module</span>
                      <Badge variant="outline" className="font-mono">{log.module}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Action Code</span>
                      <span className="font-mono font-bold text-foreground">{log.action}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Timestamp</span>
                      <span className="font-mono text-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Entity & Failure Details */}
                <div className="space-y-4">
                  {log.entityTable && (
                    <div className="rounded-xl border bg-card p-4 space-y-2.5 shadow-2xs">
                      <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5 text-sm">
                        <FileCode2 className="size-4 text-primary" /> Target Entity Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-muted-foreground pt-1">
                        <div>
                          <span className="block text-[10px] text-muted-foreground">Entity Table</span>
                          <span className="font-mono text-foreground font-bold">{log.entityTable}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-muted-foreground">Entity Identifier</span>
                          <span className="font-mono text-foreground font-medium">{log.entityId || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {log.errorMessage && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 font-mono text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <ShieldAlert className="size-4" /> Error Description:
                      </p>
                      <p className="leading-relaxed text-[11px]">{log.errorMessage}</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Actor & Network Tab */}
            <TabsContent value="actor" className="space-y-4 text-xs mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Actor Details Card */}
                <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
                  <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5 text-sm">
                    <User className="size-4 text-primary" /> Actor Metadata
                  </h4>

                  <div className="space-y-2.5 text-muted-foreground pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]">Actor Email</span>
                      <span className="font-medium text-foreground">{actorEmail}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]">System Role</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {log.actor?.role || "Staff"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]">Actor Identifier</span>
                      <span className="font-mono text-foreground">{log.actor?.id || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Network Context Card */}
                <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
                  <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5 text-sm">
                    <Globe className="size-4 text-primary" /> Network & Client Context
                  </h4>

                  <div className="space-y-2.5 text-muted-foreground pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]">Client IP Address</span>
                      <span className="font-mono text-foreground font-semibold">{actorIp}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground mb-1">User-Agent Header</span>
                      <span className="font-mono text-[11px] text-foreground block p-2 rounded bg-muted/50 break-all">
                        {userAgent}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HTTP Request Context */}
              {log.httpContext && (
                <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
                  <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5 text-sm">
                    <Network className="size-4 text-primary" /> HTTP Request & Payload Context
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-muted-foreground pt-1">
                    <div>
                      <span className="block text-[10px] text-muted-foreground">HTTP Method</span>
                      <span className="font-mono text-foreground font-bold">{log.httpContext.method || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground">Status Code</span>
                      <span className="font-mono text-foreground font-bold">{log.httpContext.statusCode || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground">Execution Duration</span>
                      <span className="font-mono text-foreground">{log.httpContext.durationMs !== undefined ? `${log.httpContext.durationMs} ms` : "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground">Request ID</span>
                      <span className="font-mono text-foreground text-[10px] truncate block">{log.httpContext.requestId || "N/A"}</span>
                    </div>
                    <div className="col-span-2 md:col-span-4">
                      <span className="block text-[10px] text-muted-foreground">Request Path</span>
                      <span className="font-mono text-foreground font-medium bg-muted/40 p-2 rounded block">{log.httpContext.path || "N/A"}</span>
                    </div>

                    {/* Query Parameters */}
                    {log.httpContext.query && Object.keys(log.httpContext.query).length > 0 && (
                      <div className="col-span-2 md:col-span-4 space-y-1">
                        <span className="block text-[10px] text-muted-foreground">URL Query Parameters</span>
                        <pre className="p-2.5 rounded bg-zinc-950 text-sky-300 font-mono text-[11px] overflow-x-auto">
                          {JSON.stringify(log.httpContext.query, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Route Parameters */}
                    {log.httpContext.params && Object.keys(log.httpContext.params).length > 0 && (
                      <div className="col-span-2 md:col-span-4 space-y-1">
                        <span className="block text-[10px] text-muted-foreground">Route Parameters</span>
                        <pre className="p-2.5 rounded bg-zinc-950 text-amber-300 font-mono text-[11px] overflow-x-auto">
                          {JSON.stringify(log.httpContext.params, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Request Body Payload */}
                    {log.httpContext.requestBody && Object.keys(log.httpContext.requestBody).length > 0 && (
                      <div className="col-span-2 md:col-span-4 space-y-1">
                        <span className="block text-[10px] text-muted-foreground">Submitted Request Payload (Body)</span>
                        <pre className="p-2.5 rounded bg-zinc-950 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-48">
                          {JSON.stringify(log.httpContext.requestBody, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* State Changes Tab */}
            <TabsContent value="changes" className="space-y-4 text-xs mt-0">
              {log.changes?.diff || log.changes?.before || log.changes?.after ? (
                <div className="space-y-4">
                  {/* Visual Diff Table Card */}
                  {log.changes?.diff && Object.keys(log.changes.diff).length > 0 && (
                    <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5 text-sm">
                          <ArrowRightLeft className="size-4 text-primary" /> Visual Field Diff Comparison
                        </h4>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {Object.keys(log.changes.diff).length} fields changed
                        </Badge>
                      </div>

                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-muted/60 border-b font-semibold text-muted-foreground">
                            <tr>
                              <th className="p-3 w-1/4">Property / Field</th>
                              <th className="p-3 w-3/8">Previous State (Before)</th>
                              <th className="p-3 w-3/8">New State (After)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-mono">
                            {Object.entries(log.changes.diff).map(([key, change]: [string, any]) => {
                              const beforeVal = change?.before !== undefined ? change.before : change?.old;
                              const afterVal = change?.after !== undefined ? change.after : change?.new;

                              return (
                                <tr key={key} className="hover:bg-muted/20">
                                  <td className="p-3 font-bold text-foreground bg-muted/10">{key}</td>
                                  <td className="p-3 bg-rose-500/5 text-rose-600 dark:text-rose-400 break-all">
                                    {beforeVal === undefined || beforeVal === null ? (
                                      <span className="italic text-muted-foreground">undefined</span>
                                    ) : typeof beforeVal === "object" ? (
                                      JSON.stringify(beforeVal, null, 1)
                                    ) : (
                                      String(beforeVal)
                                    )}
                                  </td>
                                  <td className="p-3 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 break-all">
                                    {afterVal === undefined || afterVal === null ? (
                                      <span className="italic text-muted-foreground">undefined</span>
                                    ) : typeof afterVal === "object" ? (
                                      JSON.stringify(afterVal, null, 1)
                                    ) : (
                                      String(afterVal)
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Side by Side Raw Payloads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {log.changes?.before && (
                      <div className="rounded-xl border bg-card p-4 space-y-2 shadow-2xs">
                        <h4 className="font-bold tracking-tight text-rose-500 flex items-center gap-1.5 text-sm">
                          Previous State Payload (Before)
                        </h4>
                        <pre className="p-3 rounded-lg bg-zinc-950 text-rose-300 font-mono text-[11px] overflow-x-auto max-h-72">
                          {JSON.stringify(log.changes.before, null, 2)}
                        </pre>
                      </div>
                    )}

                    {log.changes?.after && (
                      <div className="rounded-xl border bg-card p-4 space-y-2 shadow-2xs">
                        <h4 className="font-bold tracking-tight text-emerald-500 flex items-center gap-1.5 text-sm">
                          New State Payload (After)
                        </h4>
                        <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-72">
                          {JSON.stringify(log.changes.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border rounded-xl bg-card text-muted-foreground space-y-2">
                  <ArrowRightLeft className="size-8 mx-auto text-muted-foreground/50" />
                  <p className="font-medium text-foreground">No state change payload recorded</p>
                  <p className="text-xs text-muted-foreground">This event did not alter any system entity properties.</p>
                </div>
              )}
            </TabsContent>

            {/* Raw Metadata Tab */}
            <TabsContent value="raw" className="space-y-4 text-xs mt-0">
              <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5 text-sm">
                    <Terminal className="size-4 text-primary" /> Full Audit Record JSON
                  </h4>
                  <Button variant="ghost" size="sm" onClick={handleCopyJson} className="h-7 text-xs">
                    <Copy className="size-3 mr-1" /> Copy JSON
                  </Button>
                </div>
                <pre className="p-3.5 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto max-h-[420px]">
                  {JSON.stringify(log, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
