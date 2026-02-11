"use client";

import { useState, useEffect } from "react";
import type { SeedItineraryItems } from "@/src/supabase/types";
import { usePlacesSearch } from "@/src/hooks/usePlacesSearch";
import { getCategoryConfig } from "@/src/map/scripts/category-config";

interface Props {
  item?: SeedItineraryItems;
  dayId: string;
  nextIndex?: number;
  onSave: (updates: Partial<SeedItineraryItems>) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

export default function ActivityEditor({
  item,
  dayId,
  nextIndex = 0,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const isNew = !item;
  const [form, setForm] = useState({
    title: item?.title ?? "",
    location_name: item?.location_name ?? "",
    item_type: item?.item_type ?? "activity",
    description: item?.description ?? "",
    duration_minutes: item?.duration_minutes ?? 60,
    coords: item?.coords ?? null,
    place_id: item?.place_id ?? null,
  });

  const [showPOISearch, setShowPOISearch] = useState(false);
  const [saving, setSaving] = useState(false);

  // POI search with current map center (could be enhanced with actual center)
  const { query, results, loading, isOpen, handleQueryChange, clear, close } =
    usePlacesSearch();

  const handleSubmit = async () => {
    setSaving(true);
    const updates: Partial<SeedItineraryItems> = {
      ...form,
      seed_itinerary_day_id: dayId,
      order_index: item?.order_index ?? nextIndex,
    };

    await onSave(updates);
    setSaving(false);
  };

  const handleSelectPOI = (place: any) => {
    setForm((f) => ({
      ...f,
      place_id: place.id,
      location_name: place.name_en || place.name_default,
      coords: `POINT(${place.lng} ${place.lat})`,
    }));
    setShowPOISearch(false);
    clear();
  };

  return (
    <div className="border-2 border-blue-400 rounded-lg p-4 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-gray-900">
          {isNew ? "New Activity" : "Edit Activity"}
        </h4>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-medium text-gray-600">Title *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          placeholder="e.g., Visit Golden Gate Bridge"
        />
      </div>

      {/* POI Search/Match */}
      <div>
        <label className="text-xs font-medium text-gray-600">
          Link to POI {form.place_id && <span className="text-green-600">✓ Matched</span>}
        </label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              handleQueryChange(e.target.value);
              setShowPOISearch(true);
            }}
            onFocus={() => setShowPOISearch(true)}
            className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
            placeholder="Search for a place..."
          />

          {showPOISearch && isOpen && results.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg border shadow-xl max-h-60 overflow-y-auto z-50">
              {results.slice(0, 10).map((place) => {
                const config = getCategoryConfig(place.category_group);
                return (
                  <button
                    key={place.id}
                    onClick={() => handleSelectPOI(place)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left border-b last:border-0"
                  >
                    <span className="text-sm">{config.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {place.name_en || place.name_default}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {[place.city, place.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {form.place_id && (
          <div className="mt-1 text-xs">
            <span className="text-green-600">Matched to: {form.location_name}</span>
            <button
              onClick={() =>
                setForm((f) => ({ ...f, place_id: null, location_name: "", coords: null }))
              }
              className="ml-2 text-red-600 underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Location name (manual) */}
      <div>
        <label className="text-xs font-medium text-gray-600">Location Name</label>
        <input
          type="text"
          value={form.location_name}
          onChange={(e) =>
            setForm((f) => ({ ...f, location_name: e.target.value }))
          }
          className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          placeholder="e.g., Golden Gate Bridge"
        />
      </div>

      {/* Type and Duration */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-600">Type</label>
          <select
            value={form.item_type}
            onChange={(e) => setForm((f) => ({ ...f, item_type: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          >
            <option value="activity">Activity</option>
            <option value="food">Food</option>
            <option value="transport">Transport</option>
            <option value="accommodation">Accommodation</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Duration (min)</label>
          <input
            type="number"
            value={form.duration_minutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))
            }
            className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-gray-600">Description</label>
        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
          rows={3}
          placeholder="Activity details..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSubmit}
          disabled={!form.title || saving}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={saving}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Delete
          </button>
        )}
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
