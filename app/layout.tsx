import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ubuntu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Auckland Rainfall Dashboard",
  description: "Council-style monitoring dashboard for hourly rainfall telemetry across Auckland rain-gauge stations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-density="comfy" suppressHydrationWarning>
      <body className={`${ubuntu.variable} ${GeistMono.variable}`}>{children}</body>
    </html>
  );
}
