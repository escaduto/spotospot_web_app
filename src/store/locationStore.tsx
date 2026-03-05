"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserLocation {
  lat: number;
  lng: number;
  city: string | null;
  country: string | null;
  /** null = still loading, false = failed / blocked */
  resolved: boolean | null;
}

interface LocationState {
  location: UserLocation | null;
  loading: boolean;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

// Fallback: San Francisco
const FALLBACK: UserLocation = {
  lat: 37.7749,
  lng: -122.4194,
  city: null,
  country: null,
  resolved: false,
};

// ── Context ───────────────────────────────────────────────────────────────────

const LocationContext = createContext<LocationState>({
  location: null,
  loading: true,
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>({
    location: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const applyFallback = () => {
      if (!cancelled) setState({ loading: false, location: FALLBACK });
    };

    if (!navigator.geolocation) {
      // Geolocation API not available (e.g. non-secure context)
      applyFallback();
      return;
    }

    // Ask the browser for the user's GPS/network position.
    // - On first visit the browser shows a native permission prompt.
    // - If the user previously allowed, this resolves immediately from cache.
    // - If denied or timed out, we fall back to San Francisco.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setState({
          loading: false,
          location: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            city: null, // city/country unavailable from GPS coords alone
            country: null,
            resolved: true,
          },
        });
      },
      () => {
        // Permission denied, unavailable, or timed out → use fallback
        applyFallback();
      },
      {
        // Don't wait for high-accuracy GPS — network/IP estimate is fine
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 5 * 60 * 1000, // reuse a cached fix up to 5 min old
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LocationContext.Provider value={state}>
      {children}
    </LocationContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUserLocation(): LocationState {
  return useContext(LocationContext);
}
