"use client";

import * as React from "react";
import {
  SearchableSelect,
  type SearchableSelectCriteria,
} from "@workspace/ui/components/searchable-select";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { api } from "@/lib/api";
import {
  User,
  Mail,
  Shield,
  Briefcase,
  Layers,
  Hash,
} from "lucide-react";

export interface UserItem {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  employeeId?: string;
  systemRole?: string;
  status?: string;
  mustChangePassword?: boolean;
  avatarUrl?: string;
  isActive?: boolean;
  designation?: {
    id: string;
    name: string;
    code: string;
    department?: {
      id: string;
      name: string;
      code: string;
    };
  };
}

export interface UserSearchSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (userId: string, user: UserItem | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  excludeUserIds?: string[];
  roleFilter?: string;
  designationId?: string;
  pageSize?: number;
  className?: string;
  triggerClassName?: string;
  popoverContentClassName?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "data-invalid"?: boolean;
}

const USER_CRITERIA: SearchableSelectCriteria[] = [
  { value: "all", label: "All", icon: Layers },
  { value: "name", label: "Name", icon: User },
  { value: "email", label: "Email", icon: Mail },
  { value: "employeeId", label: "Employee ID", icon: Hash },
  { value: "role", label: "Role", icon: Shield },
  { value: "designation", label: "Designation", icon: Briefcase },
];

export function UserSearchSelect({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Search and select a user...",
  searchPlaceholder = "Search users by name, email, employee ID...",
  disabled = false,
  excludeUserIds = [],
  roleFilter,
  designationId,
  pageSize = 8,
  className,
  triggerClassName,
  popoverContentClassName,
  id,
  "aria-invalid": ariaInvalid,
  "data-invalid": dataInvalid,
}: UserSearchSelectProps) {
  const fetcher = React.useCallback(
    async (params: {
      query: string;
      criteria: string;
      page: number;
      pageSize: number;
      signal?: AbortSignal;
    }) => {
      const { query, criteria, page, pageSize: limit, signal } = params;

      const searchParams = new URLSearchParams();
      searchParams.set("page", String(page));
      searchParams.set("limit", String(limit));

      if (query.trim()) {
        searchParams.set("search", query.trim());
      }

      if (roleFilter) {
        searchParams.set("role", roleFilter);
      } else if (criteria === "role" && query.trim()) {
        searchParams.set("role", query.trim().toUpperCase());
      }

      if (designationId) {
        searchParams.set("designationId", designationId);
      }

      const res = await api.get(`/users?${searchParams.toString()}`, { signal });

      const userList: UserItem[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.items)
            ? res.items
            : [];

      const pagination =
        (res as any)?.pagination ||
        (res as any)?.meta?.pagination ||
        res?.meta ||
        (res as any)?.data?.meta;

      const total = typeof pagination?.total === "number" ? pagination.total : userList.length;
      const totalPages =
        typeof pagination?.totalPages === "number"
          ? pagination.totalPages
          : Math.max(1, Math.ceil(total / limit));

      return {
        items: userList,
        totalPages,
        totalItems: total,
      };
    },
    [roleFilter, designationId]
  );

  const formatUserName = (user: UserItem) => {
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return name || user.email || "Unknown User";
  };

  return (
    <SearchableSelect<UserItem>
      id={id}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(val, item) => {
        onValueChange?.(val, item);
      }}
      fetcher={fetcher}
      pageSize={pageSize}
      criteriaOptions={USER_CRITERIA}
      defaultCriteria="all"
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText="No users found"
      loadingText="Searching users..."
      disabled={disabled}
      clearable={true}
      className={className}
      triggerClassName={triggerClassName}
      popoverContentClassName={popoverContentClassName}
      aria-invalid={ariaInvalid}
      data-invalid={dataInvalid}
      getItemId={(u) => u.id}
      getItemLabel={(u) => formatUserName(u)}
      getItemDescription={(u) => (
        <span className="flex items-center gap-2 text-muted-foreground text-[11px] truncate">
          <span>{u.email}</span>
          {u.employeeId && <span className="font-mono opacity-70">({u.employeeId})</span>}
        </span>
      )}
      getItemAvatar={(u) => {
        const first = u.firstName || "";
        const email = u.email || "";
        const fallback = first ? first.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";
        return {
          src: u.avatarUrl,
          fallback,
        };
      }}
      getItemBadge={(u) => {
        if (u.designation?.name) {
          return {
            text: u.designation.name,
            variant: "outline",
          };
        }
        if (u.systemRole) {
          return {
            text: u.systemRole,
            variant: u.systemRole === "SUPER_ADMIN" ? "default" : "secondary",
          };
        }
        return null;
      }}
      getItemDisabled={(u) => excludeUserIds.includes(u.id)}
      renderTriggerValue={(u) => {
        if (!u) return null;
        const displayName = formatUserName(u);
        const first = u.firstName || "";
        const email = u.email || "";
        const fallback = first ? first.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";

        return (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="size-5 shrink-0">
              {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-[9px]">
                {fallback}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium truncate text-foreground text-xs">{displayName}</span>
            <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
              ({u.email})
            </span>
            {u.designation?.name && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 hidden md:inline-flex">
                {u.designation.name}
              </Badge>
            )}
          </div>
        );
      }}
      renderItem={(u) => {
        const displayName = formatUserName(u);
        const first = u.firstName || "";
        const email = u.email || "";
        const fallback = first ? first.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";
        const isExcluded = excludeUserIds.includes(u.id);

        return (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Avatar className="size-7 shrink-0">
              {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {fallback}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium truncate text-foreground">
                  {displayName}
                </span>
                {u.designation?.name && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-3.5 font-normal text-muted-foreground">
                    {u.designation.name}
                  </Badge>
                )}
                {u.status === "INVITED" && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-3.5 font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                    Invited
                  </Badge>
                )}
                {isExcluded && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    Assigned
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                <span className="truncate">{u.email}</span>
                {u.employeeId && <span className="font-mono opacity-60">· {u.employeeId}</span>}
                {u.systemRole && (
                  <span className="opacity-75">· {u.systemRole.replace("_", " ")}</span>
                )}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
