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
import { Trash2, ShieldAlert, ShieldCheck, Clock } from "lucide-react";

export interface OverrideItem {
  id: string;
  isDeny: boolean;
  reason?: string;
  expiresAt?: string;
  createdAt: string;
  user: { id: string; email: string; firstName?: string; lastName?: string };
  permission: { id: string; code: string; module: string; description: string };
  granter: { id: string; email: string; firstName?: string; lastName?: string };
}

interface OverrideTableProps {
  overrides: OverrideItem[];
  onRevoke: (id: string) => void;
}

export function OverrideTable({ overrides, onRevoke }: OverrideTableProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Permission / Module</TableHead>
            <TableHead>Override Type</TableHead>
            <TableHead>Expiration / Reason</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overrides.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm">
                No user permission overrides configured.
              </TableCell>
            </TableRow>
          ) : (
            overrides.map((ov) => (
              <TableRow key={ov.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">
                      {ov.user.firstName || ov.user.lastName ? `${ov.user.firstName || ""} ${ov.user.lastName || ""}` : ov.user.email}
                    </span>
                    <span className="text-xs text-muted-foreground">{ov.user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-semibold">{ov.permission.code}</span>
                    <span className="text-[11px] text-muted-foreground">{ov.permission.module}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {ov.isDeny ? (
                    <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1">
                      <ShieldAlert className="size-3" /> Explicit DENY
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                      <ShieldCheck className="size-3" /> Hand-GRANT
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> {ov.expiresAt ? new Date(ov.expiresAt).toLocaleDateString() : "Permanent"}
                    </span>
                    {ov.reason && <span className="italic truncate max-w-xs">{ov.reason}</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => onRevoke(ov.id)}>
                    <Trash2 className="size-4 mr-1" /> Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
