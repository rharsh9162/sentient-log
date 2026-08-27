/*
This file is the shell for every authenticated dashboard page. It does not hold page-specific content itself. Instead, it wraps the dashboard pages with the shared pieces they all need:
- the live Socket.IO provider
- the sidebar
- the navbar
- the internal tracker script
- the content area where the selected page renders
*/


"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { SocketProvider } from "@/components/providers/SocketProvider";   // makes live socket state available to the dashboard tree
import Script from "next/script";  // used to inject the tracker script into the internal dashboard pages
import { useAuth } from "@clerk/nextjs";

export default function DashboardLayout({ children }) {
  const { userId } = useAuth();

  // Wrapping everything in SocketProvider means every page inside the dashboard can call useSocket() and get access to ....
  return (
    <SocketProvider>   
      <div className="dashboard-layout">
        {userId && (
          <Script 
            src="/script.js" 
            data-internal="true" 
            data-site-id={userId} 
            data-socket={process.env.NEXT_PUBLIC_SOCKET_URL || ""} 
            strategy="afterInteractive" 
          />
        )}
        {/*
          afterInteractive means : 
            Page loads first , User can interact , Then tracker.js loads
              So , that it never blocks page rendering 
        */}
        <Sidebar />
        <div className="dashboard-main">
          <Navbar />
          <main className="dashboard-content">{children}</main>
        </div>
      </div>
    </SocketProvider>
  );
}
