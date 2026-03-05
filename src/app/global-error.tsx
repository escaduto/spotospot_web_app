"use client";

import { useEffect } from "react";

/**
 * Root-layout error boundary (global-error.tsx).
 * Required when the error originates in layout.tsx itself.
 * Must include its own <html>/<body> tags.
 */
export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.name === "ChunkLoadError" ||
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("Failed to load chunk");

  useEffect(() => {
    if (isChunkError) {
      const key = `chunk_reload_${error.digest ?? "global"}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [isChunkError, error.digest]);

  return (
    <html lang="en">
      <body>
        {isChunkError ? (
          <div
            style={{
              display: "flex",
              height: "100vh",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 16,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: "4px solid #0d9488",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
            <p style={{ color: "#6b7280", fontSize: 14 }}>Refreshing…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              height: "100vh",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 16,
              fontFamily: "system-ui, sans-serif",
              textAlign: "center",
              padding: "0 24px",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 320 }}>
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={reset}
              style={{
                padding: "8px 20px",
                background: "#0d9488",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        )}
      </body>
    </html>
  );
}
