// apps/dashboard/app/dashboard/projects/components/manage-workspace/chat-panel/useElapsedTimer.ts
"use client";

import * as React from "react";

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 1) return "< 1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function formatCountdownSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0:00";
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
}

interface UseElapsedTimerOptions {
  startTimeISO?: string | null;
  slaTargetMinutes?: number;
  isTerminal?: boolean;
}

export function useElapsedTimer({
  startTimeISO,
  slaTargetMinutes = 30,
  isTerminal = false,
}: UseElapsedTimerOptions) {
  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    if (isTerminal || !startTimeISO) return;

    // Tick every 10 seconds for live updates
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, [startTimeISO, isTerminal]);

  const elapsedMinutes = React.useMemo(() => {
    if (!startTimeISO) return 0;
    if (isTerminal) return 0;
    const start = new Date(startTimeISO).getTime();
    if (isNaN(start)) return 0;
    return Math.max(0, Math.floor((now - start) / 60000));
  }, [startTimeISO, now, isTerminal]);

  const elapsedFormatted = React.useMemo(() => {
    return formatDurationMinutes(elapsedMinutes);
  }, [elapsedMinutes]);

  const isBreached = elapsedMinutes > slaTargetMinutes;
  const isAtRisk = !isBreached && elapsedMinutes >= Math.floor(slaTargetMinutes * 0.75);

  const slaStatus: "ON_TRACK" | "AT_RISK" | "BREACHED" = isBreached
    ? "BREACHED"
    : isAtRisk
    ? "AT_RISK"
    : "ON_TRACK";

  return {
    elapsedMinutes,
    elapsedFormatted,
    isBreached,
    isAtRisk,
    slaStatus,
  };
}
