"use client";

import { useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import AuthModal from "./AuthModal";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import Avatar from "./avatar/Avatar";
import { defaultAvatarConfig } from "./avatar/avatarTypes";

export default function Navbar() {
  const { user, profile, loading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Show app-focused nav links on interior app pages
  const isAppPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/trip") ||
    pathname.startsWith("/day") ||
    pathname.startsWith("/discover") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/create_new_plan") ||
    pathname.startsWith("/creating");

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
            {isAppPage ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition ${pathname === "/dashboard" ? "text-teal-600" : "text-gray-600 hover:text-gray-900"}`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/trip"
                  className={`text-sm font-medium transition ${pathname.startsWith("/trip") ? "text-teal-600" : "text-gray-600 hover:text-gray-900"}`}
                >
                  My Trips
                </Link>
                <Link
                  href="/discover"
                  className={`text-sm font-medium transition ${pathname.startsWith("/discover") ? "text-teal-600" : "text-gray-600 hover:text-gray-900"}`}
                >
                  Discover
                </Link>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Create new plan */}
            {!loading && user && (
              <Tooltip title="Create new plan" arrow>
                <IconButton
                  component={Link}
                  href="/create_new_plan"
                  size="small"
                  sx={{
                    background: "linear-gradient(135deg, #0d9488, #06b6d4)",
                    color: "#fff",
                    width: 32,
                    height: 32,
                    "&:hover": {
                      filter: "brightness(1.12)",
                      background: "linear-gradient(135deg, #0d9488, #06b6d4)",
                    },
                  }}
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}

            {loading ? (
              <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-200" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-full bg-gray-100 py-1 pl-1 pr-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                >
                  <div className="rounded-full overflow-hidden w-8 h-8">
                    <Avatar
                      config={profile?.avatar_config ?? defaultAvatarConfig}
                      size={32}
                    />
                  </div>
                  <span className="hidden sm:inline">
                    {profile?.full_name || user.email?.split("@")[0]}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white shadow-xl border border-gray-100 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-full overflow-hidden">
                          <Avatar
                            config={
                              profile?.avatar_config ?? defaultAvatarConfig
                            }
                            size={36}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {profile?.full_name || user.email?.split("@")[0]}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      ⚙️ Settings
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      🏠 Dashboard
                    </Link>
                    <Link
                      href="/trip"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      🗺️ My Trips
                    </Link>
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
