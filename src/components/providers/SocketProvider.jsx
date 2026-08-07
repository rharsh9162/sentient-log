"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@clerk/nextjs";

const SocketContext = createContext({
  socket: null,
  isConnected: false,
  visitors: { total: 0, devices: {}, topPages: [] },
});

export function SocketProvider({ children }) {
  const { userId } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [visitors, setVisitors] = useState({
    total: 0,
    devices: { desktop: 0, mobile: 0, tablet: 0 },
    topPages: [],
  });

  useEffect(() => {
    if (!userId) return; // Wait for auth

    const socketInstance = io("/dashboard", {
      query: { userId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("visitors:update", (data) => {
      setVisitors(data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, visitors }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
