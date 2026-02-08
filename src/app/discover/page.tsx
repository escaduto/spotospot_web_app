"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

/**
 * Dynamically import the map component with SSR disabled –
 * MapLibre GL relies on browser APIs (canvas, WebGL).
 */
const DiscoverMap = dynamic(
  () => import("@/src/components/discover/DiscoverMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-bounce">🗺️</span>
          <p className="text-sm text-gray-400 animate-pulse">Loading map…</p>
        </div>
      </div>
    ),
  },
);

export default function DiscoverPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* ---- Minimal header ---- */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 z-30 shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl">📍</span>
          <span className="text-lg font-bold tracking-tight bg-linear-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
            SpotoSpot
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-xs font-medium text-gray-400 uppercase tracking-wider">
            Discover Places
          </span>
          <Link
            href="/"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition"
          >
            ← Home
          </Link>
        </div>
      </header>

      {/* ---- Map takes remaining viewport ---- */}
      <main className="flex-1 relative min-h-0">
        <DiscoverMap />
      </main>
    </div>
  );
}
