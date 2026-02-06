"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/src/supabase/client";
import type { Trip } from "@/src/supabase/types";

/* ------------------------------------------------------------------ */
/*  Featured public trip card                                          */
/* ------------------------------------------------------------------ */

function TripCard({ trip }: { trip: Trip }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all duration-300">
      {/* Cover image placeholder */}
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-teal-100 to-cyan-50">
        {trip.cover_image_url ? (
          <Image
            src={trip.cover_image_url}
            alt={trip.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl opacity-60">
            🗺️
          </div>
        )}
        {trip.location && (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
            📍 {trip.location}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-base font-semibold text-gray-900 line-clamp-1 group-hover:text-teal-600 transition">
          {trip.title}
        </h3>
        {trip.description && (
          <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">
            {trip.description}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {trip.start_date
              ? new Date(trip.start_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "Flexible dates"}
          </span>
          <span className="text-xs font-medium text-teal-600 group-hover:underline">
            View Plan →
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Marketing Home                                                     */
/* ------------------------------------------------------------------ */

interface MarketingHomeProps {
  onOpenAuth: () => void;
}

export default function MarketingHome({ onOpenAuth }: MarketingHomeProps) {
  const [publicTrips, setPublicTrips] = useState<Trip[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("trips")
      .select("*")
      .eq("is_public", true)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setPublicTrips(data as Trip[]);
      });
  }, []);

  const features = [
    {
      icon: "🌍",
      title: "Discover Public Trips",
      desc: "Browse community-curated day trip plans for any location around the world. Get inspired by real travelers.",
    },
    {
      icon: "🤖",
      title: "AI-Powered Planning",
      desc: "Let OpenAI suggest the best spots, restaurants, and activities for your destination. Smart itineraries in seconds.",
    },
    {
      icon: "✏️",
      title: "Draft & Refine",
      desc: "Create itinerary drafts, edit day-by-day plans, and perfect every detail before activating your trip.",
    },
    {
      icon: "👥",
      title: "Collaborate with Travelers",
      desc: "Invite friends, co-edit plans in real time, share documents, and make decisions together.",
    },
    {
      icon: "🗺️",
      title: "Interactive Maps",
      desc: "See all your spots pinned on an interactive map. Navigate between locations with ease.",
    },
    {
      icon: "💬",
      title: "Built-in Trip Chat",
      desc: "Coordinate with your travel group using built-in messaging. No more switching between apps.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Discover or Create",
      desc: "Browse public trip plans or generate AI-powered suggestions for your dream destination.",
      icon: "🔍",
    },
    {
      num: "02",
      title: "Draft & Customize",
      desc: "Edit your itinerary day by day. Add spots, set times, attach notes, and refine until perfect.",
      icon: "📝",
    },
    {
      num: "03",
      title: "Activate & Invite",
      desc: "Turn your draft into a live trip. Invite travelers and start collaborating together.",
      icon: "🚀",
    },
    {
      num: "04",
      title: "Explore Together",
      desc: "Chat, view the map, share documents, and navigate your trip — all in one place.",
      icon: "🎉",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Background decorations */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-teal-100/60 to-cyan-50/80 blur-3xl" />
          <div className="absolute -bottom-20 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-orange-50/60 to-amber-50/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
            </span>
            Now in Beta — Join thousands of travelers
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Plan Your Perfect Trip,{" "}
            <span className="bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
              Spot by Spot
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl">
            Discover curated day-trip plans, create AI-powered itineraries,
            collaborate with fellow travelers, and explore the world together —
            all in one beautifully simple app.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={onOpenAuth}
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-200/50 hover:shadow-xl hover:shadow-teal-200/60 hover:brightness-110 transition-all"
            >
              Start Planning — It&apos;s Free
              <svg
                className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </button>
            <a
              href="#discover"
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
            >
              Explore Public Trips
            </a>
          </div>

          {/* Hero visual */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-2xl shadow-gray-200/50">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-300" />
                  <div className="h-3 w-3 rounded-full bg-yellow-300" />
                  <div className="h-3 w-3 rounded-full bg-green-300" />
                </div>
                <div className="mx-auto rounded-md bg-white px-12 py-1 text-xs text-gray-400 border border-gray-100">
                  spotospot.app/trips
                </div>
              </div>
              <div className="grid grid-cols-12 divide-x divide-gray-100">
                {/* Sidebar */}
                <div className="col-span-3 hidden sm:block p-4 space-y-3 bg-gray-50/50 min-h-[280px]">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Your Trips
                  </div>
                  {["🏖️ Bali 5-Day", "🗼 Tokyo Weekend", "🏔️ Swiss Alps"].map(
                    (t, i) => (
                      <div
                        key={t}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          i === 0
                            ? "bg-teal-50 text-teal-700 font-medium"
                            : "text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {t}
                      </div>
                    ),
                  )}
                  <div className="mt-4 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400 text-center">
                    + New Trip
                  </div>
                </div>
                {/* Main */}
                <div className="col-span-12 sm:col-span-6 p-5 min-h-[280px]">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🏖️</span>
                    <h3 className="font-semibold text-gray-800">
                      Bali 5-Day Adventure
                    </h3>
                    <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                      Active
                    </span>
                  </div>
                  {[
                    {
                      day: "Day 1",
                      items: [
                        "Ubud Monkey Forest",
                        "Tegallalang Rice Terraces",
                        "Dinner at Locavore",
                      ],
                    },
                    {
                      day: "Day 2",
                      items: [
                        "Mount Batur Sunrise",
                        "Tirta Empul Temple",
                        "Kintamani Lunch",
                      ],
                    },
                  ].map((d) => (
                    <div key={d.day} className="mb-3">
                      <div className="text-xs font-semibold text-teal-600 mb-1">
                        {d.day}
                      </div>
                      {d.items.map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 mb-1 text-xs text-gray-600"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                          {item}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {/* Map / Chat */}
                <div className="col-span-3 hidden sm:block bg-gradient-to-br from-teal-50 to-cyan-50 relative min-h-[280px]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl mb-2">🗺️</div>
                      <div className="text-xs text-gray-400">
                        Interactive Map
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-sm border-t border-gray-100 p-3">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                      Trip Chat
                    </div>
                    <div className="rounded-lg bg-teal-50 px-2 py-1 text-[11px] text-teal-700 mb-1">
                      Can&apos;t wait for the sunrise trek! 🌅
                    </div>
                    <div className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] text-gray-600">
                      Same! Don&apos;t forget hiking boots 🥾
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURES                                                    */}
      {/* ============================================================ */}
      <section id="features" className="py-24 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">
              Everything You Need
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Trip Planning, Reimagined
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-lg text-gray-500">
              From discovery to departure, SpotoSpot brings every part of trip
              planning into one collaborative workspace.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm hover:shadow-lg hover:border-teal-100 transition-all duration-300"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-2xl group-hover:scale-110 transition-transform">
                  {f.icon}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                */}
      {/* ============================================================ */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">
              Simple & Powerful
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              How SpotoSpot Works
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.num} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 text-3xl shadow-sm">
                  {s.icon}
                </div>
                <span className="mt-4 block text-xs font-bold text-teal-500 uppercase tracking-widest">
                  Step {s.num}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  DISCOVER PUBLIC TRIPS                                       */}
      {/* ============================================================ */}
      <section id="discover" className="py-24 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">
              Community Trips
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Discover Amazing Trip Plans
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-lg text-gray-500">
              Explore curated itineraries shared by the SpotoSpot community.
              Find inspiration for your next adventure.
            </p>
          </div>

          {publicTrips.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {publicTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          ) : (
            /* Placeholder cards when no public trips exist yet */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Weekend in Kyoto",
                  location: "Kyoto, Japan",
                  desc: "Temples, bamboo groves, tea houses, and the best ramen — a 3-day cultural immersion.",
                  emoji: "⛩️",
                },
                {
                  title: "Amalfi Coast Road Trip",
                  location: "Amalfi, Italy",
                  desc: "Winding coastal roads, lemon groves, colorful villages, and unforgettable sunsets.",
                  emoji: "🍋",
                },
                {
                  title: "NYC Food Crawl",
                  location: "New York, USA",
                  desc: "The ultimate food tour spanning Chinatown, Little Italy, Williamsburg, and Harlem.",
                  emoji: "🍕",
                },
                {
                  title: "Patagonia Trek",
                  location: "Torres del Paine, Chile",
                  desc: "5 days through glaciers, turquoise lakes, and towering granite peaks.",
                  emoji: "🏔️",
                },
                {
                  title: "Marrakech Medina",
                  location: "Marrakech, Morocco",
                  desc: "Souks, riads, Atlas mountain day trips, and Jemaa el-Fnaa street food.",
                  emoji: "🕌",
                },
                {
                  title: "Bali Wellness Retreat",
                  location: "Ubud, Bali",
                  desc: "Yoga, rice terraces, waterfalls, and sunset temples — a week of bliss.",
                  emoji: "🧘",
                },
              ].map((p) => (
                <div
                  key={p.title}
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={onOpenAuth}
                >
                  <div className="relative h-44 bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center">
                    <span className="text-5xl opacity-70 group-hover:scale-110 transition-transform">
                      {p.emoji}
                    </span>
                    <span className="absolute bottom-3 left-3 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
                      📍 {p.location}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-teal-600 transition">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">
                      {p.desc}
                    </p>
                    <div className="mt-4 text-xs font-medium text-teal-600 group-hover:underline">
                      View Plan →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <button
              onClick={onOpenAuth}
              className="rounded-full border border-gray-200 bg-white px-8 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
            >
              Browse All Trips →
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  MOBILE APP CTA                                              */}
      {/* ============================================================ */}
      <section id="mobile" className="py-24 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 sm:p-16 overflow-hidden">
            {/* Decorations */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative grid items-center gap-12 lg:grid-cols-2">
              {/* Text */}
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-4 py-1.5 text-sm font-medium text-teal-400">
                  📱 Mobile App
                </span>
                <h2 className="mt-6 text-3xl font-extrabold text-white sm:text-4xl">
                  Take SpotoSpot{" "}
                  <span className="text-teal-400">Everywhere</span>
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-gray-400">
                  Access your trips on the go. Navigate with interactive maps,
                  chat with your travel group, and check off spots in real time
                  — all from your pocket.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Offline access to your itineraries",
                    "Turn-by-turn navigation to spots",
                    "Push notifications for trip updates",
                    "Camera integration for travel memories",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-gray-300"
                    >
                      <svg
                        className="h-5 w-5 flex-shrink-0 text-teal-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href="#"
                    className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-gray-900 hover:bg-gray-100 transition shadow-lg"
                  >
                    <svg
                      className="h-7 w-7"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    <div className="leading-tight">
                      <div className="text-[10px] opacity-60">
                        Download on the
                      </div>
                      <div className="text-sm font-semibold">App Store</div>
                    </div>
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-gray-900 hover:bg-gray-100 transition shadow-lg"
                  >
                    <svg
                      className="h-7 w-7"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.29 12l2.408-2.492zM5.864 2.658L16.8 8.99l-2.302 2.303L5.864 2.658z" />
                    </svg>
                    <div className="leading-tight">
                      <div className="text-[10px] opacity-60">Get it on</div>
                      <div className="text-sm font-semibold">Google Play</div>
                    </div>
                  </a>
                </div>
              </div>

              {/* Phone mockup */}
              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="relative w-[260px] rounded-[2.5rem] border-[8px] border-gray-700 bg-gray-900 p-1 shadow-2xl">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-28 rounded-b-2xl bg-gray-700 z-10" />
                    {/* Screen */}
                    <div className="overflow-hidden rounded-[2rem] bg-white">
                      <div className="bg-gradient-to-b from-teal-500 to-cyan-500 px-4 pt-10 pb-4">
                        <p className="text-white text-xs opacity-80">
                          Good morning, Erica ☀️
                        </p>
                        <h3 className="text-white text-base font-bold mt-0.5">
                          Your Trips
                        </h3>
                      </div>
                      <div className="p-3 space-y-2.5">
                        {[
                          {
                            name: "Bali Adventure",
                            date: "Mar 15-20",
                            emoji: "🏖️",
                            status: "Active",
                          },
                          {
                            name: "Tokyo Weekend",
                            date: "Apr 5-7",
                            emoji: "🗼",
                            status: "Draft",
                          },
                          {
                            name: "Swiss Alps",
                            date: "Jun 1-8",
                            emoji: "🏔️",
                            status: "Planning",
                          },
                        ].map((t) => (
                          <div
                            key={t.name}
                            className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5"
                          >
                            <span className="text-xl">{t.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-gray-800 truncate">
                                {t.name}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {t.date}
                              </div>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                t.status === "Active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                        ))}
                        <div className="rounded-xl border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400">
                          + Plan a New Trip
                        </div>
                      </div>
                      {/* Bottom nav */}
                      <div className="flex justify-around border-t border-gray-100 py-2">
                        {["🏠", "🔍", "➕", "🗺️", "👤"].map((icon, i) => (
                          <span
                            key={i}
                            className={`text-lg ${
                              i === 0 ? "opacity-100" : "opacity-40"
                            }`}
                          >
                            {icon}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Glow */}
                  <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-gradient-to-br from-teal-400/20 to-cyan-400/20 blur-2xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FINAL CTA                                                   */}
      {/* ============================================================ */}
      <section className="py-24 bg-gray-50/50">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Ready to Start Planning?
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Join the SpotoSpot community and turn your dream trips into reality.
            It&apos;s free to get started.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={onOpenAuth}
              className="rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-10 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-200/50 hover:shadow-xl hover:brightness-110 transition-all"
            >
              Create Your Free Account
            </button>
            <a
              href="#mobile"
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
            >
              <span>📱</span> Or download the mobile app
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
