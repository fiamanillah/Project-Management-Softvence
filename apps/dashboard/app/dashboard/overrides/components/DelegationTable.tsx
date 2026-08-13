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
import { Trash2, UserCheck, Calendar } from "lucide-react";

export interface DelegationItem {
  id: string;
  scope: string;
  validFrom: string;
  validUntil: string;
  delegator: { id: string; email: string; firstName?: string; lastName?: string };
  delegatee: { id: string; email: string; firstName?: string; lastName?: string };
}

interface DelegationTableProps {
  delegations: DelegationItem[];
  onRevoke: (id: string) => void;
}

export function DelegationTable({ delegations, onRevoke }: DelegationTableProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Delegator (Inherited From)</TableHead>
            <TableHead>Delegatee (Recipient)</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Validity Window</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {delegations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm">
                No active delegations configured.
              </TableCell>
            </TableRow>
          ) : (
            delegations.map((del) => (
              <TableRow key={del.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">
                      {del.delegator.firstName || del.delegator.lastName ? `${del.delegator.firstName || ""} ${del.delegator.lastName || ""}` : del.delegator.email}
                    </span>
                    <span className="text-xs text-muted-foreground">{del.delegator.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">
                      {del.delegatee.firstName || del.delegatee.lastName ? `${del.delegatee.firstName || ""} ${del.delegatee.lastName || ""}` : del.delegatee.email}
                    </span>
                    <span className="text-xs text-muted-foreground">{del.delegatee.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {del.scope}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" /> {new Date(del.validFrom).toLocaleDateString()} → {new Date(del.validUntil).toLocaleDateString()}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => onRevoke(del.id)}>
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
