"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { createClient } from "@/src/supabase/client";
import type { ItineraryDay } from "@/src/supabase/types";
import type {
  TripWithDayPlans,
  TripDayPlanSummary,
} from "./user_home/TripCard";
import ItineraryCard from "./user_home/ItineraryCard";
import PublicPlanCard from "./user_home/PublicPlanCard";
import {
  EmptyPrivateTrips,
  EmptyPublicTrips,
  EmptyTrips,
} from "./user_home/EmptyTrips";
import TripCard from "./user_home/TripCard";
import Skeleton from "@mui/material/Skeleton";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import AirplaneTicketIcon from "@mui/icons-material/AirplaneTicket";
import PublicIcon from "@mui/icons-material/Public";
import EditNoteIcon from "@mui/icons-material/EditNote";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const PAGE_SIZE = 6;
const FETCH_LIMIT = 50;

function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={200}
          sx={{ borderRadius: 3 }}
        />
      ))}
    </div>
  );
}

function CompactListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={68}
          sx={{ borderRadius: 2 }}
        />
      ))}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
  chipColor,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  chipColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="flex items-center">{icon}</span>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {typeof count === "number" && count > 0 && (
        <Chip
          label={count}
          size="small"
          sx={{
            height: 18,
            fontSize: "0.65rem",
            fontWeight: 700,
            bgcolor: chipColor ?? "#e5e7eb",
            color: "#374151",
          }}
        />
      )}
    </div>
  );
}

export default function DashboardHome() {
  const { user, profile } = useAuth();

  const [trips, setTrips] = useState<TripWithDayPlans[]>([]);
  const [publicPlans, setPublicPlans] = useState<ItineraryDay[]>([]);
  const [privatePlans, setPrivatePlans] = useState<ItineraryDay[]>([]);

  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [loadingPrivate, setLoadingPrivate] = useState(true);

  const [visiblePublic, setVisiblePublic] = useState(PAGE_SIZE);
  const [visiblePrivate, setVisiblePrivate] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    // Active + planning trips with their day plans
    supabase
      .from("trips")
      .select(
        "id, title, destination, image_url, image_blurhash, start_date, end_date, visibility, status",
      )
      .eq("owner_id", user.id)
      .in("status", ["active", "planning"])
      .order("start_date", { ascending: true })
      .then(
        async ({ data: tripsData }: { data: TripWithDayPlans[] | null }) => {
          if (!tripsData?.length) {
            setLoadingTrips(false);
            return;
          }
          const tripIds = tripsData.map((t: TripWithDayPlans) => t.id);
          const { data: dayPlansData } = await supabase
            .from("itinerary_days")
            .select("id, title, date, city, trip_id")
            .in("trip_id", tripIds)
            .order("date", { ascending: true });

          const plansByTrip: Record<string, TripDayPlanSummary[]> = {};
          (dayPlansData ?? []).forEach(
            (dp: TripDayPlanSummary & { trip_id: string }) => {
              const tid = dp.trip_id;
              if (!plansByTrip[tid]) plansByTrip[tid] = [];
              plansByTrip[tid].push(dp);
            },
          );

          setTrips(
            tripsData.map((t: TripWithDayPlans) => ({
              ...t,
              day_plans: plansByTrip[t.id] ?? [],
            })),
          );
          setLoadingTrips(false);
        },
      );

    // Public day plans
    supabase
      .from("itinerary_days")
      .select(
        "id, visibility, title, city, image_url, image_blurhash, date, category_type",
      )
      .eq("created_by", user.id)
      .eq("visibility", "public")
      .order("updated_at", { ascending: false })
      .limit(FETCH_LIMIT)
      .then(({ data }: { data: ItineraryDay[] | null }) => {
        if (data) setPublicPlans(data);
        setLoadingPublic(false);
      });

    // Private draft day plans
    supabase
      .from("itinerary_days")
      .select("id, visibility, title, city, image_url, image_blurhash, date")
      .eq("created_by", user.id)
      .eq("visibility", "private")
      .order("updated_at", { ascending: false })
      .limit(FETCH_LIMIT)
      .then(({ data }: { data: ItineraryDay[] | null }) => {
        if (data) setPrivatePlans(data);
        setLoadingPrivate(false);
      });
  }, [user]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {greeting()},{" "}
            <span className="bg-linear-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
              {profile?.full_name || user?.email?.split("@")[0] || "Traveler"}
            </span>{" "}
            ✈️
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s what&apos;s happening with your trips.
          </p>
        </div>

        {/* ── Section 1: Active Trips ── */}
        <SectionHeader
          icon={<AirplaneTicketIcon sx={{ fontSize: 18, color: "#0891b2" }} />}
          title="Your Trips"
          count={trips.length}
          chipColor="#cffafe"
        />

        {loadingTrips ? (
          <CardGridSkeleton count={3} />
        ) : trips.length === 0 ? (
          <EmptyTrips />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}

        {/* ── Section 2: Public Plans ── */}
        <Divider sx={{ my: 4 }} />

        <SectionHeader
          icon={<PublicIcon sx={{ fontSize: 18, color: "#059669" }} />}
          title="Public Day Plans"
          count={publicPlans.length}
          chipColor="#d1fae5"
        />
        <p className="text-xs text-gray-400 -mt-2 mb-4">
          Published plans anyone can discover and add to their trip.
        </p>

        {loadingPublic ? (
          <CompactListSkeleton count={4} />
        ) : publicPlans.length === 0 ? (
          <EmptyPublicTrips />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {publicPlans.slice(0, visiblePublic).map((plan) => (
                <PublicPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
            {visiblePublic < publicPlans.length && (
              <div className="mt-4 text-center">
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<KeyboardArrowDownIcon />}
                  onClick={() => setVisiblePublic((v) => v + PAGE_SIZE)}
                  sx={{
                    borderRadius: 9999,
                    textTransform: "none",
                    borderColor: "#a7f3d0",
                    color: "#059669",
                    "&:hover": { borderColor: "#059669", bgcolor: "#f0fdf4" },
                  }}
                >
                  Show more ({publicPlans.length - visiblePublic} remaining)
                </Button>
              </div>
            )}
          </>
        )}

        {/* ── Section 3: Private Drafts ── */}
        <Divider sx={{ my: 4 }} />

        <SectionHeader
          icon={<EditNoteIcon sx={{ fontSize: 18, color: "#d97706" }} />}
          title="Draft Day Plans"
          count={privatePlans.length}
          chipColor="#fef3c7"
        />
        <p className="text-xs text-gray-400 -mt-2 mb-4">
          Private drafts — only visible to you until published.
        </p>

        {loadingPrivate ? (
          <CardGridSkeleton count={3} />
        ) : privatePlans.length === 0 ? (
          <EmptyPrivateTrips />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {privatePlans.slice(0, visiblePrivate).map((plan) => (
                <ItineraryCard key={plan.id} trip={plan} />
              ))}
            </div>
            {visiblePrivate < privatePlans.length && (
              <div className="mt-4 text-center">
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<KeyboardArrowDownIcon />}
                  onClick={() => setVisiblePrivate((v) => v + PAGE_SIZE)}
                  sx={{
                    borderRadius: 9999,
                    textTransform: "none",
                    borderColor: "#fde68a",
                    color: "#d97706",
                    "&:hover": { borderColor: "#d97706", bgcolor: "#fffbeb" },
                  }}
                >
                  Show more ({privatePlans.length - visiblePrivate} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
