"use client";

import { useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import AuthModal from "./AuthModal";
import Link from "next/link";

export default function Navbar() {
  const { user, profile, loading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📍</span>
            <span className="text-xl font-bold tracking-tight bg-linear-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
              SpotoSpot
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              How It Works
            </a>
            <Link
              href="/discover"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              Discover
            </Link>
            <a
              href="#mobile"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              Mobile App
            </a>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-200" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-full bg-gray-100 py-1.5 pl-2 pr-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-cyan-500 text-xs font-bold text-white">
                    {(
                      profile?.full_name?.[0] ||
                      user.email?.[0] ||
                      "U"
                    ).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">
                    {profile?.full_name || user.email?.split("@")[0]}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-xl border border-gray-100 py-1 z-50">
                    <a
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Dashboard
                    </a>
                    <a
                      href="/trips"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      My Trips
                    </a>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={() => {
                        signOut();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                >
                  Log In
                </button>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="rounded-full bg-linear-to-r from-teal-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:brightness-110 transition"
                >
                  Get Started
                </button>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden ml-2 text-gray-600"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
