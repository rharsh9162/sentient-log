import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import Script from "next/script";

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Script src="/tracker.js" data-internal="true" strategy="afterInteractive" />
      <Sidebar />
      <div className="dashboard-main">
        <Navbar />
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
