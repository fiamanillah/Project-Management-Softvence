"use client";

import * as React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  LifeBuoy,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  MessageSquare,
  Mail,
  User,
} from "lucide-react";
import { useIssueStore } from "../data/issue-store";

export default function SupportTicketsPage() {
  const { tickets } = useIssueStore();
  const [search, setSearch] = React.useState("");

  const filteredTickets = React.useMemo(() => {
    return tickets.filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.ticketRef.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.authorName.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q)
      );
    });
  }, [tickets, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
      {/* Header and Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" /> Client & Support Tickets
          </h2>
          <p className="text-xs text-muted-foreground">
            Monitor client inquiries, SLA resolution status, and communications linked to project orders.
          </p>
        </div>

        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by ID, client, subject..."
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold">
                <th className="py-3 px-4 w-[120px]">Ticket Ref</th>
                <th className="py-3 px-4 w-[180px]">Project</th>
                <th className="py-3 px-4">Subject & Description</th>
                <th className="py-3 px-4 w-[160px]">Client Contact</th>
                <th className="py-3 px-4 w-[110px]">Priority</th>
                <th className="py-3 px-4 w-[120px]">Status</th>
                <th className="py-3 px-4 w-[120px]">SLA Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {/* Ticket Ref */}
                  <td className="py-3.5 px-4 font-mono font-bold text-primary">
                    {ticket.ticketRef}
                  </td>

                  {/* Project */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <FolderKanban className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{ticket.projectName}</span>
                    </div>
                  </td>

                  {/* Subject */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-0.5 max-w-md">
                      <span className="font-semibold text-foreground line-clamp-1">
                        {ticket.subject}
                      </span>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">
                        {ticket.description}
                      </span>
                    </div>
                  </td>

                  {/* Client */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {ticket.authorName}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Mail className="h-2.5 w-2.5" /> {ticket.authorEmail}
                      </span>
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4">
                    {ticket.priority === "URGENT" ? (
                      <Badge className="bg-rose-500 text-white text-[10px] font-bold">
                        URGENT
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        {ticket.priority}
                      </Badge>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {ticket.status.replace(/_/g, " ")}
                    </Badge>
                  </td>

                  {/* SLA */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> On Track
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
