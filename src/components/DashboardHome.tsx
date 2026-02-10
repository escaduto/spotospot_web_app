"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/src/hooks/useAuth";
import { createClient } from "@/src/supabase/client";
import type { Trip } from "@/src/supabase/types";

export default function DashboardHome() {
  const { user, profile } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    supabase
      .from("trips")
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        if (data) setTrips(data as Trip[]);
        setLoading(false);
      });
  }, [user]);

  const drafts = trips.filter((t) => t.status === "planning");
  const active = trips.filter((t) => t.status === "active");
  const completed = trips.filter((t) => t.status === "completed");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Welcome header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {greeting()},{" "}
            <span className="bg-linear-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
              {profile?.full_name || user?.email?.split("@")[0] || "Traveler"}
            </span>{" "}
            ✈️
          </h1>
          <p className="mt-1 text-gray-500">
            Here&apos;s what&apos;s happening with your trips.
          </p>
        </div>

        {/* Quick stats */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Drafts",
              count: drafts.length,
              icon: "📝",
              color: "from-amber-50 to-orange-50 border-amber-100",
            },
            {
              label: "Active Trips",
              count: active.length,
              icon: "🚀",
              color: "from-green-50 to-emerald-50 border-green-100",
            },
            {
              label: "Completed",
              count: completed.length,
              icon: "✅",
              color: "from-blue-50 to-indigo-50 border-blue-100",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl border bg-linear-to-br ${s.color} p-5`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-2xl font-bold text-gray-900">
                  {loading ? "–" : s.count}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-600">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mb-10 flex flex-wrap gap-3">
          <a
            href="/trips/new"
            className="flex items-center gap-2 rounded-full bg-linear-to-r from-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:brightness-110 transition"
          >
            ✨ Create New Trip
          </a>
          <a
            href="/trips/new?ai=true"
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:border-gray-300 hover:shadow-md transition"
          >
            🤖 AI Trip Planner
          </a>
          <a
            href="/discover"
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:border-gray-300 hover:shadow-md transition"
          >
            🌍 Discover Trips
          </a>
        </div>

        {/* Trip list */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Your Trips
          </h2>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-2xl bg-gray-200"
                />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
              <span className="text-4xl">🗺️</span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No trips yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Start planning your first adventure!
              </p>
              <a
                href="/trips/new"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-linear-to-r from-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition"
              >
                ✨ Create Your First Trip
              </a>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <a
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="relative h-32 bg-linear-to-br from-teal-50 to-cyan-50">
                    {trip.image_url ? (
                      <Image
                        width={768}
                        height={384}
                        src={trip.image_url}
                        blurDataURL={
                          trip.image_blurhash
                            ? `data:image/jpeg;base64,${trip.image_blurhash}`
                            : undefined
                        }
                        alt={trip.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl opacity-50">
                        🗺️
                      </div>
                    )}
                    <span
                      className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        trip.status === "active"
                          ? "bg-green-100 text-green-700"
                          : trip.status === "planning"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {trip.status}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition">
                      {trip.title}
                    </h3>
                    {trip.destination && (
                      <p className="mt-1 text-xs text-gray-400">
                        📍 {trip.destination}
                      </p>
                    )}
                    {trip.start_date && (
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(trip.start_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {trip.end_date &&
                          ` – ${new Date(trip.end_date).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )}`}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
