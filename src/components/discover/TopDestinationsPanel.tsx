"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { TopDestination } from "@/src/supabase/itineraries";
import CircularProgress from "@mui/material/CircularProgress";
import ExploreIcon from "@mui/icons-material/Explore";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LocationOnIcon from "@mui/icons-material/LocationOn";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  destinations: TopDestination[];
  loading: boolean;
  activeGroupKey: string | null;
  onGroupChange: (key: string | null) => void;
  onDestinationClick: (dest: TopDestination) => void;
  closestDestId?: string | null;
}

// ── Destination card ──────────────────────────────────────────────────────────

function DestCard({
  dest,
  onClick,
  isNearest,
}: {
  dest: TopDestination;
  onClick: () => void;
  isNearest?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-2.5 p-2 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/50 transition text-left overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
        {dest.image_url ? (
          <Image
            src={dest.image_url}
            alt={dest.label}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="48px"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-teal-100 to-cyan-50 flex items-center justify-center">
            <ExploreIcon style={{ fontSize: 20, color: "#0d9488" }} />
          </div>
        )}
      </div>

      {/* Label */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-teal-700 transition">
            {dest.label}
          </p>
          {isNearest && (
            <span className="shrink-0 text-[9px] font-bold bg-teal-500 text-white px-1.5 py-0.5 rounded-full">
              Near you
            </span>
          )}
        </div>
        {dest.group_label && (
          <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <LocationOnIcon style={{ fontSize: 10 }} />
            {dest.group_label}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function TopDestinationsPanel({
  destinations,
  loading,
  activeGroupKey,
  onGroupChange,
  onDestinationClick,
  closestDestId,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Build groups from data
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; count: number }
    >();
    destinations.forEach((d) => {
      const k = d.group_key ?? "other";
      const l = d.group_label ?? "Other";
      const existing = map.get(k);
      if (existing) {
        existing.count++;
      } else {
        map.set(k, { key: k, label: l, count: 1 });
      }
    });
    return [...map.values()];
  }, [destinations]);

  // Filter destinations by active group
  const filtered = useMemo(() => {
    if (!activeGroupKey) return destinations;
    return destinations.filter(
      (d) => (d.group_key ?? "other") === activeGroupKey,
    );
  }, [destinations, activeGroupKey]);

  // Group the filtered list for section headers
  const sections = useMemo(() => {
    if (activeGroupKey) {
      // Single section
      const group = groups.find((g) => g.key === activeGroupKey);
      return [
        {
          key: activeGroupKey,
          label: group?.label ?? activeGroupKey,
          items: filtered,
        },
      ];
    }
    // All sections
    const map = new Map<
      string,
      { key: string; label: string; items: TopDestination[] }
    >();
    filtered.forEach((d) => {
      const k = d.group_key ?? "other";
      const l = d.group_label ?? "Other";
      if (!map.has(k)) map.set(k, { key: k, label: l, items: [] });
      map.get(k)!.items.push(d);
    });
    return [...map.values()];
  }, [filtered, activeGroupKey, groups]);

  const activeGroupLabel = activeGroupKey
    ? groups.find((g) => g.key === activeGroupKey)?.label
    : null;

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-100">
      {/* Header */}
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <ExploreIcon style={{ fontSize: 14 }} />
            Top Destinations
          </h2>
          {loading && (
            <CircularProgress size={12} style={{ color: "#0d9488" }} />
          )}
        </div>

        {/* Group filter dropdown */}
        {groups.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((p) => !p)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                activeGroupKey
                  ? "border-teal-400 bg-teal-50 text-teal-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <span className="truncate">
                {activeGroupLabel ?? "All groups"}
              </span>
              <KeyboardArrowDownIcon
                style={{
                  fontSize: 16,
                  flexShrink: 0,
                  transition: "transform 0.2s",
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-xl z-20 overflow-hidden">
                <button
                  onClick={() => {
                    onGroupChange(null);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 transition font-medium ${
                    !activeGroupKey
                      ? "text-teal-700 font-semibold bg-teal-50/50"
                      : "text-gray-700"
                  }`}
                >
                  All groups
                  <span className="ml-1 text-gray-400">
                    ({destinations.length})
                  </span>
                </button>
                {groups.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => {
                      onGroupChange(g.key);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-xs hover:bg-teal-50 transition border-t border-gray-50 ${
                      activeGroupKey === g.key
                        ? "text-teal-700 font-semibold bg-teal-50"
                        : "text-gray-700 font-medium"
                    }`}
                  >
                    {g.label}
                    <span className="ml-1 text-gray-400">({g.count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Destinations list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading && destinations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
            <CircularProgress size={24} style={{ color: "#0d9488" }} />
            <p className="text-xs">Loading destinations…</p>
          </div>
        ) : sections.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">
            No destinations found
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <div key={section.key}>
                {/* Section header — only shown when viewing "all groups" */}
                {!activeGroupKey && (
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-0.5">
                    {section.label}
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  {section.items.map((dest) => (
                    <DestCard
                      key={dest.id}
                      dest={dest}
                      onClick={() => onDestinationClick(dest)}
                      isNearest={dest.id === closestDestId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
