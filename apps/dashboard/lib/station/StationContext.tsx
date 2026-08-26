"use client"

import * as React from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useSocket } from "@/lib/socket/SocketProvider"
import { toast } from "sonner"
import type {
  ActiveStationContext,
  StationItem,
  StationProfileAssignmentItem,
  UserStationSessionsState,
} from "@workspace/shared"

const FOCUSED_STATION_STORAGE_KEY = "softvence_focused_station_id"
const BROADCAST_CHANNEL_NAME = "softvence_station_session_channel"

/**
 * Formats elapsed session time into human-friendly duration (e.g. "12m", "1h 45m", "2d 4h")
 */
export function formatSessionDuration(joinedAt?: string | Date | null): string {
  if (!joinedAt) return "Just now"
  const start = new Date(joinedAt).getTime()
  if (isNaN(start)) return "Just now"
  const now = Date.now()
  const diffMs = Math.max(0, now - start)
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    const remainingHours = diffHours % 24
    return remainingHours > 0
      ? `${diffDays}d ${remainingHours}h`
      : `${diffDays}d`
  }
  if (diffHours > 0) {
    const remainingMin = diffMin % 60
    return remainingMin > 0 ? `${diffHours}h ${remainingMin}m` : `${diffHours}h`
  }
  if (diffMin > 0) {
    return `${diffMin}m`
  }
  return "< 1m"
}

/**
 * Formats session join timestamp into a friendly readable time (e.g. "10:30 AM" or "Aug 25, 10:30 AM")
 */
