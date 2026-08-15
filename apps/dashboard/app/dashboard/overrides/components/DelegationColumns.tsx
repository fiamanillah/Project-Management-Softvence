"use client";

import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  ArrowRight,
  Calendar,
  Trash2,
  Lock,
  UserCheck,
} from "lucide-react";
import {
  DataTableColumnHeader,
  type DataTableFeatures,
} from "@/components/data-table";
import type { DelegationItem } from "../types";
import { DelegationStatusBadge, getDelegationStatus } from "./DelegationStatusBadge";

const columnHelper = createColumnHelper<DataTableFeatures, DelegationItem>();

export function getDelegationColumns(onPromptRevoke: (delegation: DelegationItem) => void) {
  return columnHelper.columns([
    // Delegator -> Delegatee Flow Column
    columnHelper.accessor(
      (row) =>
        `${row.delegator?.firstName || ""} ${row.delegator?.lastName || ""} ${
          row.delegator?.email || ""
        } ${row.delegatee?.firstName || ""} ${row.delegatee?.lastName || ""} ${
          row.delegatee?.email || ""
        }`,
      {
        id: "delegator",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Delegator ➔ Delegatee (On Behalf Of)"
          />
        ),
        cell: ({ row }) => {
          const del = row.original;
          const delegatorName =
            del.delegator?.firstName || del.delegator?.lastName
              ? `${del.delegator?.firstName || ""} ${del.delegator?.lastName || ""}`.trim()
              : del.delegator?.email || "Unknown Delegator";

          const delegateeName =
            del.delegatee?.firstName || del.delegatee?.lastName
              ? `${del.delegatee?.firstName || ""} ${del.delegatee?.lastName || ""}`.trim()
              : del.delegatee?.email || "Unknown Delegatee";

          const delegatorInitials = (
            (del.delegator?.firstName?.[0] || "") +
              (del.delegator?.lastName?.[0] || "") ||
            del.delegator?.email?.[0] ||
            "D"
          ).toUpperCase();

          const delegateeInitials = (
            (del.delegatee?.firstName?.[0] || "") +
              (del.delegatee?.lastName?.[0] || "") ||
            del.delegatee?.email?.[0] ||
            "R"
          ).toUpperCase();

          return (
            <div className="flex items-center gap-2.5 py-0.5">
              {/* Delegator (Original Owner) */}
              <div className="flex items-center gap-2 min-w-[150px]">
                <Avatar className="size-7 text-[11px] font-semibold">
                  <AvatarFallback className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {delegatorInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-xs truncate">{delegatorName}</span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {del.delegator?.email}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center size-6 rounded-full bg-muted/60 text-muted-foreground shrink-0">
                <ArrowRight className="size-3.5" />
              </div>

              {/* Delegatee (Recipient) */}
              <div className="flex items-center gap-2 min-w-[150px]">
                <Avatar className="size-7 text-[11px] font-semibold">
                  <AvatarFallback className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {delegateeInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-xs truncate">{delegateeName}</span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {del.delegatee?.email}
                  </span>
                </div>
              </div>
            </div>
          );
        },
      }
    ),

    // Status Column
    columnHelper.accessor(
      (row) => getDelegationStatus(row.validFrom, row.validUntil),
      {
        id: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const del = row.original;
          return (
            <DelegationStatusBadge
              validFrom={del.validFrom}
              validUntil={del.validUntil}
            />
          );
        },
      }
    ),

    // Scope Column
    columnHelper.accessor("scope", {
      id: "scope",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Delegated Scope" />
      ),
      cell: ({ row }) => {
        const scope = row.original.scope || "*";
        return (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="font-mono text-xs bg-muted/30 border-border gap-1 font-medium"
            >
              <Lock className="size-2.5 text-muted-foreground" />
              {scope === "*" ? "* (Full Authority)" : scope}
            </Badge>
          </div>
        );
      },
    }),

    // Validity Window Column
    columnHelper.accessor("validFrom", {
      id: "validity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Validity Window" />
      ),
      cell: ({ row }) => {
        const del = row.original;
        const fromDate = new Date(del.validFrom).toLocaleDateString();
        const untilDate = new Date(del.validUntil).toLocaleDateString();

        return (
          <div className="flex flex-col text-xs gap-0.5">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Calendar className="size-3 text-muted-foreground" />
              {fromDate} &rarr; {untilDate}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {new Date(del.validFrom).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              to{" "}
              {new Date(del.validUntil).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        );
      },
    }),

    // Action (Revoke)
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-right">Action</div>,
      cell: ({ row }) => {
        const del = row.original;
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 h-8 px-2"
              onClick={() => onPromptRevoke(del)}
            >
              <Trash2 className="size-3.5 mr-1" /> Revoke
            </Button>
          </div>
        );
      },
    }),
  ]);
}
