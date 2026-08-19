"use client";

import type { ClientMessageType, ClientMessageDirection } from "./types";

export interface MessageThemeConfig {
  id: string;
  label: string;
  colorHex: string;
  dotColorClass: string;
  borderAccentClass: string;
  headerBgClass: string;
  headerBorderClass: string;
  badgeClass: string;
  cardBorderClass: string;
  ambientBgClass: string;
  description: string;
}

export const OUTBOUND_THEMES: Record<string, MessageThemeConfig> = {
  DELIVERY: {
    id: "DELIVERY",
    label: "Milestone Delivery",
    colorHex: "#10b981",
    dotColorClass: "bg-emerald-500",
    borderAccentClass: "border-l-emerald-500",
    headerBgClass: "bg-emerald-500/10 dark:bg-emerald-950/30",
    headerBorderClass: "border-emerald-500/20",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    cardBorderClass: "border-emerald-500/30",
    ambientBgClass: "bg-emerald-500/4 dark:bg-emerald-950/15",
    description: "Official deliverable submission & milestone handover",
  },
  EXTENSION_REQUEST: {
    id: "EXTENSION_REQUEST",
    label: "Extension Request",
    colorHex: "#f59e0b",
    dotColorClass: "bg-amber-500",
    borderAccentClass: "border-l-amber-500",
    headerBgClass: "bg-amber-500/10 dark:bg-amber-950/30",
    headerBorderClass: "border-amber-500/20",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    cardBorderClass: "border-amber-500/30",
    ambientBgClass: "bg-amber-500/4 dark:bg-amber-950/15",
    description: "Timeline or deadline extension request",
  },
  STATUS_UPDATE: {
    id: "STATUS_UPDATE",
    label: "Status Update",
    colorHex: "#6366f1",
    dotColorClass: "bg-indigo-500",
    borderAccentClass: "border-l-indigo-500",
    headerBgClass: "bg-indigo-500/10 dark:bg-indigo-950/30",
    headerBorderClass: "border-indigo-500/20",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    cardBorderClass: "border-indigo-500/30",
    ambientBgClass: "bg-indigo-500/4 dark:bg-indigo-950/15",
    description: "Sprint & milestone progress report",
  },
  PAYMENT_ESCROW: {
    id: "PAYMENT_ESCROW",
    label: "Escrow Milestone",
    colorHex: "#06b6d4",
    dotColorClass: "bg-cyan-500",
    borderAccentClass: "border-l-cyan-500",
    headerBgClass: "bg-cyan-500/10 dark:bg-cyan-950/30",
    headerBorderClass: "border-cyan-500/20",
    badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    cardBorderClass: "border-cyan-500/30",
    ambientBgClass: "bg-cyan-500/4 dark:bg-cyan-950/15",
    description: "Escrow release or invoice milestone notification",
  },
  SCOPE_REVISION: {
    id: "SCOPE_REVISION",
    label: "Scope Revision",
    colorHex: "#a855f7",
    dotColorClass: "bg-purple-500",
    borderAccentClass: "border-l-purple-500",
    headerBgClass: "bg-purple-500/10 dark:bg-purple-950/30",
    headerBorderClass: "border-purple-500/20",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    cardBorderClass: "border-purple-500/30",
    ambientBgClass: "bg-purple-500/4 dark:bg-purple-950/15",
    description: "Scope adjustment or requirement clarification",
  },
  MEETING_SUMMARY: {
    id: "MEETING_SUMMARY",
    label: "Meeting Summary",
    colorHex: "#f97316",
    dotColorClass: "bg-orange-500",
    borderAccentClass: "border-l-orange-500",
    headerBgClass: "bg-orange-500/10 dark:bg-orange-950/30",
    headerBorderClass: "border-orange-500/20",
    badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    cardBorderClass: "border-orange-500/30",
    ambientBgClass: "bg-orange-500/4 dark:bg-orange-950/15",
    description: "Client sync meeting notes & action items",
  },
  GENERAL_NOTICE: {
    id: "GENERAL_NOTICE",
    label: "General Notice",
    colorHex: "#0ea5e9",
    dotColorClass: "bg-sky-500",
    borderAccentClass: "border-l-sky-500",
    headerBgClass: "bg-sky-500/10 dark:bg-sky-950/30",
    headerBorderClass: "border-sky-500/20",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    cardBorderClass: "border-sky-500/30",
    ambientBgClass: "bg-sky-500/4 dark:bg-sky-950/15",
    description: "General client dispatch or notice",
  },
};

