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
      <div className="flex flex-col h-dvh overflow-hidden bg-[var(--bg)]">
        {children}
      </div>
    </>
  );
}
