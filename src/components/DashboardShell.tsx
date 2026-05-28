"use client";

import { WeeklyRecapModal } from "@/components/WeeklyRecapModal";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-shell-bg relative flex h-dvh flex-col overflow-hidden">
      <WeeklyRecapModal />
      {children}
    </div>
  );
}
