"use client";

import * as React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui/components/popover";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import {
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

export interface SearchableSelectCriteria {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SearchableSelectBadgeInfo {
  text: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
}

export interface SearchableSelectAvatarInfo {
  src?: string;
  fallback?: string;
  icon?: React.ReactNode;
}

export interface SearchableSelectProps<T = unknown> {
  // Value state
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, selectedItem: T | null) => void;

  // Static / Controlled Items
  items?: T[];

  // Remote Fetcher Mode
  fetcher?: (params: {
    query: string;
    criteria: string;
    page: number;
    pageSize: number;
    signal?: AbortSignal;
  }) => Promise<{
    items: T[];
    totalPages?: number;
    totalItems?: number;
  }>;

  // Pagination Props
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;

  // Criteria Props
  criteriaOptions?: SearchableSelectCriteria[];
  defaultCriteria?: string;
  selectedCriteria?: string;
  onCriteriaChange?: (criteria: string) => void;

  // Resolvers
  getItemId?: (item: T) => string;
  getItemLabel?: (item: T) => string;
  getItemDescription?: (item: T) => React.ReactNode;
  getItemAvatar?: (item: T) => SearchableSelectAvatarInfo | null;
  getItemBadge?: (item: T) => SearchableSelectBadgeInfo | null;
  getItemDisabled?: (item: T) => boolean;

  // Custom Renderers
  renderItem?: (item: T, isSelected: boolean) => React.ReactNode;
  renderTriggerValue?: (selectedItem: T | null) => React.ReactNode;

  // Client-side Custom Filter (optional)
  filterItem?: (item: T, query: string, criteria: string) => boolean;

  // UI Customization
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loadingText?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  triggerClassName?: string;
  popoverContentClassName?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "data-invalid"?: boolean;
}

