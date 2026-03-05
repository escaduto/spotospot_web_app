"use client";

import { useMemo } from "react";
import type { NearbyPlan } from "@/src/supabase/itineraries";
import PlanCard from "./PlanCard";
import CircularProgress from "@mui/material/CircularProgress";
import FilterListIcon from "@mui/icons-material/FilterList";

// ── Category pill definitions ────────────────────────────────────────────────

const PREDEFINED_CATEGORIES = [
  { key: "family", label: "Family" },
  { key: "pet-friendly", label: "Pet-friendly" },
  { key: "outdoors", label: "Outdoors" },
  { key: "food_and_drink", label: "Food & Drink" },
  { key: "cultural", label: "Cultural" },
  { key: "arts_and_culture", label: "Arts & Culture" },
  { key: "adventure", label: "Adventure" },
  { key: "romantic", label: "Romantic" },
  { key: "budget", label: "Budget" },
  { key: "luxury", label: "Luxury" },
  { key: "nightlife", label: "Nightlife" },
  { key: "beaches", label: "Beaches" },
  { key: "hiking", label: "Hiking" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  plans: NearbyPlan[];
  loading: boolean;
  activeCategories: string[];
  onCategoryToggle: (cat: string) => void;
  onPlanClick: (plan: NearbyPlan) => void;
  userCity?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlanResultsPanel({
  plans,
  loading,
  activeCategories,
  onCategoryToggle,
  onPlanClick,
  userCity,
}: Props) {
  // Derive categories present in the fetched plans (supplement predefined list)
  const availableCategories = useMemo(() => {
    const fromData = new Set<string>();
    plans.forEach((p) => p.category_type?.forEach((c) => fromData.add(c)));

    // Merge: predefined first, then any extra from data not already in predefined
    const predefinedKeys = new Set(PREDEFINED_CATEGORIES.map((c) => c.key));
    const extras = [...fromData]
      .filter((c) => !predefinedKeys.has(c))
      .map((c) => ({ key: c, label: c.replace(/_/g, " ") }));

    return [...PREDEFINED_CATEGORIES, ...extras].filter(
      (c) => fromData.has(c.key) || activeCategories.includes(c.key),
    );
  }, [plans, activeCategories]);

  // Filter plans by active categories
  const filteredPlans = useMemo(() => {
    if (activeCategories.length === 0) return plans;
    return plans.filter((p) =>
      activeCategories.some((cat) => p.category_type?.includes(cat)),
    );
  }, [plans, activeCategories]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Header */}
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between mb-0.5">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Day Plans
          </h2>
          {loading ? (
            <CircularProgress size={12} style={{ color: "#0d9488" }} />
          ) : (
            <span className="text-[10px] text-gray-400 font-medium">
              {filteredPlans.length}{" "}
              {filteredPlans.length === 1 ? "result" : "results"}
            </span>
          )}
        </div>
        {userCity && (
          <p className="text-[11px] text-gray-400">Near {userCity}</p>
        )}
      </div>

      {/* Category filter pills */}
      {(availableCategories.length > 0 || activeCategories.length > 0) && (
        <div className="shrink-0 px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FilterListIcon style={{ fontSize: 13, color: "#9ca3af" }} />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Filter
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableCategories.map((cat) => {
              const active = activeCategories.includes(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => onCategoryToggle(cat.key)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition border ${
                    active
                      ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-teal-400 hover:text-teal-700"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Plans list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading && plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
            <CircularProgress size={24} style={{ color: "#0d9488" }} />
            <p className="text-xs">Loading day plans…</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
            <span className="text-3xl">🗺️</span>
            <p className="text-xs font-medium">No plans in this area</p>
            {activeCategories.length > 0 && (
              <button
                onClick={() => activeCategories.forEach(onCategoryToggle)}
                className="text-xs text-teal-600 hover:text-teal-800 font-semibold underline underline-offset-2 transition"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onClick={() => onPlanClick(plan)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
