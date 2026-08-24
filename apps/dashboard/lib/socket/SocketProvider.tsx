// apps/dashboard/lib/socket/SocketProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { connectSocket, disconnectSocket } from "./socketClient";
import { useAuth } from "@/lib/auth-context";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, user, isLoading } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const client = connectSocket(token);
    setSocket(client);

    const handleConnect = () => {
      console.log("⚡ [Socket.IO] Connected as", user.email);
      setIsConnected(true);
    };
    const handleDisconnect = (reason: string) => {
      console.log("🔌 [Socket.IO] Disconnected:", reason);
      setIsConnected(false);
    };
    const handleConnectError = (err: Error) => {
      console.warn("⚠️ [Socket.IO] Connection error:", err.message);
      setIsConnected(false);
    };

    client.on("connect", handleConnect);
    client.on("disconnect", handleDisconnect);
    client.on("connect_error", handleConnectError);

    if (client.connected) {
      setIsConnected(true);
    } else {
      client.connect();
    }

    return () => {
      client.off("connect", handleConnect);
      client.off("disconnect", handleDisconnect);
      client.off("connect_error", handleConnectError);
      disconnectSocket();
    };
  }, [token, user, isLoading]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
