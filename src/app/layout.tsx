import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProvidersWrapper } from "@/components/ProvidersWrapper";
import { NativeShell } from "@/components/NativeShell";
import { SwRegistration } from "@/components/SwRegistration";
import { auth } from "@/lib/auth";
import { Analytics } from "@vercel/analytics/next"
import { SplashRemover } from "@/components/SplashRemover";

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
  themeColor: "#1265fe",
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
        {/* Splash screen — dismissed by SplashRemover once React hydrates (min 3 s) */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){if(document.getElementById('__fs-sp'))return;var d=document.createElement('div');d.id='__fs-sp';d.dataset.shown=Date.now();d.style.cssText='position:fixed;inset:0;z-index:9999;background:#000;display:flex;align-items:center;justify-content:center;opacity:1;transition:opacity 0.4s ease';var v=document.createElement('video');v.src='/intro.mp4';v.autoplay=true;v.muted=true;v.playsInline=true;v.loop=false;v.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover';var bar=document.createElement('div');bar.style.cssText='position:absolute;bottom:32px;left:50%;transform:translateX(-50%);width:80px;height:1.5px;background:#1a1a1a;border-radius:999px;overflow:hidden';var fill=document.createElement('div');fill.style.cssText='height:100%;width:0%;background:#fff;border-radius:999px;transition:width 1.2s cubic-bezier(.4,0,.6,1) 0.3s';bar.appendChild(fill);d.appendChild(v);d.appendChild(bar);document.body.prepend(d);setTimeout(function(){fill.style.width='100%';},50);setTimeout(function(){if(d.parentNode){d.style.opacity='0';d.style.pointerEvents='none';setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d);},450);}},12000);})();` }} />
        <ThemeProvider>
          <SplashRemover />
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
