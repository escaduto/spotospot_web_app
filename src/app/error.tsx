"use client";

import { useEffect } from "react";

/**
 * App-level error boundary (Next.js App Router).
 * Catches runtime errors — including Turbopack ChunkLoadErrors that occur
 * when a stale chunk is requested after a hot-reload or deployment.
 * On a chunk error we reload the page once so the browser fetches the
 * latest assets.
 */
export default function GlobalError({
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
      // One automatic reload to pick up fresh chunks; guard against loops
      // by checking sessionStorage.
      const key = `chunk_reload_${error.digest ?? "default"}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [isChunkError, error.digest]);

  if (isChunkError) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500">Refreshing…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center flex-col gap-4 px-6 text-center">
      <h2 className="text-lg font-semibold text-gray-800">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 max-w-xs">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition"
      >
        Try again
      </button>
    </div>
  );
}
