import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Web3Provider } from "@/contexts/web3-context";
import { SmartAccountProvider } from "@/contexts/smart-account-context";
import { DelegationProvider } from "@/contexts/delegation-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { AppKit } from "@/lib/web3/reown-config";
import { ErrorSuppressor } from "@/components/error-suppressor";

export const metadata: Metadata = {
  title: "SecureFlow - Trustless Escrow on Arbitrum Stylus",
  description:
    "Trustless payments with transparent milestones powered by Arbitrum Stylus",
  generator: "SecureFlow",
  manifest: "/manifest.json",
  icons: {
    icon: "/secureflow-favicon.svg?v=2",
    apple: "/secureflow-favicon.svg?v=2",
    shortcut: "/secureflow-favicon.svg?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href="/secureflow-favicon.svg?v=2"
          type="image/svg+xml"
        />
        <link rel="apple-touch-icon" href="/secureflow-favicon.svg?v=2" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ErrorSuppressor />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppKit>
            <Suspense fallback={<div>Loading...</div>}>
              <Web3Provider>
                <DelegationProvider>
                  <SmartAccountProvider>
                    <NotificationProvider>
                      <Navbar />
                      <main className="pt-16">{children}</main>
                      <Toaster />
                    </NotificationProvider>
                  </SmartAccountProvider>
                </DelegationProvider>
              </Web3Provider>
            </Suspense>
          </AppKit>
        </ThemeProvider>
      </body>
    </html>
  );
}
