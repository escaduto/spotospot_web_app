"use client";

import { useState } from "react";
import type { ItineraryDay, ItineraryItem } from "@/src/supabase/types";
import ItemEditor from "./ItemEditor";
import PhotoSearchModal from "./PhotoSearchModal";
import Image from "next/image";
import { parsePoint } from "@/src/utils/geo";

interface Props {
  day: ItineraryDay;
  items: ItineraryItem[];
  onClose: () => void;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onUpdateDay: (updates: Partial<ItineraryDay>) => Promise<void>;
  onUpdateItem: (
    itemId: string,
    updates: Partial<ItineraryItem>,
  ) => Promise<void>;
  onAddItem: (item: Omit<ItineraryItem, "id">) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  refetch: () => void;
}

export default function DayDetailModal({
  day,
  items,
  onClose,
  onApprove,
  onReject,
  onUpdateDay,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  refetch,
}: Props) {
  const [editingDay, setEditingDay] = useState(false);
  const isApproved = day.visibility === "public";
  const [dayForm, setDayForm] = useState({
    title: day.title ?? "",
    city: day.city ?? "",
    country: day.country ?? "",
    description: day.description ?? "",
    category_type: day.category_type ?? [],
    notes: day.notes ?? "",
  });
  const [showPhotoSearch, setShowPhotoSearch] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSaveDay = async () => {
    setBusy(true);
    await onUpdateDay({
      title: dayForm.title,
      city: dayForm.city || null,
      country: dayForm.country || null,
      description: dayForm.description || null,
      category_type:
        dayForm.category_type.length > 0 ? dayForm.category_type : null,
      notes: dayForm.notes || null,
    });
    setEditingDay(false);
    setBusy(false);
    refetch();
  };

  const handlePhotoSelect = async (
    url: string,
    properties: Record<string, string>,
    blur_hash: string | null | undefined,
  ) => {
    await onUpdateDay({
      image_url: url,
      image_properties: properties,
      image_blurhash: blur_hash ?? null,
    });
    setShowPhotoSearch(false);
    refetch();
  };

  // Parse rep_point for display
  const repPointParsed = parsePoint(day.rep_point);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl my-8">
        {/* Header image */}
        <div className="relative h-56 bg-gray-200 dark:bg-gray-700 rounded-t-2xl overflow-hidden">
          {day.image_url ? (
            <Image
              src={day.image_url}
              alt={day.title ?? "Itinerary Day Image"}
              fill
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No Image
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/90 rounded-full p-1.5 text-gray-800 hover:bg-white"
          >
            ✕
          </button>
          <button
            onClick={() => setShowPhotoSearch(true)}
            className={`absolute bottom-3 right-3 bg-white/90 text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-white ${isApproved ? "opacity-40 pointer-events-none" : ""}`}
          >
            📷 Change Photo
          </button>
          <div className="absolute bottom-3 left-4 text-white">
            <h2 className="text-2xl font-bold drop-shadow">{day.title}</h2>
            <p className="text-sm opacity-90">
              {[day.city, day.country].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {isApproved && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
              ✓ This itinerary day is approved. Editing is disabled.
            </div>
          )}
          {/* Day metadata edit */}
          {editingDay ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label="Title"
                  value={dayForm.title}
                  onChange={(v) => setDayForm((f) => ({ ...f, title: v }))}
                />
                <FieldInput
                  label="Category"
                  value={dayForm.category_type[0] ?? ""}
                  onChange={(v) =>
                    setDayForm((f) => ({ ...f, category_type: [v] }))
                  }
                />
                <FieldInput
                  label="City"
                  value={dayForm.city}
                  onChange={(v) => setDayForm((f) => ({ ...f, city: v }))}
                />
                <FieldInput
                  label="Country"
                  value={dayForm.country}
                  onChange={(v) => setDayForm((f) => ({ ...f, country: v }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Description
                </label>
                <textarea
                  value={dayForm.description}
                  onChange={(e) =>
                    setDayForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full border rounded-lg p-2 text-sm mt-1 dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Notes
                </label>
                <textarea
                  value={dayForm.notes}
                  onChange={(e) =>
                    setDayForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full border rounded-lg p-2 text-sm mt-1 dark:bg-gray-700 dark:border-gray-600"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDay}
                  disabled={busy}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingDay(false)}
                  className="text-sm text-gray-500 underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {day.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {day.description}
                </p>
              )}
              {day.notes && (
                <p className="text-xs text-gray-400 italic">
                  Notes: {day.notes}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {day.category_type && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {day.category_type}
                  </span>
                )}
                {day.destination_key && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {day.destination_key}
                  </span>
                )}
                {repPointParsed && (
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                    📍 {repPointParsed.lat.toFixed(4)},{" "}
                    {repPointParsed.lng.toFixed(4)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setEditingDay(true)}
                className={`text-sm text-blue-600 underline ${isApproved ? "opacity-40 pointer-events-none" : ""}`}
              >
                Edit Details
              </button>
            </div>
          )}

          {/* Items list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Activities ({items.length})
              </h3>
              <button
                onClick={() => setAddingItem(true)}
                className={`text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium ${isApproved ? "opacity-40 pointer-events-none" : ""}`}
              >
                + Add Activity
              </button>
            </div>

            <div className="space-y-2">
              {items
                .sort((a, b) => a.order_index - b.order_index)
                .map((item) =>
                  editingItemId === item.id ? (
                    <ItemEditor
                      key={item.id}
                      item={item}
                      dayId={day.id}
                      onSave={async (updates) => {
                        await onUpdateItem(item.id, updates);
                        setEditingItemId(null);
                        refetch();
                      }}
                      onCancel={() => setEditingItemId(null)}
                      onDelete={async () => {
                        await onDeleteItem(item.id);
                        setEditingItemId(null);
                        refetch();
                      }}
                    />
                  ) : (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                        {item.order_index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.item_type}
                          {item.location_name ? ` · ${item.location_name}` : ""}
                          {item.duration_minutes
                            ? ` · ${item.duration_minutes}min`
                            : ""}
                          {item.cost_estimate
                            ? ` · ${item.currency ?? ""}${item.cost_estimate}`
                            : ""}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        {(() => {
                          const coordsParsed = parsePoint(item.location_coords);
                          return coordsParsed ? (
                            <span className="text-[10px] text-green-600">
                              📍 {coordsParsed.lat.toFixed(4)},{" "}
                              {coordsParsed.lng.toFixed(4)}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <button
                        onClick={() => setEditingItemId(item.id)}
                        className={`opacity-0 group-hover:opacity-100 transition text-xs text-blue-600 underline shrink-0 ${isApproved ? "hidden" : ""}`}
                      >
                        Edit
                      </button>
                    </div>
                  ),
                )}

              {addingItem && (
                <ItemEditor
                  dayId={day.id}
                  nextIndex={items.length}
                  onSave={async (newItem) => {
                    await onAddItem(newItem as Omit<ItineraryItem, "id">);
                    setAddingItem(false);
                    refetch();
                  }}
                  onCancel={() => setAddingItem(false)}
                />
              )}
            </div>
          </div>

          {/* Image properties */}
          {day.image_properties && (
            <div className="text-xs text-gray-400 space-y-0.5">
              <p className="font-medium text-gray-500">Image credits</p>
              {Object.entries(day.image_properties).map(([k, v]) => (
                <p key={k}>
                  {k}: {v}
                </p>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2 border-t">
            <button
              onClick={async () => {
                setBusy(true);
                await onApprove();
                setBusy(false);
              }}
              disabled={busy || day.visibility === "public"}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40"
            >
              ✓ Approve & Publish
            </button>
            <button
              onClick={async () => {
                setBusy(true);
                await onReject();
                setBusy(false);
              }}
              disabled={
                busy ||
                day.visibility === "public" ||
                day.visibility === "private"
              }
              className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40"
            >
              ✗ Reject
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {showPhotoSearch && (
        <PhotoSearchModal
          query={`${day.city ?? ""} ${day.country ?? ""} ${day.title}`.trim()}
          onSelect={handlePhotoSelect}
          onClose={() => setShowPhotoSearch(false)}
        />
      )}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg px-2 py-1.5 text-sm mt-1 dark:bg-gray-700 dark:border-gray-600"
      />
    </div>
  );
}
