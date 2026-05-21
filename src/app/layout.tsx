import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProvidersWrapper } from "@/components/ProvidersWrapper";
import { NativeShell } from "@/components/NativeShell";
import { auth } from "@/lib/auth";
import { Analytics } from "@vercel/analytics/next";

const APP_URL = "https://fitsched.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "FitSched — AI Workout Scheduler",
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
        <ThemeProvider>
          <NativeShell />
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
