"use client";

import { AuthProvider } from "@/src/hooks/useAuth";
import { LocationProvider } from "@/src/store/locationStore";
import type { ReactNode } from "react";

/**
 * Client-component wrapper so we can use AuthProvider (which relies on
 * hooks / browser APIs) inside the server-rendered RootLayout.
 */
export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <AuthProvider>{children}</AuthProvider>
    </LocationProvider>
  );
}
