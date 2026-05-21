"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { LoadingScreen } from "@/components/LoadingScreen";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [showLoader, setShowLoader] = useState(true);

  const handleDone = useCallback(() => setShowLoader(false), []);

  return (
    <>
      <AnimatePresence>
        {showLoader && <LoadingScreen onDone={handleDone} />}
      </AnimatePresence>
      <div className="dashboard-shell-bg relative flex h-dvh flex-col overflow-hidden">
        {children}
      </div>
    </>
  );
}
