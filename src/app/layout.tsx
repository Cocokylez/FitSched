import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProvidersWrapper } from "@/components/ProvidersWrapper";
import { NativeShell } from "@/components/NativeShell";
import { SwRegistration } from "@/components/SwRegistration";
import { auth } from "@/lib/auth";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/react";

const APP_URL = "https://fitsched.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "FitSched",
    template: "%s | FitSched",
  },
  description:
    "AI-powered workout scheduler that fits your workouts into your day automatically. Track streaks, earn FitTokens, and build lasting fitness habits.",
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
    title: "FitSched — AI Workout Scheduler",
    description:
      "AI-powered workout scheduler that fits your workouts into your day automatically. Track streaks, earn FitTokens, and build lasting fitness habits.",
    images: [
      {
        url: `${APP_URL}/logo2.png`,
        width: 512,
        height: 512,
        alt: "FitSched",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "FitSched — AI Workout Scheduler",
    description:
      "AI-powered workout scheduler that fits your workouts into your day automatically.",
    images: [`${APP_URL}/logo2.png`],
  },
  metadataBase: new URL(APP_URL),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6bbfb8",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col antialiased">
        {/* Splash screen — runs before React, hides itself after 1.65 s */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(sessionStorage.getItem('fs-sp'))return;sessionStorage.setItem('fs-sp','1');}catch(e){}var d=document.createElement('div');d.id='__fs-sp';d.style.cssText='position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;opacity:1;transition:opacity 0.35s ease-in';var wc=document.createElement('div');wc.style.cssText='overflow:hidden';var w=document.createElement('div');w.textContent='FitSched';w.style.cssText='font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.02em;transform:translateY(110%);transition:transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.06s;font-family:var(--font-display,-apple-system,BlinkMacSystemFont,sans-serif)';wc.appendChild(w);var bc=document.createElement('div');bc.style.cssText='width:80px;height:1.5px;background:#1a1a1a;border-radius:999px;overflow:hidden;opacity:0;transition:opacity 0.15s 0.2s';var bf=document.createElement('div');bf.style.cssText='height:100%;width:0%;background:#fff;border-radius:999px;transition:width 1.2s cubic-bezier(.4,0,.6,1) 0.1s';bc.appendChild(bf);d.appendChild(wc);d.appendChild(bc);document.body.prepend(d);requestAnimationFrame(function(){requestAnimationFrame(function(){w.style.transform='translateY(0)';bc.style.opacity='1';bf.style.width='100%';});});setTimeout(function(){d.style.opacity='0';d.style.pointerEvents='none';},1250);setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d);},1650);})();` }} />
        <ThemeProvider>
          <NativeShell />
          <SwRegistration />
          <SessionProvider session={session}>
            <LanguageProvider>
              <ProvidersWrapper>{children}</ProvidersWrapper>
            </LanguageProvider>
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
