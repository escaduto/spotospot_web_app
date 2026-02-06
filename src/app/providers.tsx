"use client";

import { AuthProvider } from "@/src/hooks/useAuth";
import type { ReactNode } from "react";

/**
 * Client-component wrapper so we can use AuthProvider (which relies on
 * hooks / browser APIs) inside the server-rendered RootLayout.
 */
export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
