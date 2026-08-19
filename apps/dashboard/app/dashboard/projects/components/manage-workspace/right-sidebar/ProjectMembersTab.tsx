"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { MessageSquare, AtSign, Crown } from "lucide-react";
import { toast } from "sonner";
import type { WorkspaceMember } from "../types";

interface ProjectMembersTabProps {
  members: WorkspaceMember[];
  onMentionMember?: (name: string) => void;
}

export function ProjectMembersTab({ members, onMentionMember }: ProjectMembersTabProps) {
  return (
    <div className="p-3 space-y-2">
      {members.map((member) => {
        const initials = member.name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase();

        return (
          <div
            key={member.id}
            className="flex items-center justify-between gap-2.5 rounded-xl border border-border/60 bg-card/60 p-2.5 shadow-2xs hover:bg-muted/40 transition-colors"
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
                  <p className="text-xs font-semibold text-foreground truncate leading-tight">
                    {member.name}
                  </p>
                  {member.role === "Admin" || member.role === "Project Manager" ? (
                    <span title={member.role} className="inline-flex">
                      <Crown className="size-3 text-amber-500 shrink-0" />
                    </span>
                  ) : null}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {member.designation}
                </p>
              </div>
            </div>

            <Button
              size="icon-xs"
              variant="ghost"
              className="size-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
              title={`Mention @${member.name}`}
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
          </div>
        );
      })}
    </div>
  );
}
