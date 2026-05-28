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
        {/* Splash screen — runs before React, hides itself after ~1.8 s */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){if(document.getElementById('__fs-sp'))return;var d=document.createElement('div');d.id='__fs-sp';d.style.cssText='position:fixed;inset:0;z-index:9999;background:#0a1412;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;opacity:1;transition:opacity 0.45s ease';var fi=document.createElement('div');fi.textContent='🔥';fi.style.cssText='font-size:52px;transform:scale(0.4);opacity:0;transition:transform 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.08s,opacity 0.3s 0.08s';var wc=document.createElement('div');wc.style.cssText='overflow:hidden';var w=document.createElement('div');w.textContent='FitSched';w.style.cssText='font-size:34px;font-weight:900;color:#fff;letter-spacing:-0.03em;transform:translateY(110%);transition:transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.2s;font-family:-apple-system,BlinkMacSystemFont,sans-serif';wc.appendChild(w);var tg=document.createElement('div');tg.textContent='Your schedule. Your pace.';tg.style.cssText='font-size:13px;color:rgba(107,191,184,0.6);font-weight:500;letter-spacing:0.01em;opacity:0;transition:opacity 0.4s 0.42s;font-family:-apple-system,BlinkMacSystemFont,sans-serif';var bc=document.createElement('div');bc.style.cssText='width:120px;height:2px;background:rgba(107,191,184,0.15);border-radius:999px;overflow:hidden;margin-top:14px;opacity:0;transition:opacity 0.2s 0.28s';var bf=document.createElement('div');bf.style.cssText='height:100%;width:0%;background:#6bbfb8;border-radius:999px;transition:width 1.15s cubic-bezier(.4,0,.6,1) 0.22s';bc.appendChild(bf);d.appendChild(fi);d.appendChild(wc);d.appendChild(tg);d.appendChild(bc);document.body.prepend(d);requestAnimationFrame(function(){requestAnimationFrame(function(){fi.style.transform='scale(1)';fi.style.opacity='1';w.style.transform='translateY(0)';tg.style.opacity='1';bc.style.opacity='1';bf.style.width='100%';});});setTimeout(function(){d.style.opacity='0';d.style.pointerEvents='none';},1350);setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d);},1850);})();` }} />
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
      </body>
    </html>
  );
}