export function formatSessionStartTime(
  joinedAt?: string | Date | null
): string {
  if (!joinedAt) return "Unknown"
  const date = new Date(joinedAt)
  if (isNaN(date.getTime())) return "Unknown"

  const today = new Date()
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

interface StationSessionContextType {
  activeSessions: ActiveStationContext[]
  activeStationIds: string[]
  currentStationId: string | null
  activeContext: ActiveStationContext | null
  myStations: StationItem[]
  allActiveProfiles: StationProfileAssignmentItem[]
  allActiveProfileIds: string[]
  sessionDuration: string
  isLoading: boolean
  isSelecting: boolean
  selectModalOpen: boolean
  setSelectModalOpen: (open: boolean) => void
  isJoined: (stationId: string) => boolean
  switchStation: (stationId: string) => void
  selectStation: (stationId: string, deviceInfo?: string) => Promise<void>
  leaveStation: (stationId?: string) => Promise<void>
  leaveAllStations: () => Promise<void>
  refreshSession: () => Promise<void>
  refreshMyStations: () => Promise<void>
}

const StationSessionContext = React.createContext<
  StationSessionContextType | undefined
>(undefined)

export function StationSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { socket, isConnected } = useSocket()
  const { user } = useAuth()
  const [activeSessions, setActiveSessions] = React.useState<
    ActiveStationContext[]
  >([])
  const [currentStationId, setCurrentStationId] = React.useState<string | null>(
    () => {
      if (typeof window !== "undefined") {
        return localStorage.getItem(FOCUSED_STATION_STORAGE_KEY) || null
      }
      return null
    }
  )
  const [myStations, setMyStations] = React.useState<StationItem[]>([])
  const [isLoading, setIsLoading] = React.useState<boolean>(true)
  const [isSelecting, setIsSelecting] = React.useState<boolean>(false)
  const [selectModalOpen, setSelectModalOpen] = React.useState<boolean>(false)
  const [, setTick] = React.useState<number>(0)

  // Periodic 30s timer ticker to dynamically refresh live elapsed duration badges
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1)
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Broadcast cross-tab updates helper
  const broadcastCrossTab = React.useCallback((payload: any) => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
        channel.postMessage(payload)
        channel.close()
      } catch {
        // Fallback
      }
    }
  }, [])

  // Active Station IDs
  const activeStationIds = React.useMemo(
    () => activeSessions.map((s) => s.station.id),
    [activeSessions]
  )

  // Synchronize current focused station ID with active sessions
  React.useEffect(() => {
    if (activeSessions.length === 0) {
      if (currentStationId !== null) {
        setCurrentStationId(null)
        if (typeof window !== "undefined") {
          localStorage.removeItem(FOCUSED_STATION_STORAGE_KEY)
        }
      }
      return
    }

    // If currentStationId is valid and still in activeSessions, keep it
    const isValid = activeSessions.some(
      (s) => s.station.id === currentStationId
    )
    if (!isValid) {
      const fallbackId = activeSessions[0]?.station.id || null
      setCurrentStationId(fallbackId)
      if (typeof window !== "undefined" && fallbackId) {
        localStorage.setItem(FOCUSED_STATION_STORAGE_KEY, fallbackId)
      }
    }
  }, [activeSessions, currentStationId])

  // Derived Active Context (for focused station)
  const activeContext = React.useMemo(() => {
    if (activeSessions.length === 0) return null
    return (
      activeSessions.find((s) => s.station.id === currentStationId) ||
      activeSessions[0] ||
      null
    )
  }, [activeSessions, currentStationId])

  // Merged Profiles across all active stations
  const allActiveProfiles = React.useMemo(() => {
    const profileMap = new Map<string, StationProfileAssignmentItem>()
    for (const ctx of activeSessions) {
      for (const prof of ctx.activeProfiles || []) {
        if (!profileMap.has(prof.profileId)) {
          profileMap.set(prof.profileId, prof)
        }
      }
    }
    return Array.from(profileMap.values())
  }, [activeSessions])

  const allActiveProfileIds = React.useMemo(
    () => allActiveProfiles.map((p) => p.profileId),
    [allActiveProfiles]
  )

  const refreshSession = React.useCallback(async () => {
    if (!user) {
      setActiveSessions([])
      return
    }
    try {
      const res = await api.get<
        UserStationSessionsState | ActiveStationContext[] | null
      >("/stations/active-sessions")
      const rawData = (res as any)?.data !== undefined ? (res as any).data : res

      if (rawData && Array.isArray(rawData.activeSessions)) {
        setActiveSessions(rawData.activeSessions)
      } else if (Array.isArray(rawData)) {
        setActiveSessions(rawData)
      } else if (
        rawData &&
        (rawData as any).session &&
        (rawData as any).station
      ) {
        setActiveSessions([rawData as ActiveStationContext])
      } else {
        setActiveSessions([])
      }
    } catch (err) {
      console.warn("Failed to fetch active station sessions:", err)
      setActiveSessions([])
    }
  }, [user])

  const refreshMyStations = React.useCallback(async () => {
    if (!user) {
      setMyStations([])
      return
    }
    try {
      const res = await api.get<StationItem[]>("/stations/my-stations")
      const list = (res as any)?.data !== undefined ? (res as any).data : res
      setMyStations(Array.isArray(list) ? list : [])
    } catch (err) {
      console.warn("Failed to fetch my stations:", err)
    }
  }, [user])

  React.useEffect(() => {
    let isMounted = true
    const init = async () => {
      if (user) {
        setIsLoading(true)
        await Promise.all([refreshSession(), refreshMyStations()])
        if (isMounted) setIsLoading(false)
      } else {
        setActiveSessions([])
        setMyStations([])
        setIsLoading(false)
      }
    }
    init()
    return () => {
      isMounted = false
    }
  }, [user, refreshSession, refreshMyStations])

  // Debounced refresh helpers to absorb bursts of real-time events without network storms
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const debouncedRefresh = React.useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    refreshTimeoutRef.current = setTimeout(() => {
      refreshSession()
      refreshMyStations()
    }, 400)
  }, [refreshSession, refreshMyStations])

  // 1. Cross-Tab Synchronization via BroadcastChannel & LocalStorage Event
  React.useEffect(() => {
    if (typeof window === "undefined") return

    let channel: BroadcastChannel | null = null
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
        channel.onmessage = (event) => {
          const data = event.data
          if (data?.type === "STATION_FOCUS_CHANGED" && data.stationId) {
            setCurrentStationId(data.stationId)
          } else if (data?.type === "STATION_SESSION_CHANGED") {
            debouncedRefresh()
          }
        }
      }
    } catch {
      // BroadcastChannel fallback
    }

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === FOCUSED_STATION_STORAGE_KEY &&
        e.newValue !== currentStationId
      ) {
        setCurrentStationId(e.newValue)
      }
    }

    window.addEventListener("storage", handleStorage)

    return () => {
      channel?.close()
      window.removeEventListener("storage", handleStorage)
    }
  }, [currentStationId, debouncedRefresh])

  // 2. Real-time WebSocket Event Subscriptions with room lifecycle management
  const previousStationIdsRef = React.useRef<string[]>([])
  React.useEffect(() => {
    if (!socket || !isConnected || !user) return

    // Join personal user room and stations overview
    socket.emit("room:join", { room: `user:${user.id}` })
    socket.emit("room:join", { room: "stations:overview" })

    // Leave rooms for stations no longer active
    const currentSet = new Set(activeStationIds)
    for (const oldId of previousStationIdsRef.current) {
      if (!currentSet.has(oldId)) {
        socket.emit("station:leave_room", { stationId: oldId })
      }
    }
    // Join rooms for newly active stations
    const prevSet = new Set(previousStationIdsRef.current)
    for (const sid of activeStationIds) {
      if (!prevSet.has(sid)) {
        socket.emit("station:join_room", { stationId: sid })
      }
    }
    previousStationIdsRef.current = activeStationIds

    const handleSessionJoined = (data: {
      stationId: string
      session: any
      currentOccupancy: number
      maxConcurrentUsers: number
    }) => {
      if (data?.session?.userId === user.id) {
        debouncedRefresh()
      }
    }

    const handleSessionLeft = (data: {
      stationId: string
      sessionId: string
      userId: string
      remainingOccupancy: number
    }) => {
      if (data?.userId === user.id) {
        debouncedRefresh()
      }
    }

    const handleStationUpdated = (data: {
      stationId: string
      station: StationItem
    }) => {
      if (!data?.station) return
      setMyStations((prev) =>
        prev.map((s) =>
          s.id === data.stationId ? { ...s, ...data.station } : s
        )
      )
      setActiveSessions((prev) =>
        prev.map((ctx) =>
          ctx.station.id === data.stationId
            ? { ...ctx, station: { ...ctx.station, ...data.station } }
            : ctx
        )
      )
    }

    const handleProfilesUpdated = (data: {
      stationId: string
      activeProfiles: StationProfileAssignmentItem[]
    }) => {
      if (!data?.stationId) return
      setActiveSessions((prev) =>
        prev.map((ctx) =>
          ctx.station.id === data.stationId
            ? {
                ...ctx,
                activeProfiles: data.activeProfiles || [],
                activeProfileIds: (data.activeProfiles || []).map(
                  (p) => p.profileId
                ),
              }
            : ctx
        )
      )
    }

    socket.on("station:session_joined", handleSessionJoined as any)
    socket.on("station:session_left", handleSessionLeft as any)
    socket.on("station:updated", handleStationUpdated as any)
    socket.on("station:profiles_updated", handleProfilesUpdated as any)

    return () => {
      socket.off("station:session_joined", handleSessionJoined as any)
      socket.off("station:session_left", handleSessionLeft as any)
      socket.off("station:updated", handleStationUpdated as any)
      socket.off("station:profiles_updated", handleProfilesUpdated as any)
    }
  }, [socket, isConnected, user, activeStationIds, debouncedRefresh])

  const isJoined = React.useCallback(
    (stationId: string) => {
      return activeStationIds.includes(stationId)
    },
    [activeStationIds]
  )

  const switchStation = React.useCallback(
    (stationId: string) => {
      const target = activeSessions.find((s) => s.station.id === stationId)
      if (target) {
        setCurrentStationId(stationId)
        if (typeof window !== "undefined") {
          localStorage.setItem(FOCUSED_STATION_STORAGE_KEY, stationId)
        }
        broadcastCrossTab({ type: "STATION_FOCUS_CHANGED", stationId })
        toast.info(`Switched focus to workstation: ${target.station.name}`)
      }
    },
    [activeSessions, broadcastCrossTab]
  )

  const selectStation = async (stationId: string, deviceInfo?: string) => {
    setIsSelecting(true)
    try {
      const res = await api.post<ActiveStationContext>(
        "/stations/select-station",
        {
          stationId,
          deviceInfo:
            deviceInfo ||
            (typeof navigator !== "undefined"
              ? navigator.userAgent
              : undefined),
        }
      )
      const context = (res as any)?.data !== undefined ? (res as any).data : res

      if (context?.station) {
        setActiveSessions((prev) => {
          const filtered = prev.filter((s) => s.station.id !== stationId)
          return [context, ...filtered]
        })
      }

      setCurrentStationId(stationId)
      if (typeof window !== "undefined") {
        localStorage.setItem(FOCUSED_STATION_STORAGE_KEY, stationId)
      }

      broadcastCrossTab({ type: "STATION_FOCUS_CHANGED", stationId })
      broadcastCrossTab({ type: "STATION_SESSION_CHANGED" })

      setSelectModalOpen(false)
      toast.success(
        `Connected to workstation: ${context?.station?.name || "Station"}`
      )
    } catch (err: any) {
      toast.error(err.message || "Failed to select station")
      throw err
    } finally {
      setIsSelecting(false)
    }
  }

  const leaveStation = async (targetStationId?: string) => {
    const stnId = targetStationId || currentStationId
    try {
      const targetStationName =
        activeSessions.find((s) => s.station.id === stnId)?.station.name ||
        "Workstation"

      if (stnId) {
        await api.post("/stations/leave", { stationId: stnId })
        setActiveSessions((prev) => prev.filter((s) => s.station.id !== stnId))
        toast.info(`Disconnected from ${targetStationName}.`)
      } else {
        await api.post("/stations/leave")
        setActiveSessions([])
        toast.info("Disconnected from all workstations. Shift session ended.")
      }

      broadcastCrossTab({ type: "STATION_SESSION_CHANGED" })
    } catch (err: any) {
      toast.error(err.message || "Failed to leave station")
    }
  }

  const leaveAllStations = async () => {
    try {
      await api.post("/stations/leave", { all: true })
      setActiveSessions([])
      setCurrentStationId(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem(FOCUSED_STATION_STORAGE_KEY)
      }
      broadcastCrossTab({ type: "STATION_SESSION_CHANGED" })
      toast.info("Disconnected from all workstations. Shift sessions ended.")
    } catch (err: any) {
      toast.error(err.message || "Failed to leave all stations")
    }
  }

  const sessionDuration = React.useMemo(() => {
    return formatSessionDuration(activeContext?.session?.joinedAt)
  }, [activeContext?.session?.joinedAt])

  return (
    <StationSessionContext.Provider
      value={{
        activeSessions,
        activeStationIds,
        currentStationId,
        activeContext,
        myStations,
        allActiveProfiles,
        allActiveProfileIds,
        sessionDuration,
        isLoading,
        isSelecting,
        selectModalOpen,
        setSelectModalOpen,
        isJoined,
        switchStation,
        selectStation,
        leaveStation,
        leaveAllStations,
        refreshSession,
        refreshMyStations,
      }}
    >
      {children}
    </StationSessionContext.Provider>
  )
}

export function useStationSession() {
  const context = React.useContext(StationSessionContext)
  if (!context) {
    throw new Error(
      "useStationSession must be used within a StationSessionProvider"
    )
  }
  return context
}
