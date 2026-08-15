"use client";

import * as React from "react";
import { DataTablePagination, type DataTablePaginationProps } from "@/components/data-table";

export interface AuditLogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  isLoading?: boolean;
}

export function AuditLogPagination(props: AuditLogPaginationProps) {
  return (
    <DataTablePagination
      currentPage={props.currentPage}
      totalPages={props.totalPages}
      totalItems={props.totalItems}
      limit={props.limit}
      onPageChange={props.onPageChange}
      onLimitChange={props.onLimitChange}
      isLoading={props.isLoading}
    />
  );
}
