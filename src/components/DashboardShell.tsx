"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { LoadingScreen } from "@/components/LoadingScreen";
import { LanguageCycleButton } from "@/components/LanguageCycleButton";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [showLoader, setShowLoader] = useState(true);

  const handleDone = useCallback(() => setShowLoader(false), []);

  return (
    <>
      <AnimatePresence>
        {showLoader && <LoadingScreen onDone={handleDone} />}
      </AnimatePresence>
      <div className="flex flex-col h-dvh overflow-hidden bg-[var(--bg)]">
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "8px 16px",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <LanguageCycleButton />
        </div>
        {children}
      </div>
    </>
  );
}
