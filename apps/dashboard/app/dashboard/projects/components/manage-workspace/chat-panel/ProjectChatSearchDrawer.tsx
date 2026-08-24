"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@workspace/ui/components/sheet";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Search, Loader2, MessageSquare, ArrowRight, X, Calendar, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { formatMessageRelativeTime, formatMessageFullDateTime } from "./date-utils";
import type { ProjectMessageItem } from "@workspace/shared";

export type SearchMessagePurpose = "INTERNAL_DISCUSSION" | "CLIENT_COMMUNICATION" | "ALL";

interface ProjectChatSearchDrawerProps {
  projectId: string;
  projectCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMessage: (messageId: string) => void;
}

export function ProjectChatSearchDrawer({
  projectId,
  projectCode,
  open,
  onOpenChange,
  onSelectMessage,
}: ProjectChatSearchDrawerProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedPurpose, setSelectedPurpose] = React.useState<SearchMessagePurpose>("ALL");
  const [results, setResults] = React.useState<ProjectMessageItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);

  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const executeSearch = React.useCallback(
    async (query: string, purpose: SearchMessagePurpose) => {
      if (!query.trim()) {
        setResults([]);
        setTotalCount(0);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set("q", query.trim());
        queryParams.set("limit", "30");
        if (purpose !== "ALL") {
          queryParams.set("purpose", purpose);
        }

        const res = await api.get<{ messages: ProjectMessageItem[]; total: number }>(
          `/projects/${projectId}/messages/search?${queryParams.toString()}`,
        );

        if (res && "messages" in res) {
          setResults(res.messages || []);
          setTotalCount(res.total || 0);
        } else if (res && "data" in (res as any)) {
          setResults((res as any).data.messages || []);
          setTotalCount((res as any).data.total || 0);
        } else {
          setResults([]);
          setTotalCount(0);
        }
      } catch (err) {
        setResults([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId],
  );

  React.useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchTerm.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(searchTerm, selectedPurpose);
      }, 350);
    } else {
      setResults([]);
      setTotalCount(0);
      setHasSearched(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, selectedPurpose, executeSearch]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
        <mark key={idx} className="bg-primary/20 text-primary font-semibold rounded-xs px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="p-4 border-b border-border/60">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <Search className="size-4 text-primary" />
            Search Conversation — {projectCode}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Search full message text, client dispatches, and notes.
          </SheetDescription>

          {/* Search Input Bar */}
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search messages..."
              className="pl-8 pr-8 h-9 text-xs"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1 no-scrollbar">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "INTERNAL_DISCUSSION", label: "Internal" },
                { id: "CLIENT_COMMUNICATION", label: "Client" },
                { id: "MEETING_NOTES", label: "Meeting Notes" },
              ] as const
            ).map((filter) => (
              <Button
                key={filter.id}
                type="button"
                variant={selectedPurpose === filter.id ? "default" : "outline"}
                size="sm"
                className="h-6 text-[11px] px-2.5 rounded-full"
                onClick={() => setSelectedPurpose(filter.id as any)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </SheetHeader>

        {/* Results Stream */}
        <ScrollArea className="flex-1 p-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="text-xs">Searching messages...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 mb-1">
                <span>
                  Found <strong className="text-foreground">{totalCount}</strong> message
                  {totalCount > 1 ? "s" : ""}
                </span>
              </div>

              {results.map((msg) => {
                const authorInitials = (msg.senderName || "User")
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0] ?? "")
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      onSelectMessage(msg.id);
                      onOpenChange(false);
                    }}
                    className="group flex flex-col gap-1.5 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/50 hover:border-primary/40 transition-all cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="size-5 shrink-0 border border-border/40">
                          <AvatarImage src={msg.senderAvatar || undefined} />
                          <AvatarFallback className="text-[9px] font-semibold">
                            {authorInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-semibold truncate text-foreground">
                          {msg.senderName || "User"}
                        </span>
                        {msg.senderDesignation && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                            • {msg.senderDesignation}
                          </span>
                        )}
                      </div>

                      <span
                        title={formatMessageFullDateTime(msg.createdAt || msg.timestamp)}
                        className="text-[10px] text-muted-foreground shrink-0 cursor-default"
                      >
                        {formatMessageRelativeTime(msg.createdAt || msg.timestamp)}
                      </span>
                    </div>

                    {/* Message Body with Highlight */}
                    <p className="text-xs text-foreground/90 leading-relaxed line-clamp-3">
                      {highlightMatch(msg.text, searchTerm)}
                    </p>

                    {/* Footer tags */}
                    <div className="flex items-center justify-between gap-2 mt-1 pt-1.5 border-t border-border/40">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 font-medium"
                        >
                          {msg.purpose === "CLIENT_COMMUNICATION"
                            ? "Client Comms"
                            : "Internal"}
                        </Badge>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            📎 {msg.attachments.length} attachment{msg.attachments.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                        Jump to message <ArrowRight className="size-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasSearched ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
              <MessageSquare className="size-8 stroke-1 text-muted-foreground/50" />
              <p className="text-xs font-medium text-foreground">No matching messages found</p>
              <p className="text-[11px]">Try adjusting your search query or purpose filters</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
              <Search className="size-8 stroke-1 text-muted-foreground/40" />
              <p className="text-xs">Type at least 2 characters to search</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
