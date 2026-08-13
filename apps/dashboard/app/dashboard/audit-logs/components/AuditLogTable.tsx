"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  Eye,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Globe,
  User,
  Database,
  ArrowRight,
} from "lucide-react";

export interface AuditLogItem {
  _id: string;
  auditId?: string;
  module: string;
  action: string;
  entityTable?: string;
  entityId?: string;
  actor?: {
    id?: string;
    email?: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  ipAddress?: string;
  userAgent?: string;
  httpContext?: {
    method?: string;
    path?: string;
    statusCode?: number;
    durationMs?: number;
    requestId?: string;
    query?: Record<string, any>;
    params?: Record<string, any>;
    requestBody?: Record<string, any>;
  };
  changes?: {
    before?: any;
    after?: any;
    diff?: any;
  };
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
  metadata?: any;
  createdAt: string;
}

interface AuditLogTableProps {
  logs: AuditLogItem[];
  onViewDetails: (log: AuditLogItem) => void;
  isLoading?: boolean;
}

export function AuditLogTable({ logs, onViewDetails, isLoading }: AuditLogTableProps) {
  const getModuleBadge = (module: string) => {
    switch (module) {
      case "Auth":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "Authorization":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "Admin":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "Projects":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "BdOrders":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      case "Billing":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  const getMethodBadge = (method?: string) => {
    switch (method?.toUpperCase()) {
      case "GET":
        return "bg-blue-500/15 text-blue-600 border-blue-500/30";
      case "POST":
        return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
      case "PUT":
      case "PATCH":
        return "bg-amber-500/15 text-amber-600 border-amber-500/30";
      case "DELETE":
        return "bg-rose-500/15 text-rose-600 border-rose-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getInitials = (email?: string) => {
    if (!email) return "SYS";
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[170px]">Timestamp</TableHead>
            <TableHead>Module / Action</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Target Entity</TableHead>
            <TableHead>Context / IP</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={7} className="h-12">
                  <div className="h-5 w-full bg-muted/60 rounded animate-pulse" />
                </TableCell>
              </TableRow>
            ))
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                  <Database className="size-8 text-muted-foreground/60" />
                  <p className="font-medium text-foreground">No security audit logs found</p>
                  <p className="text-xs">Try adjusting your search terms or filter parameters.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => {
              const actorEmail = log.actor?.email || "System";
              const ip = log.actor?.ipAddress || log.ipAddress || "127.0.0.1";

              return (
                <TableRow key={log._id} className="hover:bg-muted/30 transition-colors">
                  {/* Timestamp */}
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-mono font-medium text-foreground text-[11px]">
                        {new Date(log.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                        <Clock className="size-3 text-muted-foreground/70" />
                        {new Date(log.createdAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                  </TableCell>

                  {/* Module / Action */}
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-mono font-bold text-xs text-foreground tracking-tight">
                        {log.action}
                      </span>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-medium ${getModuleBadge(log.module)}`}>
                        {log.module}
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Actor */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7 border border-border">
                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                          {getInitials(actorEmail)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col max-w-[150px] sm:max-w-[200px]">
                        <span className="text-xs font-semibold text-foreground truncate" title={actorEmail}>
                          {actorEmail}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {log.actor?.role || "Staff"}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Target Entity */}
                  <TableCell>
                    {log.entityTable ? (
                      <div className="flex flex-col text-xs font-mono gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground text-[11px]">
                            {log.entityTable}
                          </span>
                          {log.changes?.diff && Object.keys(log.changes.diff).length > 0 && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary">
                              +{Object.keys(log.changes.diff).length} diff
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={log.entityId}>
                          {log.entityId}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Context / IP */}
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        {log.httpContext?.method && (
                          <Badge variant="outline" className={`text-[9px] font-mono px-1 py-0 ${getMethodBadge(log.httpContext.method)}`}>
                            {log.httpContext.method}
                          </Badge>
                        )}
                        <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                          <Globe className="size-3 text-muted-foreground/70" /> {ip}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {log.status === "SUCCESS" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] font-semibold py-0.5">
                        <CheckCircle2 className="size-3" /> SUCCESS
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 text-[10px] font-semibold py-0.5">
                        <ShieldAlert className="size-3" /> FAILED
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(log)}
                      className="h-8 px-2 text-xs font-medium hover:bg-primary/10 hover:text-primary"
                    >
                      <Eye className="size-3.5 mr-1" /> Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
