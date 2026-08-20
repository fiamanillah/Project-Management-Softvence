"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import { AtSign, Crown, Users } from "lucide-react";
import { toast } from "sonner";
import type { WorkspaceMember } from "../types";

interface ProjectMembersTabProps {
  members: WorkspaceMember[];
  onMentionMember?: (name: string) => void;
}

export function ProjectMembersTab({ members, onMentionMember }: ProjectMembersTabProps) {
  const onlineCount = members.filter((m) => m.isOnline).length;

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
          <Users className="size-3 text-primary" /> Team Roster ({members.length})
        </span>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
          {onlineCount} online
        </span>
      </div>

      <div className="space-y-1.5">
        {members.map((member) => {
          const initials = member.name
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0] ?? "")
            .join("")
            .toUpperCase();

          return (
            <div
              key={member.id}
              className="flex items-center justify-between gap-2.5 rounded-xl border border-border/60 bg-card/60 p-2.5 shadow-2xs hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <Avatar className="size-9 rounded-full ring-1 ring-border/50">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {member.isOnline ? (
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-muted-foreground/40 ring-2 ring-card" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                      {member.name}
                    </p>
                    {member.role === "Admin" || member.role === "Project Manager" || member.role === "Tech Lead" ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span className="inline-flex">
                              <Crown className="size-3 text-amber-500 shrink-0" />
                            </span>
                          }
                        />
                        <TooltipContent side="top" className="text-xs">
                          {member.role}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {member.designation}
                  </p>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="size-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                      onClick={() => {
                        if (onMentionMember) {
                          onMentionMember(member.name);
                        } else {
                          toast.success(`Mentioned @${member.name}`);
                        }
                      }}
                    >
                      <AtSign className="size-3.5" />
                    </Button>
                  }
                />
                <TooltipContent side="left" sideOffset={5} className="text-xs">
                  Mention @{member.name}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
}
