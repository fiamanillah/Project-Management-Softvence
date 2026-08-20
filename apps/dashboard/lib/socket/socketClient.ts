// apps/dashboard/lib/socket/socketClient.ts

import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3030";

let socketInstance: Socket | null = null;

export function getSocketClient(): Socket {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"],
      auth: (cb) => {
        const token = getAccessToken();
        cb({ token });
      },
    });

    socketInstance.on("connect", () => {
      console.log("⚡ [Socket.IO] Connected with id:", socketInstance?.id);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🔌 [Socket.IO] Disconnected:", reason);
    });

    socketInstance.on("connect_error", (error) => {
      console.warn("⚠️ [Socket.IO] Connection error:", error.message);
    });
  }

  return socketInstance;
}

export function connectSocket(): Socket {
  const socket = getSocketClient();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socketInstance && socketInstance.connected) {
    socketInstance.disconnect();
  }
}
