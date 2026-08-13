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
import { Lock, ShieldCheck, Layers, Building } from "lucide-react";

export interface DesignationItem {
  id: string;
  code: string;
  name: string;
  hierarchyLevel: number;
  isLeadership: boolean;
  department?: {
    id: string;
    code: string;
    name: string;
  };
  _count?: {
    permissions?: number;
    users?: number;
  };
}

interface DesignationTableProps {
  designations: DesignationItem[];
  onOpenMatrix: (designation: DesignationItem) => void;
}

export function DesignationTable({ designations, onOpenMatrix }: DesignationTableProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Designation Code & Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Level / Leadership</TableHead>
            <TableHead>Assigned Grants</TableHead>
            <TableHead className="text-right">Permission Matrix</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {designations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm">
                No designations found.
              </TableCell>
            </TableRow>
          ) : (
            designations.map((desig) => (
              <TableRow key={desig.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{desig.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{desig.code}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building className="size-3.5" />
                    <span>{desig.department?.name || "System"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Level {desig.hierarchyLevel}
                    </Badge>
                    {desig.isLeadership && (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                        Leadership
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-semibold text-primary">
                    {desig._count?.permissions || 0} Permissions Granted
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onOpenMatrix(desig)}>
                    <Lock className="size-3.5" /> Manage Matrix
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