export function SearchableSelect<T = unknown>({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  items: controlledItems,
  fetcher,
  pageSize = 10,
  currentPage: controlledPage,
  totalPages: controlledTotalPages,
  totalItems: controlledTotalItems,
  onPageChange,
  criteriaOptions,
  defaultCriteria,
  selectedCriteria: controlledCriteria,
  onCriteriaChange,
  getItemId = (item: T) => {
    if (typeof item === "string" || typeof item === "number") return String(item);
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return String(obj.id ?? obj.value ?? obj.key ?? obj.code ?? JSON.stringify(item));
    }
    return String(item);
  },
  getItemLabel = (item: T) => {
    if (typeof item === "string" || typeof item === "number") return String(item);
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return String(
        obj.label ??
        obj.name ??
        obj.title ??
        obj.text ??
        obj.code ??
        obj.fullName ??
        obj.value ??
        obj.id ??
        JSON.stringify(item)
      );
    }
    return String(item);
  },
  getItemDescription = (item: T) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return (obj.description ?? obj.subtitle ?? obj.details ?? obj.secondaryText ?? obj.meta ?? obj.email) as React.ReactNode;
    }
    return null;
  },
  getItemAvatar = (item: T) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      if (obj.avatar && typeof obj.avatar === "object") return obj.avatar as SearchableSelectAvatarInfo;
      if (typeof obj.avatarUrl === "string") return { src: obj.avatarUrl };
      if (typeof obj.image === "string" || typeof obj.imageUrl === "string") {
        return { src: (obj.image || obj.imageUrl) as string };
      }
    }
    return null;
  },
  getItemBadge = (item: T) => {
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      if (obj.badge && typeof obj.badge === "object") return obj.badge as SearchableSelectBadgeInfo;
      if (typeof obj.badge === "string") return { text: obj.badge };
      if (typeof obj.tag === "string") return { text: obj.tag, variant: "outline" };
      if (typeof obj.status === "string") return { text: obj.status, variant: "secondary" };
      if (typeof obj.category === "string") return { text: obj.category, variant: "outline" };
    }
    return null;
  },
  getItemDisabled = () => false,
  renderItem,
  renderTriggerValue,
  filterItem,
  placeholder = "Select an option...",
  searchPlaceholder = "Search items...",
  emptyText = "No items found",
  loadingText = "Loading items...",
  disabled = false,
  clearable = true,
  className,
  triggerClassName,
  popoverContentClassName,
  id,
  "aria-invalid": ariaInvalid,
  "data-invalid": dataInvalid,
}: SearchableSelectProps<T>) {
  // Popover open state
  const [open, setOpen] = React.useState(false);

  // Value state (uncontrolled fallback)
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isValueControlled = controlledValue !== undefined;
  const activeValue = isValueControlled ? controlledValue : uncontrolledValue;

  // Criteria state
  const initialCriteria =
    defaultCriteria || criteriaOptions?.[0]?.value || "all";
  const [uncontrolledCriteria, setUncontrolledCriteria] = React.useState(initialCriteria);
  const isCriteriaControlled = controlledCriteria !== undefined;
  const activeCriteria = isCriteriaControlled ? controlledCriteria : uncontrolledCriteria;

  // Search query state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  // Debounce search query (250ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Page state (uncontrolled fallback)
  const [uncontrolledPage, setUncontrolledPage] = React.useState(1);
  const isPageControlled = controlledPage !== undefined;
  const activePage = isPageControlled ? controlledPage : uncontrolledPage;

  const resetPageToOne = () => {
    if (isPageControlled) {
      onPageChange?.(1);
    } else {
      setUncontrolledPage(1);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    resetPageToOne();
  };

  const handleClearSearchInput = () => {
    setSearchQuery("");
    resetPageToOne();
  };

  // Async fetching states
  const [asyncItems, setAsyncItems] = React.useState<T[]>([]);
  const [asyncTotalPages, setAsyncTotalPages] = React.useState(1);
  const [asyncTotalItems, setAsyncTotalItems] = React.useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  // Selected item cache (to preserve trigger label across pagination or filter changes)
  const [cachedSelectedItem, setCachedSelectedItem] = React.useState<T | null>(null);

  // Remote data fetcher effect
  React.useEffect(() => {
    if (!fetcher) return;

    const abortController = new AbortController();
    let isCancelled = false;

    const executeFetch = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const res = await fetcher({
          query: debouncedQuery,
          criteria: activeCriteria,
          page: activePage,
          pageSize,
          signal: abortController.signal,
        });

        if (!isCancelled) {
          setAsyncItems(res.items || []);
          const calcTotalPages =
            res.totalPages ??
            (res.totalItems !== undefined ? Math.ceil(res.totalItems / pageSize) : 1);
          setAsyncTotalPages(Math.max(1, calcTotalPages));
          setAsyncTotalItems(res.totalItems);
        }
      } catch (err: unknown) {
        if (!isCancelled && err instanceof Error && err.name !== "AbortError") {
          setFetchError(err.message || "Failed to load options");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    executeFetch();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [fetcher, debouncedQuery, activeCriteria, activePage, pageSize]);

  // Client-side filtering & pagination (when static items are passed)
  const isClientMode = !fetcher && Boolean(controlledItems);

  const filteredClientItems = React.useMemo(() => {
    if (!isClientMode || !controlledItems) return [];

    let filtered = controlledItems;

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase().trim();
      if (filterItem) {
        filtered = filtered.filter((item) => filterItem(item, q, activeCriteria));
      } else {
        filtered = filtered.filter((item) => {
          // If item is string or number
          if (typeof item === "string" || typeof item === "number") {
            return String(item).toLowerCase().includes(q);
          }

          if (typeof item === "object" && item !== null) {
            const obj = item as Record<string, unknown>;

            // If specific criteria is selected that matches a property on the item
            if (activeCriteria !== "all" && obj[activeCriteria] !== undefined) {
              const fieldVal = String(obj[activeCriteria]).toLowerCase();
              return fieldVal.includes(q);
            }

            // Check standard resolvers
            const label = getItemLabel(item)?.toLowerCase() || "";
            const desc =
              typeof getItemDescription(item) === "string"
                ? (getItemDescription(item) as string).toLowerCase()
                : "";
            const idStr = getItemId(item)?.toLowerCase() || "";

            if (label.includes(q) || desc.includes(q) || idStr.includes(q)) {
              return true;
            }

            // Check all string/number properties on the object for universal deep search
            return Object.values(obj).some((val) => {
              if (typeof val === "string" || typeof val === "number") {
                return String(val).toLowerCase().includes(q);
              }
              return false;
            });
          }

          return false;
        });
      }
    }

    return filtered;
  }, [isClientMode, controlledItems, debouncedQuery, activeCriteria, filterItem, getItemLabel, getItemDescription, getItemId]);

  // Calculate items and pagination for current view
  const currentItems: T[] = React.useMemo(() => {
    if (fetcher) {
      return asyncItems;
    }
    if (isClientMode) {
      const start = (activePage - 1) * pageSize;
      return filteredClientItems.slice(start, start + pageSize);
    }
    return controlledItems || [];
  }, [fetcher, asyncItems, isClientMode, filteredClientItems, activePage, pageSize, controlledItems]);

  const totalPages = React.useMemo(() => {
    if (controlledTotalPages !== undefined) return controlledTotalPages;
    if (fetcher) return asyncTotalPages;
    if (isClientMode) {
      return Math.max(1, Math.ceil(filteredClientItems.length / pageSize));
    }
    return 1;
  }, [controlledTotalPages, fetcher, asyncTotalPages, isClientMode, filteredClientItems.length, pageSize]);

  const totalItemsCount = React.useMemo(() => {
    if (controlledTotalItems !== undefined) return controlledTotalItems;
    if (fetcher) return asyncTotalItems;
    if (isClientMode) return filteredClientItems.length;
    return controlledItems?.length;
  }, [controlledTotalItems, fetcher, asyncTotalItems, isClientMode, filteredClientItems.length, controlledItems]);

  // Selection handler
  const handleSelect = (item: T) => {
    const itemId = getItemId(item);
    const isCurrentlySelected = activeValue === itemId;
    const nextValue = isCurrentlySelected ? "" : itemId;
    const nextItem = isCurrentlySelected ? null : item;

    if (!isValueControlled) {
      setUncontrolledValue(nextValue);
    }
    setCachedSelectedItem(nextItem);
    onValueChange?.(nextValue, nextItem);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isValueControlled) {
      setUncontrolledValue("");
    }
    setCachedSelectedItem(null);
    onValueChange?.("", null);
  };

  const handleCriteriaChange = (newCriteria: string) => {
    if (!isCriteriaControlled) {
      setUncontrolledCriteria(newCriteria);
    }
    resetPageToOne();
    onCriteriaChange?.(newCriteria);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (isPageControlled) {
      onPageChange?.(newPage);
    } else {
      setUncontrolledPage(newPage);
    }
  };

  // Selected item reference for trigger
  const selectedItem =
    currentItems.find((i) => getItemId(i) === activeValue) ||
    cachedSelectedItem ||
    (controlledItems || []).find((i) => getItemId(i) === activeValue) ||
    null;

  const isInvalid = ariaInvalid || dataInvalid;

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          aria-invalid={isInvalid}
          className={cn(
            "group flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors",
            "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isInvalid && "border-destructive ring-3 ring-destructive/20 dark:ring-destructive/40",
            triggerClassName
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
            {selectedItem ? (
              renderTriggerValue ? (
                renderTriggerValue(selectedItem)
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  {getItemAvatar && (
                    <TriggerAvatar info={getItemAvatar(selectedItem)} label={getItemLabel(selectedItem)} />
                  )}
                  <span className="truncate font-medium text-foreground">
                    {getItemLabel(selectedItem)}
                  </span>
                  {getItemBadge && (
                    <TriggerBadge info={getItemBadge(selectedItem)} />
                  )}
                </div>
              )
            ) : (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
            {clearable && selectedItem && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                className="p-0.5 rounded-md hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClear(e as unknown as React.MouseEvent);
                  }
                }}
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronDown className="size-4 opacity-60 transition-transform duration-200 group-aria-expanded:rotate-180" />
          </div>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className={cn(
            "w-[var(--anchor-width)] min-w-[320px] max-w-[420px] p-0 flex flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg z-50",
            popoverContentClassName
          )}
        >
          {/* Search Header */}
          <div className="p-2.5 pb-2 border-b bg-muted/20 space-y-2">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder={searchPlaceholder}
                className="pl-8.5 pr-8 h-9 text-xs rounded-lg bg-background shadow-none border-input/60 focus-visible:ring-1"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {isLoading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                {searchQuery && !isLoading && (
                  <button
                    type="button"
                    onClick={handleClearSearchInput}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Criteria Selector Pills */}
            {criteriaOptions && criteriaOptions.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mr-1 shrink-0">
                  <SlidersHorizontal className="size-3" />
                  <span>By:</span>
                </div>
                {criteriaOptions.map((opt) => {
                  const isActive = activeCriteria === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleCriteriaChange(opt.value)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors shrink-0 cursor-pointer border",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {Icon && <Icon className="size-3" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {isLoading && currentItems.length === 0 ? (
              <div className="p-2 space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-2.5 p-2 rounded-lg">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-3/4 rounded" />
                      <Skeleton className="h-2.5 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-center text-muted-foreground pt-1">{loadingText}</p>
              </div>
            ) : fetchError ? (
              <div className="p-6 text-center text-xs text-destructive">
                <p>{fetchError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => setDebouncedQuery(searchQuery)}
                >
                  Retry
                </Button>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-medium text-foreground">{emptyText}</p>
                {searchQuery && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">
                      No results matching "{searchQuery}" in {activeCriteria}.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearchInput}
                      className="text-xs text-primary hover:text-primary"
                    >
                      Clear search
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              currentItems.map((item) => {
                const itemId = getItemId(item);
                const isSelected = activeValue === itemId;
                const isDisabled = getItemDisabled(item);

                return (
                  <button
                    key={itemId}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "group/item relative flex w-full items-center justify-between gap-2 rounded-lg p-2 text-left transition-colors select-none outline-hidden cursor-pointer",
                      "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                      isSelected && "bg-accent/80 text-foreground font-medium",
                      isDisabled && "pointer-events-none opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {renderItem ? (
                        renderItem(item, isSelected)
                      ) : (
                        <>
                          {getItemAvatar && (
                            <ItemAvatar info={getItemAvatar(item)} label={getItemLabel(item)} />
                          )}
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium truncate text-foreground">
                                {getItemLabel(item)}
                              </span>
                              {getItemBadge && <ItemBadge info={getItemBadge(item)} />}
                            </div>
                            {getItemDescription(item) && (
                              <span className="text-[11px] text-muted-foreground truncate">
                                {getItemDescription(item)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="size-4 text-primary shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          {(totalPages > 1 || (totalItemsCount !== undefined && totalItemsCount > pageSize)) && (
            <div className="flex items-center justify-between p-2 border-t bg-muted/20 text-xs text-muted-foreground">
              <div className="text-[11px] font-medium">
                Page <span className="text-foreground font-semibold">{activePage}</span> of{" "}
                <span className="text-foreground font-semibold">{totalPages}</span>
                {totalItemsCount !== undefined && (
                  <span className="ml-1 opacity-70">({totalItemsCount} items)</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  disabled={activePage <= 1 || isLoading}
                  onClick={() => handlePageChange(activePage - 1)}
                  aria-label="Previous page"
                  className="size-6 rounded"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  disabled={activePage >= totalPages || isLoading}
                  onClick={() => handlePageChange(activePage + 1)}
                  aria-label="Next page"
                  className="size-6 rounded"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Subcomponents for internal rendering
function ItemAvatar({
  info,
  label,
}: {
  info: SearchableSelectAvatarInfo | null;
  label: string;
}) {
  if (!info) return null;

  if (info.icon) {
    return (
      <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {info.icon}
      </div>
    );
  }

  const fallback =
    info.fallback ||
    (label ? label.trim().charAt(0).toUpperCase() : "?");

  return (
    <Avatar size="sm" className="size-7 shrink-0">
      {info.src && <AvatarImage src={info.src} alt={label} />}
      <AvatarFallback className="text-[11px] font-bold bg-muted text-muted-foreground">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}

function ItemBadge({ info }: { info: SearchableSelectBadgeInfo | null }) {
  if (!info || !info.text) return null;
  return (
    <Badge
      variant={info.variant || "secondary"}
      className="text-[10px] px-1.5 py-0 h-4 font-normal"
    >
      {info.text}
    </Badge>
  );
}

function TriggerAvatar({
  info,
  label,
}: {
  info: SearchableSelectAvatarInfo | null;
  label: string;
}) {
  if (!info) return null;

  if (info.icon) {
    return (
      <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {info.icon}
      </div>
    );
  }

  const fallback =
    info.fallback ||
    (label ? label.trim().charAt(0).toUpperCase() : "?");

  return (
    <Avatar size="sm" className="size-5 shrink-0">
      {info.src && <AvatarImage src={info.src} alt={label} />}
      <AvatarFallback className="text-[9px] font-bold bg-muted text-muted-foreground">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}

function TriggerBadge({ info }: { info: SearchableSelectBadgeInfo | null }) {
  if (!info || !info.text) return null;
  return (
    <Badge
      variant={info.variant || "secondary"}
      className="text-[10px] px-1.5 py-0 h-4 font-normal"
    >
      {info.text}
    </Badge>
  );
}
