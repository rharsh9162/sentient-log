import React from "react";
import { SkeletonCard, SkeletonChart } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <div className="page-header" style={{ height: "40px", display: "flex", alignItems: "center" }}>
        <div className="skeleton" style={{ width: "200px", height: "32px", borderRadius: "8px" }} />
      </div>

      <div className="two-col" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="card">
        <SkeletonChart />
      </div>
    </div>
  );
}
