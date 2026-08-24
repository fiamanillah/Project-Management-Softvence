// apps/dashboard/lib/socket/socketClient.ts

import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/api";
import { env } from "@/lib/env";

function getSocketServerUrl(): string {
  const rawUrl = env.NEXT_PUBLIC_WS_URL || env.NEXT_PUBLIC_API_URL || "http://localhost:3030";
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "http://localhost:3030";
  }
}

let socketInstance: Socket | null = null;

export function getSocketClient(): Socket {
  if (!socketInstance) {
    const serverUrl = getSocketServerUrl();
    socketInstance = io(serverUrl, {
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
      // INC-11: Refresh token on auth failure
      const latestToken = getAccessToken();
      if (socketInstance && latestToken) {
        socketInstance.auth = { token: latestToken };
      }
    });
  }

  return socketInstance;
}

export function connectSocket(token?: string): Socket {
  const socket = getSocketClient();
  const activeToken = token || getAccessToken();
  if (activeToken) {
    socket.auth = { token: activeToken };
  }
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
