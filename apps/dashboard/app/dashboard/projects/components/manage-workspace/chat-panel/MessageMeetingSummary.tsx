"use client";

import * as React from "react";
import { FileText, CheckCircle2, ListTodo, Users, Calendar } from "lucide-react";
import type { ChatMeetingSummary } from "../types";

interface MessageMeetingSummaryProps {
  summary: ChatMeetingSummary;
}

export function MessageMeetingSummary({ summary }: MessageMeetingSummaryProps) {
  return (
    <div className="mt-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-card-foreground shadow-2xs backdrop-blur-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300 truncate">
            {summary.meetingTitle}
          </span>
        </div>
      </div>

      {/* Participants */}
      {summary.participants.length > 0 && (
        <div className="mb-2.5 flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
          <Users className="size-3 text-muted-foreground shrink-0" />
          <span className="font-semibold text-foreground/80">Attendees:</span>
          {summary.participants.map((p, i) => (
            <span key={i} className="bg-muted/70 px-1.5 py-0.2 rounded text-[10px] text-foreground">
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Key Decisions */}
      {summary.keyDecisions.length > 0 && (
        <div className="mb-2.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider block">
            Key Decisions & Notes
          </span>
          <ul className="space-y-1 pl-1">
            {summary.keyDecisions.map((dec, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/90 leading-tight">
                <CheckCircle2 className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                <span>{dec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {summary.actionItems.length > 0 && (
        <div className="space-y-1 pt-1.5 border-t border-amber-500/15">
          <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider block">
            Assigned Action Items
          </span>
          <div className="space-y-1">
            {summary.actionItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-background/80 border border-border/50 text-[11px]"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <ListTodo className="size-3 text-primary shrink-0" />
                  <span className="text-foreground truncate font-medium">{item.task}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-primary">{item.owner}</span>
                  {item.dueDate && <span>• {item.dueDate}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
