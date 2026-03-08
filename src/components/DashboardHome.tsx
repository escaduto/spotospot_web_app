"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { createClient } from "@/src/supabase/client";
import type { ItineraryDay } from "@/src/supabase/types";
import type {
  TripWithDayPlans,
  TripDayPlanSummary,
} from "./user_home/TripCard";
import TripCard from "./user_home/TripCard";
import ItineraryCard from "./user_home/ItineraryCard";
import PublicPlanCard from "./user_home/PublicPlanCard";
import {
  EmptyPrivateTrips,
  EmptyPublicTrips,
  EmptyTrips,
} from "./user_home/EmptyTrips";
import PendingTripInvites from "./user_home/PendingTripInvites";
import type { PendingInvite } from "./user_home/PendingTripInvites";
import TripCalendarView from "./user_home/TripCalendarView";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import AirplaneTicketIcon from "@mui/icons-material/AirplaneTicket";
import PublicIcon from "@mui/icons-material/Public";
import EditNoteIcon from "@mui/icons-material/EditNote";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import Link from "next/link";

const PAGE_SIZE = 12;
const FETCH_LIMIT = 50;

// ── Skeletons ─────────────────────────────────────────────────────────────────

function TripCardSkeleton() {
  return (
    <Skeleton
      variant="rounded"
      height={220}
      sx={{ borderRadius: 3, flexShrink: 0, width: "100%" }}
    />
  );
}

function PlanGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          sx={{ borderRadius: 2, aspectRatio: "1/1", width: "100%" }}
        />
      ))}
    </div>
  );
}

function DraftListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={72}
          sx={{ borderRadius: 2 }}
        />
      ))}
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
      style={{ borderColor: color + "40", background: color + "12", color }}
    >
      {icon}
      <span className="font-bold">{value}</span>
      <span className="font-medium opacity-70">{label}</span>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
  chipColor,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  chipColor?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex items-center text-gray-500">{icon}</span>
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      {typeof count === "number" && count > 0 && (
        <Chip
          label={count}
          size="small"
          sx={{
            height: 17,
            fontSize: "0.6rem",
            fontWeight: 700,
            bgcolor: chipColor ?? "#e5e7eb",
            color: "#374151",
          }}
        />
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const { user, profile } = useAuth();

  const [trips, setTrips] = useState<TripWithDayPlans[]>([]);
  const [publicPlans, setPublicPlans] = useState<ItineraryDay[]>([]);
  const [privatePlans, setPrivatePlans] = useState<ItineraryDay[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvite[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const [visiblePublic, setVisiblePublic] = useState(PAGE_SIZE);

  const [plansExpanded, setPlansExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    (async () => {
      type DashboardTrip = TripWithDayPlans & {
        owner_id: string;
        collaborator_role: "viewer" | "editor" | "admin";
        day_plans?: TripDayPlanSummary[];
      };
      type DashboardResult = {
        trips: DashboardTrip[];
        pending_invitations: unknown[];
        public_plans: ItineraryDay[];
        private_plans: ItineraryDay[];
      };

      const { data, error } = await supabase
        .rpc("get_dashboard", {
          p_trip_statuses: ["active", "planning"],
          p_plans_limit: FETCH_LIMIT,
        })
        .single();

      if (error) {
        console.error("get_dashboard error:", error);
        setLoading(false);
        return;
      }

      const result = data as DashboardResult;

      setTrips(
        (result.trips ?? []).map((t) => ({
          ...t,
          collaborator_role: t.collaborator_role ?? "viewer",
          day_plans: t.day_plans ?? [],
        })),
      );

      console.log("Dashboard data:", result);
      setPublicPlans(result.public_plans ?? []);
      setPrivatePlans(result.private_plans ?? []);
      setPendingInvitations(result.pending_invitations as PendingInvite[]);
      setLoading(false);
    })();
  }, [user]);

  // Upcoming trips = end_date >= today, sorted by start_date asc, first 4
  const upcomingTrips = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return trips
      .filter((t) => t.end_date && t.end_date >= todayStr)
      .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""))
      .slice(0, 4);
  }, [trips]);

  // Public plans grouped by city
  const plansByCity = useMemo(() => {
    const shown = plansExpanded
      ? publicPlans
      : publicPlans.slice(0, visiblePublic);
    const groups = new Map<string, ItineraryDay[]>();
    for (const plan of shown) {
      const city = plan.city?.trim() || "Other";
      if (!groups.has(city)) groups.set(city, []);
      groups.get(city)!.push(plan);
    }
    return Array.from(groups.entries());
  }, [publicPlans, visiblePublic, plansExpanded]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Welcome header ── */}
        <div className="mb-5 pt-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                {greeting()},{" "}
                <span className="bg-linear-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
                  {profile?.full_name ||
                    user?.email?.split("@")[0] ||
                    "Traveler"}
                </span>
              </h1>
              {/* Stats row */}
              {!loading && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <StatPill
                    icon={<AirplaneTicketIcon sx={{ fontSize: 13 }} />}
                    label="trips"
                    value={trips.length}
                    color="#0891b2"
                  />
                  <StatPill
                    icon={<FlightTakeoffIcon sx={{ fontSize: 13 }} />}
                    label="upcoming"
                    value={upcomingTrips.length}
                    color="#059669"
                  />
                  <StatPill
                    icon={<PublicIcon sx={{ fontSize: 13 }} />}
                    label="public plans"
                    value={publicPlans.length}
                    color="#7c3aed"
                  />
                  <StatPill
                    icon={<EditNoteIcon sx={{ fontSize: 13 }} />}
                    label="drafts"
                    value={privatePlans.length}
                    color="#d97706"
                  />
                </div>
              )}
            </div>
            <a
              href="/create_new_plan"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-sm transition whitespace-nowrap shrink-0"
            >
              <AddIcon sx={{ fontSize: 16 }} />
              New Plan
            </a>
          </div>
        </div>

        {/* ── Pending Trip Invites ── */}
        <PendingTripInvites initialInvites={pendingInvitations} />

        {/* ── Upcoming Trips (featured horizontal scroll) ── */}
        {(loading || upcomingTrips.length > 0) && (
          <section className="mb-6">
            <SectionHeader
              icon={<FlightTakeoffIcon sx={{ fontSize: 15 }} />}
              title="Upcoming"
              count={upcomingTrips.length}
              chipColor="#d1fae5"
            />
            {loading ? (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <TripCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {upcomingTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── All Trips + Timeline ── */}
        <section className="mb-6">
          <SectionHeader
            icon={<CalendarMonthIcon sx={{ fontSize: 15 }} />}
            title="Timeline"
            count={trips.length}
            chipColor="#cffafe"
            action={
              trips.length > 0 && !loading ? (
                <Link
                  href="/trip"
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  All trips →
                </Link>
              ) : null
            }
          />

          {loading ? (
            <Skeleton variant="rounded" height={140} sx={{ borderRadius: 2 }} />
          ) : trips.length === 0 ? (
            <EmptyTrips />
          ) : (
            <TripCalendarView
              trips={trips}
              pendingInvites={pendingInvitations}
            />
          )}
        </section>

        {/* ── Two-column: Public Plans + Drafts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left: Public Day Plans (wider) ── */}
          <section className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <SectionHeader
                icon={<PublicIcon sx={{ fontSize: 15 }} />}
                title="Public Day Plans"
                count={publicPlans.length}
                chipColor="#d1fae5"
                action={
                  publicPlans.length > 0 && !loading ? (
                    <a
                      href="/discover"
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Discover more →
                    </a>
                  ) : null
                }
              />
              <p className="text-xs text-gray-400 -mt-1 mb-3">
                Published plans anyone can use.
              </p>

              {loading ? (
                <PlanGridSkeleton count={6} />
              ) : publicPlans.length === 0 ? (
                <EmptyPublicTrips />
              ) : (
                <>
                  {plansByCity.map(([city, plans]) => (
                    <div key={city} className="mb-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        📍 {city}
                        <span className="font-normal normal-case text-gray-300">
                          ({plans.length})
                        </span>
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {plans.map((plan) => (
                          <PublicPlanCard key={plan.id} plan={plan} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {!plansExpanded && visiblePublic < publicPlans.length && (
                    <button
                      onClick={() => {
                        if (visiblePublic + PAGE_SIZE >= publicPlans.length) {
                          setPlansExpanded(true);
                        } else {
                          setVisiblePublic((v) => v + PAGE_SIZE);
                        }
                      }}
                      className="w-full mt-2 py-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center justify-center gap-1 border border-dashed border-emerald-200 rounded-xl hover:border-emerald-400 transition"
                    >
                      <KeyboardArrowDownIcon sx={{ fontSize: 15 }} />
                      Show more ({publicPlans.length - visiblePublic} remaining)
                    </button>
                  )}
                  {plansExpanded && (
                    <button
                      onClick={() => {
                        setPlansExpanded(false);
                        setVisiblePublic(PAGE_SIZE);
                      }}
                      className="w-full mt-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center justify-center gap-1"
                    >
                      <KeyboardArrowUpIcon sx={{ fontSize: 15 }} />
                      Show less
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {/* ── Right: Draft Day Plans (narrower) ── */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4">
              <SectionHeader
                icon={<EditNoteIcon sx={{ fontSize: 15 }} />}
                title="My Drafts"
                count={privatePlans.length}
                chipColor="#fef3c7"
                action={
                  <a
                    href="/create_new_plan"
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5"
                  >
                    <AddIcon sx={{ fontSize: 13 }} />
                    New
                  </a>
                }
              />
              <p className="text-xs text-gray-400 -mt-1 mb-3">
                Private until you publish.
              </p>

              {loading ? (
                <DraftListSkeleton count={3} />
              ) : privatePlans.length === 0 ? (
                <EmptyPrivateTrips />
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {privatePlans.slice(0, 3).map((plan) => (
                      <ItineraryCard key={plan.id} trip={plan} />
                    ))}
                  </div>
                  {privatePlans.length > 3 && (
                    <Link
                      href="/day/drafts"
                      className="w-full mt-2 py-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center justify-center gap-1 border border-dashed border-amber-200 rounded-xl hover:border-amber-400 transition"
                    >
                      View all {privatePlans.length} drafts
                      <ArrowForwardIcon sx={{ fontSize: 13 }} />
                    </Link>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
