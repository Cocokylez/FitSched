import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProvidersWrapper } from "@/components/ProvidersWrapper";
import { NativeShell } from "@/components/NativeShell";
import { getServerSession, authOptions } from "@/lib/auth";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitSched",
  description:
    "AI-powered workout scheduler that fits your workout into your day automatically",
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#007aff",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col antialiased">
        <ThemeProvider>
          <NativeShell />
          <SessionProvider session={session}>
            <LanguageProvider>
              <ProvidersWrapper>{children}</ProvidersWrapper>
            </LanguageProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
