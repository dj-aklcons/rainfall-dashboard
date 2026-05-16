import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Auckland Rainfall Dashboard",
    short_name: "Rainfall",
    description:
      "Council-style monitoring dashboard for hourly rainfall telemetry across Auckland rain-gauge stations.",
    start_url: "/",
    display: "standalone",
    background_color: "#124E4A",
    theme_color: "#124E4A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg",     sizes: "any",     type: "image/svg+xml", purpose: "any" },
    ],
  };
}
