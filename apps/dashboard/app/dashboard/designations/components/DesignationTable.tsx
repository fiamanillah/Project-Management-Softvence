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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  ShieldCheck,
  Building,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

export interface DesignationCapabilities {
  canEdit?: boolean;
  canDelete?: boolean;
  canManageMatrix?: boolean;
}

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
  _capabilities?: DesignationCapabilities;
}

interface DesignationTableProps {
  designations: DesignationItem[];
  onEdit: (designation: DesignationItem, initialTab?: "details" | "permissions") => void;
  onDelete?: (designation: DesignationItem) => void;
}

export function DesignationTable({
  designations,
  onEdit,
  onDelete,
}: DesignationTableProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>Designation Code & Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Level / Leadership</TableHead>
            <TableHead>Assigned Grants & Users</TableHead>
            <TableHead className="text-right w-[90px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {designations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-28 text-center text-muted-foreground text-sm">
                No designations found.
              </TableCell>
            </TableRow>
          ) : (
            designations.map((desig) => {
              const caps = desig._capabilities || { canEdit: true, canDelete: true, canManageMatrix: true };
              const hasAnyAction = caps.canEdit || caps.canManageMatrix || caps.canDelete;

              return (
                <TableRow key={desig.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground">{desig.name}</span>
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
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold">
                          Leadership
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-primary">
                        {desig._count?.permissions || 0} Permissions Granted
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users className="size-3" />
                        {desig._count?.users || 0} Active User{(desig._count?.users ?? 0) === 1 ? "" : "s"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {hasAnyAction ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          type="button"
                          className="inline-flex items-center justify-center size-8 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors cursor-pointer outline-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Manage Designation</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {caps.canEdit && (
                            <DropdownMenuItem onClick={() => onEdit(desig, "details")} className="cursor-pointer">
                              <Pencil className="mr-2 size-4 text-muted-foreground" />
                              Edit Designation
                            </DropdownMenuItem>
                          )}
                          {caps.canManageMatrix && (
                            <DropdownMenuItem onClick={() => onEdit(desig, "permissions")} className="cursor-pointer">
                              <ShieldCheck className="mr-2 size-4 text-muted-foreground" />
                              Permission Matrix
                            </DropdownMenuItem>
                          )}
                          {caps.canDelete && onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={() => onDelete(desig)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete Designation
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
