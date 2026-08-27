// This file is the browser-side connection manager for the live dashboard. Its job is to connect the logged-in user to the Socket.IO /dashboard namespace, keep that connection alive, and expose live connection/visitor state to any component that needs it.


"use client";

import { createContext, useContext, useEffect, useState } from "react";
// createContext and useContext let this component share socket state with the rest of the dashboard without prop drilling
import { io } from "socket.io-client"; // Socket.IO client constructor
import { useAuth } from "@clerk/nextjs";

const SocketContext = createContext({
  socket: null,
  isConnected: false,
  visitors: { total: 0, devices: {}, topPages: [] },
});  // This matters because components that call useSocket() need something predictable even before the real connection is ready


// It wraps the dashboard layout and makes socket state available to all nested pages and components
export function SocketProvider({ children }) {
  const { userId } = useAuth();
  const [socket, setSocket] = useState(null);  // the active Socket.IO client instance
  const [isConnected, setIsConnected] = useState(false);  // whether the browser is currently connected to the live dashboard stream
  const [visitors, setVisitors] = useState({   // the current real-time visitor summary from the server
    total: 0,
    devices: { desktop: 0, mobile: 0, tablet: 0 },
    topPages: [],
  });

  useEffect(() => {
    if (!userId) return; // Wait for auth

// creates the Socket.IO client
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const socketInstance = io(`${SOCKET_URL}/dashboard`, {  // That matches the server-side namespace created in server.js
      query: { userId },   // It sends the current Clerk user ID during the initial connection handshake so the server can place this socket into the correct room
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,//it should keep retrying indefinitely, which is appropriate for a live dashboard.
      reconnectionDelay: 1000,
    });


// Then it listens for connection events
    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });
    
    // This is how the rest of the UI knows whether the live feed is currently online

// It also listens for visitor updates from the server
    socketInstance.on("visitors:update", (data) => {
      setVisitors(data);
    });  // That event is emitted from the server whenever the active visitor list changes


// After wiring the events, the socket instance is saved into state:  That makes the client available to pages that want to listen for live events like event:new
    setSocket(socketInstance);

    return () => {  // When the provider unmounts, it closes the socket connection cleanly
      socketInstance.disconnect();
    };
  }, [userId]);

// Finally, the provider exposes all the live socket state to its children
  return (
    <SocketContext.Provider value={{ socket, isConnected, visitors }}>
      {children}
    </SocketContext.Provider>
  );
}

/*
So any component inside the dashboard can call useSocket() and get access to:
- the socket instance
- the current connection status
- the live visitor summary
*/

export function useSocket() {
  return useContext(SocketContext);
}
