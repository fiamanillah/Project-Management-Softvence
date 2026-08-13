"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
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

interface AuditLogDetailSheetProps {
  log: AuditLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDetailSheet({ log, open, onOpenChange }: AuditLogDetailSheetProps) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl flex flex-col p-6 overflow-hidden">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg font-bold">
              {log.status === "SUCCESS" ? (
                <ShieldCheck className="size-5 text-emerald-500" />
              ) : (
                <ShieldAlert className="size-5 text-rose-500" />
              )}
              Forensic Audit Record
            </SheetTitle>
            <Button variant="outline" size="sm" onClick={handleCopyJson} className="h-8 text-xs gap-1.5">
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy JSON"}
            </Button>
          </div>
          <SheetDescription className="text-xs">
            Captured action <span className="font-mono font-bold text-foreground">{log.action}</span> in module{" "}
            <span className="font-semibold text-foreground">{log.module}</span>.
          </SheetDescription>
        </SheetHeader>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col pt-3 overflow-hidden">
          <TabsList className="grid grid-cols-4 h-9 bg-muted/60 p-1 text-xs">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="actor" className="text-xs">Actor & Network</TabsTrigger>
            <TabsTrigger value="changes" className="text-xs">State Changes</TabsTrigger>
            <TabsTrigger value="raw" className="text-xs">Raw Metadata</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-3 mt-3">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 text-xs mt-0">
              {/* Event Header Status Card */}
              <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
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
                  <span className="font-mono text-foreground flex items-center gap-1">
                    <Clock className="size-3 text-muted-foreground" />
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>

                {log.errorMessage && (
                  <div className="mt-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 font-mono text-[11px] space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-xs">
                      <ShieldAlert className="size-4" /> Error Description:
                    </p>
                    <p className="leading-relaxed">{log.errorMessage}</p>
                  </div>
                )}
              </div>

              {/* Target Entity Card */}
              {log.entityTable && (
                <div className="rounded-xl border bg-card p-4 space-y-2.5 shadow-2xs">
                  <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5">
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
            </TabsContent>

            {/* Actor & Network Tab */}
            <TabsContent value="actor" className="space-y-4 text-xs mt-0">
              {/* Actor Details Card */}
              <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
                <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  <User className="size-4 text-primary" /> Actor Metadata
                </h4>

                <div className="grid grid-cols-2 gap-3 text-muted-foreground">
                  <div>
                    <span className="block text-[10px] text-muted-foreground">Actor Email</span>
                    <span className="font-medium text-foreground">{actorEmail}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground">System Role</span>
                    <Badge variant="outline" className="font-mono text-[10px] mt-0.5">
                      {log.actor?.role || "Staff"}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] text-muted-foreground">Actor ID</span>
                    <span className="font-mono text-foreground">{log.actor?.id || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Network Context Card */}
              <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
                <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  <Globe className="size-4 text-primary" /> Network & Client Context
                </h4>

                <div className="space-y-3 text-muted-foreground">
                  <div>
                    <span className="block text-[10px] text-muted-foreground">Client IP Address</span>
                    <span className="font-mono text-foreground font-semibold">{actorIp}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground">User-Agent Header</span>
                    <span className="font-mono text-[11px] text-foreground block p-2 rounded bg-muted/50 break-all">
                      {userAgent}
                    </span>
                  </div>
                </div>
              </div>

              {/* HTTP Request Context */}
              {log.httpContext && (
                <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
                  <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5">
                    <Network className="size-4 text-primary" /> HTTP Request Context
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-muted-foreground">
                    <div>
                      <span className="block text-[10px] text-muted-foreground">HTTP Method</span>
                      <span className="font-mono text-foreground font-bold">{log.httpContext.method || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground">Status Code</span>
                      <span className="font-mono text-foreground font-bold">{log.httpContext.statusCode || "N/A"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[10px] text-muted-foreground">Request Path</span>
                      <span className="font-mono text-foreground font-medium">{log.httpContext.path || "N/A"}</span>
                    </div>
                    {log.httpContext.durationMs !== undefined && (
                      <div>
                        <span className="block text-[10px] text-muted-foreground">Execution Duration</span>
                        <span className="font-mono text-foreground">{log.httpContext.durationMs} ms</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* State Changes Tab */}
            <TabsContent value="changes" className="space-y-4 text-xs mt-0">
              {log.changes?.diff ? (
                <div className="rounded-xl border bg-card p-4 space-y-2 shadow-2xs">
                  <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5">
                    <ArrowRightLeft className="size-4 text-primary" /> Computed Diff
                  </h4>
                  <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(log.changes.diff, null, 2)}
                  </pre>
                </div>
              ) : null}

              {log.changes?.before || log.changes?.after ? (
                <div className="grid grid-cols-1 gap-4">
                  {log.changes?.before && (
                    <div className="rounded-xl border bg-card p-4 space-y-2 shadow-2xs">
                      <h4 className="font-bold tracking-tight text-rose-500 flex items-center gap-1.5">
                        Before State Payload
                      </h4>
                      <pre className="p-3 rounded-lg bg-zinc-950 text-rose-300 font-mono text-[11px] overflow-x-auto">
                        {JSON.stringify(log.changes.before, null, 2)}
                      </pre>
                    </div>
                  )}

                  {log.changes?.after && (
                    <div className="rounded-xl border bg-card p-4 space-y-2 shadow-2xs">
                      <h4 className="font-bold tracking-tight text-emerald-500 flex items-center gap-1.5">
                        After State Payload
                      </h4>
                      <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                        {JSON.stringify(log.changes.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center border rounded-xl bg-card text-muted-foreground">
                  <p>No state change payload recorded for this audit event.</p>
                </div>
              )}
            </TabsContent>

            {/* Raw Metadata Tab */}
            <TabsContent value="raw" className="space-y-4 text-xs mt-0">
              <div className="rounded-xl border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold tracking-tight text-foreground flex items-center gap-1.5">
                    <Terminal className="size-4 text-primary" /> Full Audit Record JSON
                  </h4>
                  <Button variant="ghost" size="sm" onClick={handleCopyJson} className="h-7 text-xs">
                    <Copy className="size-3 mr-1" /> Copy
                  </Button>
                </div>
                <pre className="p-3.5 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto max-h-[400px]">
                  {JSON.stringify(log, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
