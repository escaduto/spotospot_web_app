"use client";

import { useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import Navbar from "@/src/components/Navbar";
import Footer from "@/src/components/Footer";
import MarketingHome from "@/src/components/MarketingHome";
import DashboardHome from "@/src/components/DashboardHome";
import AuthModal from "@/src/components/AuthModal";

export default function Home() {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  /* Full-screen loader while we check the session */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <span className="text-4xl animate-bounce">📍</span>
          <p className="text-sm text-gray-400 animate-pulse">
            Loading SpotoSpot…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {user ? (
        <DashboardHome />
      ) : (
        <MarketingHome onOpenAuth={() => setAuthOpen(true)} />
      )}
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
