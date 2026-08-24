// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/date-utils.ts

/**
 * Format a timestamp / ISO string into a concise time format: e.g. "10:01 AM"
 */
export function formatMessageTime(timestampOrIso?: string | null): string {
  if (!timestampOrIso) return "";

  // Check if string is a pure time format already (e.g. "10:01 AM" or "14:30")
  if (/^\d{1,2}:\d{2}(\s?[APap][Mm])?$/.test(timestampOrIso.trim())) {
    return timestampOrIso.trim();
  }

  const date = new Date(timestampOrIso);
  if (isNaN(date.getTime())) {
    return timestampOrIso;
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a timestamp / ISO string into a calendar date format: e.g. "Aug 24, 2026"
 */
export function formatMessageDate(timestampOrIso?: string | null): string {
  if (!timestampOrIso) return "";

  const date = new Date(timestampOrIso);
  if (isNaN(date.getTime())) {
    return timestampOrIso;
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a timestamp / ISO string into full detailed tooltip: e.g. "Monday, Aug 24, 2026, 10:01:45 AM"
 */
export function formatMessageFullDateTime(timestampOrIso?: string | null): string {
  if (!timestampOrIso) return "";

  const date = new Date(timestampOrIso);
  if (isNaN(date.getTime())) {
    return timestampOrIso;
  }

  return date.toLocaleString([], {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Format a timestamp / ISO string into relative display: e.g. "Today at 10:01 AM", "Yesterday at 3:15 PM", "Aug 22, 2026 at 4:00 PM"
 */
export function formatMessageRelativeTime(timestampOrIso?: string | null): string {
  if (!timestampOrIso) return "";

  // If already relative like "Just now" or "Today"
  if (timestampOrIso === "Just now" || timestampOrIso === "Recently") {
    return timestampOrIso;
  }

  const date = new Date(timestampOrIso);
  if (isNaN(date.getTime())) {
    return timestampOrIso;
  }

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return timeStr;
  }

  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  const dateStr = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(isSameYear ? {} : { year: "numeric" }),
  });

  return `${dateStr}, ${timeStr}`;
}
