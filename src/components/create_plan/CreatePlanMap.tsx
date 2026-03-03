"use client";

import { RefObject } from "react";

interface Props {
  mapContainerRef: RefObject<HTMLDivElement | null>;
  mapLoaded: boolean;
}

export function CreatePlanMap({ mapContainerRef, mapLoaded }: Props) {
  return (
    <div className="relative flex-1 min-w-0">
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl animate-bounce">🗺️</span>
            <p className="text-sm text-gray-400 animate-pulse">Loading map…</p>
          </div>
        </div>
      )}
    </div>
  );
}
