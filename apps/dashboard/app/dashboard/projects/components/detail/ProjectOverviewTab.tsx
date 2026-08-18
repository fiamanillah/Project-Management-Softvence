"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import {
  DollarSign,
  Lock,
  ExternalLink,
  Calendar,
  Clock,
  Building2,
  Globe,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Layers,
  UsersRound,
  ShieldAlert,
  Link as LinkIcon,
  Mail,
  Percent,
  FileText,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Hash,
  GitFork,
} from "lucide-react";
import { toast } from "sonner";
import type { ProjectDetailItem, ProjectItem } from "@workspace/shared";

interface ProjectOverviewTabProps {
  project: ProjectDetailItem | ProjectItem;
  canViewClient: boolean;
  canViewFinancials: boolean;
  onEdit?: () => void;
}

export function ProjectOverviewTab({
  project,
  canViewClient,
  canViewFinancials,
}: ProjectOverviewTabProps) {
  const p = project;
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [copiedOrderId, setCopiedOrderId] = React.useState(false);

  const handleCopyCode = () => {
    if (!p.projectName) return;
    navigator.clipboard.writeText(p.projectName);
    setCopiedCode(true);
    toast.success("Project Code copied to clipboard");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyOrderId = () => {
    if (!p.orderId) return;
    navigator.clipboard.writeText(p.orderId);
    setCopiedOrderId(true);
    toast.success("Platform Order ID copied to clipboard");
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  // Calculate timeline progress if dates exist
  const progressInfo = React.useMemo(() => {
    if (!p.startDate || !p.deliveryDate) return null;
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.deliveryDate).getTime();
    const now = Date.now();

    if (isNaN(start) || isNaN(end) || end <= start) return null;

    const totalDuration = end - start;
    const elapsed = Math.max(0, now - start);
    const percentage = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));

    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    return {
      percentage,
      daysLeft,
      isOverdue: daysLeft < 0,
    };
  }, [p.startDate, p.deliveryDate]);

  const activeTeamsCount = p.teamAssignments?.filter((ta) => !ta.unassignedAt).length || 0;
  const activeMembersCount = p.userAssignments?.filter((ua) => !ua.unassignedAt).length || 0;
  const componentsCount = p.components?.length || 0;
  const subProjectsCount = (p as any).subProjects?.length || p._count?.subProjects || 0;

  return (
    <div className="space-y-5">
      {/* 1. HERO BANNER: PRIMARY PROJECT IDENTIFIER */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Project Master Identifier
              </span>
              <Badge variant="secondary" className="font-mono text-[10px] py-0 px-2 bg-primary/15 text-primary border-primary/20">
                Primary Identity
              </Badge>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-mono text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {p.projectName}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="h-7 px-2 text-xs gap-1 bg-background/80 hover:bg-background shadow-2xs"
                title="Copy Project Code"
              >
                {copiedCode ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
                <span className="text-[11px] font-medium">{copiedCode ? "Copied" : "Copy Code"}</span>
              </Button>
            </div>
            {p.service && (
              <p className="text-xs text-muted-foreground font-medium pt-0.5">
                Deliverable: <span className="text-foreground font-semibold">{p.service}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {p.parentProject && (
              <Badge variant="outline" className="text-xs gap-1 font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20 py-1">
                <GitFork className="size-3.5" /> Child of {p.parentProject.projectName}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2.5 py-1 border shadow-2xs"
              style={{
                borderColor: p.status?.color ? `${p.status.color}50` : undefined,
                backgroundColor: p.status?.color ? `${p.status.color}15` : undefined,
                color: p.status?.color || undefined,
              }}
            >
              {p.status?.name || "Active"}
            </Badge>
          </div>
        </div>
      </div>

      {/* 2. QUICK METRIC KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Platform Order */}
        <Card className="border bg-card/60 shadow-2xs backdrop-blur-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Hash className="size-3.5 text-primary" /> Platform Order ID
            </span>
            <div className="flex items-center justify-between gap-1 pt-0.5">
              <p className="text-xs font-mono font-bold text-foreground truncate" title={p.orderId}>
                {p.orderId}
              </p>
              <button
                type="button"
                onClick={handleCopyOrderId}
                className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                title="Copy Order ID"
              >
                {copiedOrderId ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Service Line */}
        <Card className="border bg-card/60 shadow-2xs backdrop-blur-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Layers className="size-3.5 text-blue-500" /> Service Line
            </span>
            <p className="text-xs font-semibold text-foreground truncate pt-0.5" title={p.serviceLine?.name || "General"}>
              {p.serviceLine?.name || "General"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Active Roster */}
        <Card className="border bg-card/60 shadow-2xs backdrop-blur-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <UsersRound className="size-3.5 text-purple-500" /> Team & Staff
            </span>
            <p className="text-xs font-semibold text-foreground pt-0.5">
              {activeTeamsCount} Teams • {activeMembersCount} Staff
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Deliverables & Sub-orders */}
        <Card className="border bg-card/60 shadow-2xs backdrop-blur-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Briefcase className="size-3.5 text-emerald-500" /> Deliverables
            </span>
            <p className="text-xs font-semibold text-foreground pt-0.5">
              {componentsCount} Components {subProjectsCount > 0 ? `• ${subProjectsCount} Sub-orders` : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. TIMELINE & DEADLINE SCHEDULE */}
      {progressInfo && (
        <Card className="border bg-card/50 shadow-2xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span className="font-semibold text-foreground">Timeline & Delivery Schedule</span>
              </div>
              <span
                className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                  progressInfo.isOverdue
                    ? "bg-destructive/15 text-destructive border border-destructive/20"
                    : progressInfo.daysLeft <= 3
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {progressInfo.isOverdue
                  ? `Overdue by ${Math.abs(progressInfo.daysLeft)} days`
                  : progressInfo.daysLeft === 0
                  ? "Due Today"
                  : `${progressInfo.daysLeft} days remaining`}
              </span>
            </div>

            <Progress value={progressInfo.percentage} className="h-2" />

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5 text-muted-foreground" />
                Order / Start Date:{" "}
                <span className="font-medium text-foreground">
                  {p.startDate ? new Date(p.startDate).toLocaleDateString() : "Not set"}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5 text-muted-foreground" />
                Promised Deadline:{" "}
                <span className="font-medium text-foreground">
                  {p.deliveryDate ? new Date(p.deliveryDate).toLocaleDateString() : "Not set"}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. TWO-COLUMN DETAILED BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT CARD: PLATFORM ORDER & CLIENT CONTACT */}
        <Card className="border bg-card/60 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="size-4 text-blue-500" /> Platform Order & Client Account
              </span>
              {canViewClient ? (
                <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-500/10 border-blue-500/20 font-normal">
                  Authorized Access
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] gap-1 text-muted-foreground bg-muted font-normal">
                  <Lock className="size-2.5 text-muted-foreground" /> Client Protected
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 pt-1 space-y-2.5 text-xs">
            {/* Platform Order ID */}
            <div className="flex justify-between items-center py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Platform Order ID</span>
              <span className="font-mono font-bold text-foreground">{p.orderId}</span>
            </div>

            {/* Direct Order Link */}
            {p.orderLink && (
              <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1">
                  <LinkIcon className="size-3" /> Platform URL
                </span>
                <a
                  href={p.orderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Open Platform Order <ExternalLink className="size-3" />
                </a>
              </div>
            )}

            {/* Platform & Account Profile */}
            <div className="flex justify-between items-center py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Platform / Account</span>
              {canViewClient ? (
                <span className="font-medium text-foreground">
                  {p.profile?.platform?.name || "Direct Platform"}
                  {p.profile?.username ? ` (${p.profile.username})` : ""}
                </span>
              ) : (
                <span className="text-muted-foreground italic flex items-center gap-1">
                  <Lock className="size-2.5" /> Confidential Account
                </span>
              )}
            </div>

            {/* Client Identity & Email */}
            {canViewClient ? (
              <>
                <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Client Name</span>
                  <span className="font-semibold text-foreground">{p.client?.name || "Direct Client"}</span>
                </div>
                {p.email && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Mail className="size-3" /> Client Email
                    </span>
                    <a href={`mailto:${p.email}`} className="text-primary hover:underline font-mono">
                      {p.email}
                    </a>
                  </div>
                )}
                {p.client?.contactNotes && (
                  <div className="mt-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground border border-border/30">
                    <p className="font-medium text-foreground mb-0.5">Client Notes:</p>
                    {p.client.contactNotes}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg bg-muted/30 border border-dashed border-border/60 p-3.5 text-center space-y-1">
                <ShieldAlert className="size-4 text-muted-foreground mx-auto" />
                <p className="text-xs font-medium text-foreground">Client Identity Protected</p>
                <p className="text-[11px] text-muted-foreground">
                  Client identities and direct emails are restricted to authorized account managers.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT CARD: FINANCIALS, REVENUE SHARE & ORDER SHEET */}
        <Card className="border bg-card/60 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="size-4 text-emerald-500" /> Financials & Profit Margins
              </span>
              {canViewFinancials ? (
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-mono">
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] gap-1 text-muted-foreground bg-muted font-normal">
                  <Lock className="size-2.5 text-muted-foreground" /> Financials Protected
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 pt-1 space-y-2.5 text-xs">
            {canViewFinancials ? (
              <>
                {/* Gross Contract Value */}
                <div className="flex justify-between items-baseline py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Contract Value (Gross)</span>
                  <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    ${Number(p.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Net Payout Amount */}
                <div className="flex justify-between items-baseline py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Net Payout Amount</span>
                  <span className="font-semibold font-mono text-foreground">
                    {p.amount !== null && p.amount !== undefined
                      ? `$${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"}
                  </span>
                </div>

                {/* Share / Profit Margin */}
                <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Percent className="size-3" /> Profit Margin / Share
                  </span>
                  <span className="font-semibold font-mono text-foreground">
                    {p.percentage !== null && p.percentage !== undefined ? `${Number(p.percentage)}%` : "—"}
                  </span>
                </div>

                {/* Order Sheet Document */}
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <FileText className="size-3" /> Order Sheet Spec
                  </span>
                  {p.orderSheetUrl ? (
                    <a
                      href={p.orderSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Open Google Doc / Sheet <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">No document attached</span>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-lg bg-muted/30 border border-dashed border-border/60 p-4 text-center space-y-1">
                <Lock className="size-4 text-muted-foreground mx-auto" />
                <p className="text-xs font-medium text-foreground">Financial Figures Protected</p>
                <p className="text-[11px] text-muted-foreground">
                  Contract values, net payouts, margins, and billing sheets are hidden based on your assigned permission scope.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. OPERATIONAL REMARKS & SPECIAL INSTRUCTIONS */}
      {p.remarks && (
        <Card className="border bg-card/60 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="size-4 text-amber-500" /> Operational Remarks & Briefing
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="rounded-xl bg-muted/40 p-3.5 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed border border-border/40">
              {p.remarks}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
