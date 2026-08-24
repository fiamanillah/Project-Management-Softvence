"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type {
  ActiveStationContext,
  StationItem,
} from "@workspace/shared";

interface StationSessionContextType {
  activeContext: ActiveStationContext | null;
  myStations: StationItem[];
  isLoading: boolean;
  isSelecting: boolean;
  selectModalOpen: boolean;
  setSelectModalOpen: (open: boolean) => void;
  selectStation: (stationId: string, deviceInfo?: string) => Promise<void>;
  leaveStation: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshMyStations: () => Promise<void>;
}

const StationSessionContext = React.createContext<
  StationSessionContextType | undefined
>(undefined);

export function StationSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [activeContext, setActiveContext] =
    React.useState<ActiveStationContext | null>(null);
  const [myStations, setMyStations] = React.useState<StationItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSelecting, setIsSelecting] = React.useState<boolean>(false);
  const [selectModalOpen, setSelectModalOpen] = React.useState<boolean>(false);

  const refreshSession = React.useCallback(async () => {
    if (!user) {
      setActiveContext(null);
      return;
    }
    try {
      const res = await api.get<ActiveStationContext | null>(
        "/stations/active-session"
      );
      // api.get unwraps data if standard format, or returns direct object
      const context = (res as any)?.data !== undefined ? (res as any).data : res;
      setActiveContext(context || null);
    } catch (err) {
      console.warn("Failed to fetch active station session:", err);
      setActiveContext(null);
    }
  }, [user]);

  const refreshMyStations = React.useCallback(async () => {
    if (!user) {
      setMyStations([]);
      return;
    }
    try {
      const res = await api.get<StationItem[]>("/stations/my-stations");
      const list = (res as any)?.data !== undefined ? (res as any).data : res;
      setMyStations(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("Failed to fetch my stations:", err);
    }
  }, [user]);

  React.useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (user) {
        setIsLoading(true);
        await Promise.all([refreshSession(), refreshMyStations()]);
        if (isMounted) setIsLoading(false);
      } else {
        setActiveContext(null);
        setMyStations([]);
        setIsLoading(false);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [user, refreshSession, refreshMyStations]);

  const selectStation = async (stationId: string, deviceInfo?: string) => {
    setIsSelecting(true);
    try {
      const res = await api.post<ActiveStationContext>(
        "/stations/select-station",
        {
          stationId,
          deviceInfo: deviceInfo || (typeof navigator !== "undefined" ? navigator.userAgent : undefined),
        }
      );
      const context = (res as any)?.data !== undefined ? (res as any).data : res;
      setActiveContext(context);
      setSelectModalOpen(false);
      toast.success(`Connected to workstation: ${context?.station?.name || "Station"}`);
      await refreshMyStations();
    } catch (err: any) {
      toast.error(err.message || "Failed to select station");
      throw err;
    } finally {
      setIsSelecting(false);
    }
  };

  const leaveStation = async () => {
    try {
      await api.post("/stations/leave");
      setActiveContext(null);
      toast.info("Disconnected from workstation. Shift session ended.");
      await refreshMyStations();
    } catch (err: any) {
      toast.error(err.message || "Failed to leave station");
    }
  };

  return (
    <StationSessionContext.Provider
      value={{
        activeContext,
        myStations,
        isLoading,
        isSelecting,
        selectModalOpen,
        setSelectModalOpen,
        selectStation,
        leaveStation,
        refreshSession,
        refreshMyStations,
      }}
    >
      {children}
    </StationSessionContext.Provider>
  );
}

export function useStationSession() {
  const context = React.useContext(StationSessionContext);
  if (!context) {
    throw new Error(
      "useStationSession must be used within a StationSessionProvider"
    );
  }
  return context;
}
