"use client";

import type { Filters } from "@/src/app/admin/page";

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  locations: { cities: string[]; countries: string[] };
}

export default function FilterBar({ filters, onChange, locations }: Props) {
  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Status
        </label>
        <select
          value={filters.status}
          onChange={(e) => set("status", e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          City
        </label>
        <select
          value={filters.city}
          onChange={(e) => set("city", e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          <option value="">All Cities</option>
          {locations.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Country
        </label>
        <select
          value={filters.country}
          onChange={(e) => set("country", e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          <option value="">All Countries</option>
          {locations.countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-50">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Search
        </label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search title, description, city..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />
      </div>

      <button
        onClick={() =>
          onChange({ status: "pending", city: "", country: "", search: "" })
        }
        className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 underline"
      >
        Reset
      </button>
    </div>
  );
}
