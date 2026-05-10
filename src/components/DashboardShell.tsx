"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ScheduleUploadNotice } from "@/components/ScheduleUploadNotice";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [showLoader, setShowLoader] = useState(true);

  const handleDone = useCallback(() => setShowLoader(false), []);

  return (
    <>
      <AnimatePresence>
        {showLoader && <LoadingScreen onDone={handleDone} />}
      </AnimatePresence>
      <div className="flex flex-col h-dvh overflow-hidden bg-[var(--bg)]">
        <ScheduleUploadNotice />
        {children}
      </div>
    </>
  );
}
