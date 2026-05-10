"use client";

import { useEffect, useState } from "react";
import { Calendar, FileImage, X } from "lucide-react";
import { usePathname } from "next/navigation";

type OnboardingPreferences = {
  calendarPreference?: string;
  scheduleImageName?: string;
};

const STORAGE_KEY = "fitsched-onboarding-preferences";
const DISMISSED_KEY = "fitsched-schedule-upload-notice-dismissed";

export function ScheduleUploadNotice() {
  const pathname = usePathname();
  const [fileName, setFileName] = useState("");
  const [dismissed, setDismissed] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!pathname?.startsWith("/schedule")) {
      return;
    }

    try {
      const wasDismissed = localStorage.getItem(DISMISSED_KEY) === "true";
      const rawPreferences = localStorage.getItem(STORAGE_KEY);

      if (!rawPreferences || wasDismissed) {
        setDismissed(wasDismissed);
        return;
      }

      const preferences = JSON.parse(rawPreferences) as OnboardingPreferences;
      const uploadedName = preferences.scheduleImageName?.trim();

      if (preferences.calendarPreference === "upload" && uploadedName) {
        setFileName(uploadedName);
        setDismissed(false);
      }
    } catch {
      setFileName("");
    }
  }, [pathname]);

  if (!pathname?.startsWith("/schedule") || dismissed || !fileName) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const handleConnectCalendar = async () => {
    setConnecting(true);

    try {
      const response = await fetch("/api/calendar/connect");
      const data = (await response.json()) as { url?: string };

      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // Keep the notice visible so the user can retry.
    }

    setConnecting(false);
  };

  return (
    <div
      className="pointer-events-none fixed left-4 right-4 top-20 z-40 mx-auto max-w-xl md:left-auto md:right-6"
      aria-live="polite"
    >
      <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[var(--card)] p-4 shadow-2xl shadow-black/25">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-cyan-300">
            <FileImage size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  Schedule upload saved
                </p>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">
                  {fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--muted)] transition hover:bg-white/10 hover:text-[var(--text)]"
                aria-label="Dismiss schedule upload notice"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-5 text-[var(--muted)]">
              FitSched saved your upload, but image reading is not automatic yet.
              Connect Google Calendar for live schedule sync.
            </p>
            <button
              type="button"
              onClick={handleConnectCalendar}
              disabled={connecting}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-cyan-400 px-4 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Calendar size={16} aria-hidden="true" />
              {connecting ? "Connecting..." : "Connect calendar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
