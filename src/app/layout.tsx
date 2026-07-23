import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProvidersWrapper } from "@/components/ProvidersWrapper";
import { NativeShell } from "@/components/NativeShell";
import { SwRegistration } from "@/components/SwRegistration";
import { Analytics } from "@vercel/analytics/next"
import { SplashRemover } from "@/components/SplashRemover";

const APP_URL = "https://fitsched.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "FitSched",
    template: "%s | FitSched",
  },
  description:
    "A personalized workout planner for scheduling training, tracking progress, logging hikes, and earning FitTokens.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitSched",
  },
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "FitSched",
    title: "FitSched — Workout Planner & Fitness Tracker",
    description:
      "A personalized workout planner for scheduling training, tracking progress, logging hikes, and earning FitTokens.",
    // og:image comes from the file-based app/opengraph-image.tsx (1200×630).
  },
  twitter: {
    card: "summary_large_image",
    title: "FitSched — Workout Planner & Fitness Tracker",
    description:
      "Plan workouts, track progress, log hikes, and earn FitTokens.",
    // twitter image falls back to the 1200×630 opengraph-image.
  },
  alternates: {
    canonical: APP_URL,
  },
  metadataBase: new URL(APP_URL),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1265fe",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col antialiased">
        {/* Instant branded loading screen — removed by SplashRemover once the app shell is ready */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){if(document.getElementById('__fs-sp'))return;var d=document.createElement('div');d.id='__fs-sp';d.dataset.shown=Date.now();d.style.cssText='position:fixed;inset:0;z-index:9999;background:#0b0f0e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;opacity:1;transition:opacity .4s ease';var st=document.createElement('style');st.textContent='@keyframes fsPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.06);opacity:.82}}@keyframes fsSlide{0%{transform:translateX(-160%)}100%{transform:translateX(420%)}}';var lg=document.createElement('img');lg.src='/logo.png';lg.alt='';lg.style.cssText='width:84px;height:84px;object-fit:contain;border-radius:20px;animation:fsPulse 1.4s ease-in-out infinite';var nm=document.createElement('div');nm.textContent='FitSched';nm.style.cssText='font-size:26px;font-weight:900;letter-spacing:-.5px;color:#fff;font-family:system-ui,-apple-system,sans-serif';var bw=document.createElement('div');bw.style.cssText='width:120px;height:3px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden;margin-top:4px';var bar=document.createElement('div');bar.style.cssText='height:100%;width:40%;background:#1265fe;border-radius:999px;animation:fsSlide 1.1s ease-in-out infinite';bw.appendChild(bar);d.appendChild(st);d.appendChild(lg);d.appendChild(nm);d.appendChild(bw);document.body.prepend(d);})();` }} />
        <ThemeProvider>
          <SplashRemover />
          <NativeShell />
          <SwRegistration />
          <SessionProvider>
            <LanguageProvider>
              <ProvidersWrapper>{children}</ProvidersWrapper>
            </LanguageProvider>
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