export const INBOUND_THEMES: Record<string, MessageThemeConfig> = {
  CLIENT_FEEDBACK: {
    id: "CLIENT_FEEDBACK",
    label: "Client Feedback",
    colorHex: "#3b82f6",
    dotColorClass: "bg-blue-500",
    borderAccentClass: "border-l-blue-500",
    headerBgClass: "bg-blue-500/10 dark:bg-blue-950/30",
    headerBorderClass: "border-blue-500/20",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    cardBorderClass: "border-blue-500/30",
    ambientBgClass: "bg-blue-500/4 dark:bg-blue-950/15",
    description: "Client feedback, remarks, or review",
  },
  INQUIRY: {
    id: "INQUIRY",
    label: "Client Inquiry",
    colorHex: "#06b6d4",
    dotColorClass: "bg-cyan-500",
    borderAccentClass: "border-l-cyan-500",
    headerBgClass: "bg-cyan-500/10 dark:bg-cyan-950/30",
    headerBorderClass: "border-cyan-500/20",
    badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    cardBorderClass: "border-cyan-500/30",
    ambientBgClass: "bg-cyan-500/4 dark:bg-cyan-950/15",
    description: "Questions, inquiries, or clarification",
  },
  CHANGE_REQUEST: {
    id: "CHANGE_REQUEST",
    label: "Change Request",
    colorHex: "#a855f7",
    dotColorClass: "bg-purple-500",
    borderAccentClass: "border-l-purple-500",
    headerBgClass: "bg-purple-500/10 dark:bg-purple-950/30",
    headerBorderClass: "border-purple-500/20",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    cardBorderClass: "border-purple-500/30",
    ambientBgClass: "bg-purple-500/4 dark:bg-purple-950/15",
    description: "Feature revision, edit, or scope addition",
  },
  APPROVAL_CONFIRM: {
    id: "APPROVAL_CONFIRM",
    label: "Approval Sign-off",
    colorHex: "#10b981",
    dotColorClass: "bg-emerald-500",
    borderAccentClass: "border-l-emerald-500",
    headerBgClass: "bg-emerald-500/10 dark:bg-emerald-950/30",
    headerBorderClass: "border-emerald-500/20",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    cardBorderClass: "border-emerald-500/30",
    ambientBgClass: "bg-emerald-500/4 dark:bg-emerald-950/15",
    description: "Client approved deliverables or milestone",
  },
  ASSET_SUBMISSION: {
    id: "ASSET_SUBMISSION",
    label: "Asset Delivery",
    colorHex: "#f59e0b",
    dotColorClass: "bg-amber-500",
    borderAccentClass: "border-l-amber-500",
    headerBgClass: "bg-amber-500/10 dark:bg-amber-950/30",
    headerBorderClass: "border-amber-500/20",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    cardBorderClass: "border-amber-500/30",
    ambientBgClass: "bg-amber-500/4 dark:bg-amber-950/15",
    description: "Client shared files, brand assets, or logins",
  },
  ESCROW_CONFIRM: {
    id: "ESCROW_CONFIRM",
    label: "Escrow Confirmed",
    colorHex: "#14b8a6",
    dotColorClass: "bg-teal-500",
    borderAccentClass: "border-l-teal-500",
    headerBgClass: "bg-teal-500/10 dark:bg-teal-950/30",
    headerBorderClass: "border-teal-500/20",
    badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
    cardBorderClass: "border-teal-500/30",
    ambientBgClass: "bg-teal-500/4 dark:bg-teal-950/15",
    description: "Client funded milestone or released escrow",
  },
  BUG_REPORT: {
    id: "BUG_REPORT",
    label: "Bug / Issue",
    colorHex: "#f43f5e",
    dotColorClass: "bg-rose-500",
    borderAccentClass: "border-l-rose-500",
    headerBgClass: "bg-rose-500/10 dark:bg-rose-950/30",
    headerBorderClass: "border-rose-500/20",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    cardBorderClass: "border-rose-500/30",
    ambientBgClass: "bg-rose-500/4 dark:bg-rose-950/15",
    description: "Client reported issue or QA feedback",
  },
  CLIENT_REPLY: {
    id: "CLIENT_REPLY",
    label: "Client Reply",
    colorHex: "#3b82f6",
    dotColorClass: "bg-blue-500",
    borderAccentClass: "border-l-blue-500",
    headerBgClass: "bg-blue-500/10 dark:bg-blue-950/30",
    headerBorderClass: "border-blue-500/20",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    cardBorderClass: "border-blue-500/30",
    ambientBgClass: "bg-blue-500/4 dark:bg-blue-950/15",
    description: "Reply to team queries & feedback",
  },
};

export function getMessageTheme(
  type?: ClientMessageType,
  direction: ClientMessageDirection = "OUTBOUND"
): MessageThemeConfig {
  if (!type) {
    return direction === "OUTBOUND"
      ? OUTBOUND_THEMES.GENERAL_NOTICE!
      : INBOUND_THEMES.CLIENT_FEEDBACK!;
  }

  const upperType = type.toUpperCase();

  if (OUTBOUND_THEMES[upperType]) {
    return OUTBOUND_THEMES[upperType]!;
  }
  if (INBOUND_THEMES[upperType]) {
    return INBOUND_THEMES[upperType]!;
  }

  // Dynamic fallback for custom created types
  const formattedLabel = type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return {
    id: type,
    label: formattedLabel,
    colorHex: "#0ea5e9",
    dotColorClass: "bg-sky-500",
    borderAccentClass: "border-l-sky-500",
    headerBgClass: "bg-sky-500/10 dark:bg-sky-950/30",
    headerBorderClass: "border-sky-500/20",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    cardBorderClass: "border-sky-500/30",
    ambientBgClass: "bg-sky-500/4 dark:bg-sky-950/15",
    description: `Custom message type: ${formattedLabel}`,
  };
}
