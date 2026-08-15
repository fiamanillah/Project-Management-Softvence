"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Trash2,
  Globe2,
  Building2,
  Users2,
  FolderGit2,
} from "lucide-react";
import {
  DataTableColumnHeader,
  type DataTableFeatures,
} from "@/components/data-table";
import type { OverrideItem } from "../types";

const columnHelper = createColumnHelper<DataTableFeatures, OverrideItem>();

export function getOverrideColumns(onPromptRevoke: (override: OverrideItem) => void) {
  return columnHelper.columns([
    // User Column
    columnHelper.accessor(
      (row) =>
        `${row.user?.firstName || ""} ${row.user?.lastName || ""} ${row.user?.email || ""}`.trim(),
      {
        id: "user",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Target User" />
        ),
        cell: ({ row }) => {
          const ov = row.original;
          const fullName =
            ov.user?.firstName || ov.user?.lastName
              ? `${ov.user.firstName || ""} ${ov.user.lastName || ""}`.trim()
              : ov.user?.email || "Unknown User";
          const initials = (
            (ov.user?.firstName?.[0] || "") + (ov.user?.lastName?.[0] || "") ||
            ov.user?.email?.[0] ||
            "U"
          ).toUpperCase();

          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8 text-xs font-semibold">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm truncate">{fullName}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {ov.user?.email}
                </span>
              </div>
            </div>
          );
        },
      }
    ),

    // Permission Code & Module
    columnHelper.accessor((row) => `${row.permission?.code} ${row.permission?.module}`, {
      id: "permission",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Permission / Module" />
      ),
      cell: ({ row }) => {
        const ov = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-semibold text-foreground">
              {ov.permission?.code || "custom.permission"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                {ov.permission?.module || "General"}
              </span>
              {ov.permission?.description && (
                <span className="text-[11px] text-muted-foreground/70 truncate max-w-[200px]">
                  &bull; {ov.permission.description}
                </span>
              )}
            </div>
          </div>
        );
      },
    }),

    // Override Type (Grant vs Deny)
    columnHelper.accessor("isDeny", {
      id: "overrideType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Override Policy" />
      ),
      cell: ({ row }) => {
        const ov = row.original;
        return ov.isDeny ? (
          <Badge
            variant="outline"
            className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 font-medium"
          >
            <ShieldAlert className="size-3" /> Explicit DENY
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-medium"
          >
            <ShieldCheck className="size-3" /> Hand-GRANT
          </Badge>
        );
      },
    }),

    // Scope Anchor (Global vs Scoped)
    columnHelper.accessor(
      (row) => {
        if (row.department) return `Dept: ${row.department.name}`;
        if (row.team) return `Team: ${row.team.name}`;
        if (row.project) return `Project: ${row.project.name}`;
        return "Global";
      },
      {
        id: "scopeContext",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Scope Scope" />
        ),
        cell: ({ row }) => {
          const ov = row.original;
          if (ov.department) {
            return (
              <Badge variant="outline" className="gap-1 text-xs font-normal">
                <Building2 className="size-3 text-muted-foreground" />
                <span>{ov.department.name}</span>
              </Badge>
            );
          }
          if (ov.team) {
            return (
              <Badge variant="outline" className="gap-1 text-xs font-normal">
                <Users2 className="size-3 text-muted-foreground" />
                <span>{ov.team.name}</span>
              </Badge>
            );
          }
          if (ov.project) {
            return (
              <Badge variant="outline" className="gap-1 text-xs font-normal">
                <FolderGit2 className="size-3 text-muted-foreground" />
                <span>{ov.project.name}</span>
              </Badge>
            );
          }
          return (
            <Badge variant="secondary" className="gap-1 text-xs font-normal bg-muted/60">
              <Globe2 className="size-3 text-muted-foreground" />
              <span>Global (All Scopes)</span>
            </Badge>
          );
        },
      }
    ),

    // Expiration & Reason
    columnHelper.accessor("expiresAt", {
      id: "expiration",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Validity & Reason" />
      ),
      cell: ({ row }) => {
        const ov = row.original;
        const isExpired = ov.expiresAt && new Date(ov.expiresAt).getTime() < Date.now();

        return (
          <div className="flex flex-col text-xs gap-0.5">
            <span
              className={`flex items-center gap-1 font-medium ${
                isExpired
                  ? "text-rose-500 line-through"
                  : ov.expiresAt
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Clock className="size-3 text-muted-foreground" />
              {ov.expiresAt
                ? `${new Date(ov.expiresAt).toLocaleDateString()} (${
                    isExpired ? "Expired" : "Active"
                  })`
                : "Permanent"}
            </span>
            {ov.reason && (
              <span className="text-[11px] text-muted-foreground italic truncate max-w-[220px]">
                &ldquo;{ov.reason}&rdquo;
              </span>
            )}
          </div>
        );
      },
    }),

    // Action (Revoke)
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-right">Action</div>,
      cell: ({ row }) => {
        const ov = row.original;
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 h-8 px-2"
              onClick={() => onPromptRevoke(ov)}
            >
              <Trash2 className="size-3.5 mr-1" /> Revoke
            </Button>
          </div>
        );
      },
    }),
  ]);
}
