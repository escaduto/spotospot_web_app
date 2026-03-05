"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/src/supabase/client";
import type { Profile } from "@/src/supabase/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<void>;
  signInWithOAuth: (provider: "google" | "apple" | "github") => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------- helpers ------------------------------------------------ */

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile((data as Profile) ?? null);
    },
    [supabase],
  );

  /* ---------- bootstrap session -------------------------------------- */

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: string, newSession: Session | null) => {
        if (!mounted) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Clear loading IMMEDIATELY — before any async work so the UI is never
        // stuck waiting for a profile fetch that might be slow.
        if (
          event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT"
        ) {
          if (mounted) setLoading(false);
        }

        // Profile fetch is fire-and-forget: it enriches the UI after the auth
        // gate is already unblocked.
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      },
    );

    // Safety net: if INITIAL_SESSION never fires (no stored token, SSR mismatch),
    // unblock loading quickly so the UI is never stuck.
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 800);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [supabase, fetchProfile]);

  /* ---------- auth actions ------------------------------------------- */

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName?: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const signInWithOAuth = async (provider: "google" | "apple" | "github") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  /* ---------- render ------------------------------------------------- */

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithOAuth,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
