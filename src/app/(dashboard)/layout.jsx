"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { SocketProvider } from "@/components/providers/SocketProvider";
import Script from "next/script";
import { useAuth } from "@clerk/nextjs";

export default function DashboardLayout({ children }) {
  const { userId } = useAuth();

  return (
    <SocketProvider>
      <div className="dashboard-layout">
        {userId && (
          <Script 
            src="/tracker.js" 
            data-internal="true" 
            data-site-id={userId} 
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
