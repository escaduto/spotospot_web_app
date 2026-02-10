"use client";

import type { AdminStats as Stats } from "@/src/hooks/useAdminData";

const statCards = (s: Stats) => [
  { label: "Total Days", value: s.total, color: "bg-gray-100 text-gray-800" },
  {
    label: "Pending",
    value: s.pending,
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    label: "Approved",
    value: s.approved,
    color: "bg-green-100 text-green-800",
  },
  { label: "Rejected", value: s.rejected, color: "bg-red-100 text-red-800" },
  {
    label: "With Image",
    value: s.withImage,
    color: "bg-blue-100 text-blue-800",
  },
  {
    label: "No Image",
    value: s.withoutImage,
    color: "bg-orange-100 text-orange-800",
  },
  {
    label: "Matched Locations",
    value: s.matchedLocations,
    color: "bg-purple-100 text-purple-800",
  },
  {
    label: "Cities",
    value: s.uniqueCities,
    color: "bg-teal-100 text-teal-800",
  },
  {
    label: "Countries",
    value: s.uniqueCountries,
    color: "bg-indigo-100 text-indigo-800",
  },
];

export default function AdminStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
      {statCards(stats).map((c) => (
        <div
          key={c.label}
          className={`rounded-xl p-3 ${c.color} flex flex-col items-center`}
        >
          <span className="text-2xl font-bold">{c.value}</span>
          <span className="text-xs font-medium text-center leading-tight mt-1">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
