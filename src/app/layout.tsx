import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProvidersWrapper } from "@/components/ProvidersWrapper";
import { auth } from "@/lib/auth";

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
  const session = await auth();

  return (
    <html lang="en" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col antialiased">
        <ThemeProvider>
          <SessionProvider session={session}>
            <ProvidersWrapper>{children}</ProvidersWrapper>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
