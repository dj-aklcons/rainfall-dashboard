"use client";
// Next.js App Router error boundary — catches any unhandled React errors,
// including ChunkLoadErrors when a Vercel deployment lands while the page is open.

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--surface-sidebar, #1a2e2d)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 20,
      color: "rgba(255,255,255,0.8)",
      fontFamily: "var(--font-mono, monospace)",
      fontSize: 13,
      letterSpacing: "0.04em",
      padding: 24,
      textAlign: "center",
    }}>
      <svg width="40" height="40" viewBox="0 0 345.13 345.13" fill="none" style={{ opacity: 0.6 }}>
        <path fill="#76CDCE" d="M264.25,301.7c-2.45,3.01-5.08,5.91-7.88,8.71c-23.14,23.14-53.47,34.72-83.8,34.72s-60.66-11.58-83.81-34.72c-22.86-22.86-34.71-53.2-34.71-83.84c0-21.31,5.74-42.77,17.5-61.94l21.16-34.48L172.57,0l31.67,51.62l24.28,39.56l45.06,73.45C300.18,207.99,295.971,263.03,264.25,301.7z"/>
      </svg>
      <div style={{ opacity: 0.7 }}>SOMETHING WENT WRONG</div>
      <button
        onClick={() => {
          // Full reload recovers from stale JS chunks after a Vercel deployment.
          window.location.reload();
        }}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.3)",
          color: "rgba(255,255,255,0.8)",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 12,
          letterSpacing: "0.06em",
          padding: "8px 20px",
          cursor: "pointer",
          borderRadius: 4,
        }}
      >
        RELOAD
      </button>
      <div style={{ opacity: 0.4, fontSize: 11, maxWidth: 280 }}>
        A new version may have been deployed. Reloading should fix this.
      </div>
    </div>
  );
}
