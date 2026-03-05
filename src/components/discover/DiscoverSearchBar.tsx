"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  searchPublicPlanNames,
  searchTopDestinationNames,
} from "@/src/supabase/itineraries";
import SearchIcon from "@mui/icons-material/Search";
import MapIcon from "@mui/icons-material/Map";
import ExploreIcon from "@mui/icons-material/Explore";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from "@mui/material/CircularProgress";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlanResult {
  kind: "plan";
  id: string;
  title: string;
  city: string | null;
  country: string | null;
}

interface DestResult {
  kind: "destination";
  id: string;
  label: string;
  destination_value: string;
  rep_point: string | null;
  bbox: number[] | null;
}

interface Props {
  onSelectPlan: (plan: PlanResult) => void;
  onSelectDestination: (dest: DestResult) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DiscoverSearchBar({
  onSelectPlan,
  onSelectDestination,
}: Props) {
  const [query, setQuery] = useState("");
  const [plans, setPlans] = useState<PlanResult[]>([]);
  const [destinations, setDestinations] = useState<DestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setPlans([]);
      setDestinations([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [planRows, destRows] = await Promise.all([
      searchPublicPlanNames(q, 6),
      searchTopDestinationNames(q, 5),
    ]);
    setPlans(planRows.map((r) => ({ kind: "plan" as const, ...r })));
    setDestinations(
      destRows.map((r) => ({ kind: "destination" as const, ...r })),
    );
    setIsOpen(planRows.length > 0 || destRows.length > 0);
    setLoading(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const clear = () => {
    setQuery("");
    setPlans([]);
    setDestinations([]);
    setIsOpen(false);
  };

  const handleSelectPlan = (plan: PlanResult) => {
    onSelectPlan(plan);
    clear();
  };

  const handleSelectDest = (dest: DestResult) => {
    onSelectDestination(dest);
    clear();
  };

  const hasResults = plans.length > 0 || destinations.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 flex items-center pointer-events-none">
          {loading ? (
            <CircularProgress size={15} style={{ color: "#0d9488" }} />
          ) : (
            <SearchIcon style={{ fontSize: 18 }} />
          )}
        </span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => hasResults && setIsOpen(true)}
          placeholder="Search day plans or destinations…"
          className="w-full pl-9 pr-9 py-2.5 bg-white rounded-xl border border-gray-200 shadow-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition"
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          >
            <CloseIcon style={{ fontSize: 16 }} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          {/* Destinations section */}
          {destinations.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                <ExploreIcon style={{ fontSize: 13, color: "#6b7280" }} />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Destinations
                </span>
              </div>
              {destinations.map((dest) => (
                <button
                  key={dest.id}
                  onClick={() => handleSelectDest(dest)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-teal-50 transition text-left border-b border-gray-50 last:border-0"
                >
                  <span className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                    <ExploreIcon style={{ fontSize: 14, color: "#0d9488" }} />
                  </span>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {dest.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Day plans section */}
          {plans.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                <MapIcon style={{ fontSize: 13, color: "#6b7280" }} />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Day Plans
                </span>
              </div>
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 transition text-left border-b border-gray-50 last:border-0"
                >
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <MapIcon style={{ fontSize: 14, color: "#4f46e5" }} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {plan.title}
                    </p>
                    {(plan.city || plan.country) && (
                      <p className="text-xs text-gray-400 truncate">
                        {[plan.city, plan.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
