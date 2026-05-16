import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
  description:
    "Council-style monitoring dashboard for hourly rainfall telemetry across Auckland rain-gauge stations.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Rainfall",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#124E4A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-density="comfy"
      suppressHydrationWarning
      className={`${ubuntu.variable} ${GeistMono.variable}`}
    >
      <body>
        {children}
        <Script strategy="afterInteractive" id="sw-register">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          }
        `}</Script>
      </body>
    </html>
  );
}
