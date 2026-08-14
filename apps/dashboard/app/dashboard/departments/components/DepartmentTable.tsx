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
  Building2,
  MoreHorizontal,
  Pencil,
  UserCheck,
  UserX,
  Trash2,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { DepartmentItem } from "@workspace/shared";

interface DepartmentCapabilities {
  canEdit?: boolean;
  canDelete?: boolean;
  canAssignManager?: boolean;
}

export type DepartmentWithCapabilities = DepartmentItem & {
  _capabilities?: DepartmentCapabilities;
};

interface DepartmentTableProps {
  departments: DepartmentWithCapabilities[];
  onEdit: (department: DepartmentWithCapabilities) => void;
  onAssignManager: (department: DepartmentWithCapabilities) => void;
  onDelete: (department: DepartmentWithCapabilities) => void;
}

export function DepartmentTable({
  departments,
  onEdit,
  onAssignManager,
  onDelete,
}: DepartmentTableProps) {
  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border bg-card/50">
        <Building2 className="size-12 text-muted-foreground/50 mb-3" />
        <h3 className="text-base font-semibold text-foreground">No Departments Found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          No departments exist matching your query. Click "Add Department" to create your first department.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[120px]">Code</TableHead>
            <TableHead>Department Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Active Manager(s)</TableHead>
            <TableHead className="text-center">Designations</TableHead>
            <TableHead className="text-center">Teams</TableHead>
            <TableHead className="text-right w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((dept) => {
            const activeManagers = dept.managers?.filter((m) => !m.unassignedAt) || [];
            const caps = dept._capabilities || { canEdit: true, canDelete: true, canAssignManager: true };
            const hasAnyAction = caps.canEdit || caps.canAssignManager || caps.canDelete;

            return (
              <TableRow key={dept.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="font-mono text-xs font-semibold text-primary">
                  {dept.code}
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{dept.name}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      ID: {dept.id.substring(0, 8)}...
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  {dept.isActive ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 flex items-center gap-1 w-fit">
                      <CheckCircle2 className="size-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground flex items-center gap-1 w-fit">
                      <XCircle className="size-3" /> Inactive
                    </Badge>
                  )}
                </TableCell>

                <TableCell>
                  {activeManagers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {activeManagers.map((mgr) => {
                        const fullName =
                          `${mgr.user?.firstName || ""} ${mgr.user?.lastName || ""}`.trim() ||
                          mgr.user?.email ||
                          "Manager";
                        return (
                          <Badge
                            key={mgr.id}
                            variant="secondary"
                            className="text-xs font-normal flex items-center gap-1 py-0.5 px-2 bg-secondary/60"
                          >
                            <UserCheck className="size-3 text-primary" />
                            {fullName}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                      <UserX className="size-3" /> No Manager Assigned
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-center font-mono text-xs">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                    <Shield className="size-3 text-primary" />
                    {dept._count?.designations ?? 0}
                  </div>
                </TableCell>

                <TableCell className="text-center font-mono text-xs">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                    <Users className="size-3 text-primary" />
                    {dept._count?.teams ?? 0}
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
                        <DropdownMenuLabel>Manage Department</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {caps.canEdit && (
                          <DropdownMenuItem onClick={() => onEdit(dept)}>
                            <Pencil className="mr-2 size-4 text-muted-foreground" />
                            Edit Details
                          </DropdownMenuItem>
                        )}
                        {caps.canAssignManager && (
                          <DropdownMenuItem onClick={() => onAssignManager(dept)}>
                            <UserCheck className="mr-2 size-4 text-muted-foreground" />
                            Assign / Edit Manager
                          </DropdownMenuItem>
                        )}
                        {caps.canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDelete(dept)}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete Department
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
          })}
        </TableBody>
      </Table>
    </div>
  );
}
