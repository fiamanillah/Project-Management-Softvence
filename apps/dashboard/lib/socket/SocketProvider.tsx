// apps/dashboard/lib/socket/SocketProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { getSocketClient, connectSocket, disconnectSocket } from "./socketClient";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const client = connectSocket();
    setSocket(client);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    client.on("connect", handleConnect);
    client.on("disconnect", handleDisconnect);

    if (client.connected) {
      setIsConnected(true);
    }

    return () => {
      client.off("connect", handleConnect);
      client.off("disconnect", handleDisconnect);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
