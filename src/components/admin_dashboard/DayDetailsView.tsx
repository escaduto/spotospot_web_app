"use client";

import { useState, useEffect } from "react";
import type {
  SeedItineraryDays,
  SeedItineraryItems,
} from "@/src/supabase/types";
import { createClient } from "@/src/supabase/client";
import Image from "next/image";
import { parsePoint } from "@/src/utils/geo";
import PhotoSearchModal from "./PhotoSearchModal";
import DayDetailsMap from "./DayDetailsMap";
import ActivityItem from "./ActivityItem";
import ActivityEditor from "./ActivityEditor";

interface Props {
  day: SeedItineraryDays;
  items: SeedItineraryItems[];
  onBack: () => void;
  refetch: () => void;
}

export default function DayDetailsView({ day, items, onBack, refetch }: Props) {
  const supabase = createClient();
  const [editingDay, setEditingDay] = useState(false);
  const [showPhotoSearch, setShowPhotoSearch] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const isApproved = day.approval_status === "approved";

  const [dayForm, setDayForm] = useState({
    title: day.title ?? "",
    city: day.city ?? "",
    country: day.country ?? "",
    description: day.description ?? "",
    category_type: day.category_type ?? "",
    notes: day.notes ?? "",
  });

  // Update form when day changes
  useEffect(() => {
    setDayForm({
      title: day.title ?? "",
      city: day.city ?? "",
      country: day.country ?? "",
      description: day.description ?? "",
      category_type: day.category_type ?? "",
      notes: day.notes ?? "",
    });
  }, [day]);

  const handleSaveDay = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("seed_itinerary_days")
      .update({
        title: dayForm.title,
        city: dayForm.city || null,
        country: dayForm.country || null,
        description: dayForm.description || null,
        category_type: dayForm.category_type || null,
        notes: dayForm.notes || null,
      })
      .eq("id", day.id);

    if (!error) {
      setEditingDay(false);
      refetch();
    }
    setBusy(false);
  };

  const handlePhotoSelect = async (
    url: string,
    properties: Record<string, string>,
    blur_hash: string | null | undefined
  ) => {
    await supabase
      .from("seed_itinerary_days")
      .update({
        image_url: url,
        image_properties: properties,
        image_blurhash: blur_hash ?? null,
      })
      .eq("id", day.id);

    setShowPhotoSearch(false);
    refetch();
  };

  const handleApprove = async () => {
    setBusy(true);
    await supabase
      .from("seed_itinerary_days")
      .update({ approval_status: "approved" })
      .eq("id", day.id);
    setBusy(false);
    refetch();
  };

  const handleReject = async () => {
    setBusy(true);
    await supabase
      .from("seed_itinerary_days")
      .update({ approval_status: "rejected" })
      .eq("id", day.id);
    setBusy(false);
    refetch();
  };

  const handleUpdateItem = async (
    itemId: string,
    updates: Partial<SeedItineraryItems>
  ) => {
    await supabase
      .from("seed_itinerary_items")
      .update(updates)
      .eq("id", itemId);
    setEditingItemId(null);
    refetch();
  };

  const handleAddItem = async (newItem: Omit<SeedItineraryItems, "id">) => {
    await supabase.from("seed_itinerary_items").insert(newItem);
    setAddingItem(false);
    refetch();
  };

  const handleDeleteItem = async (itemId: string) => {
    await supabase.from("seed_itinerary_items").delete().eq("id", itemId);
    setEditingItemId(null);
    refetch();
  };

  // Parse rep_point for display
  const repPointParsed = parsePoint(day.rep_point);
  const activityPoints = items
    .map((item) => parsePoint(item.coords))
    .filter((p) => p !== null) as Array<{ lng: number; lat: number }>;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{day.title}</h1>
              <p className="text-sm text-gray-500">
                {[day.city, day.country].filter(Boolean).join(", ")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={busy || isApproved}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            >
              ✓ Approve
            </button>
            <button
              onClick={handleReject}
              disabled={busy || isApproved || day.approval_status === "rejected"}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            >
              ✗ Reject
            </button>
          </div>
        </div>
      </header>

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Map side */}
        <div className="w-2/3 relative" style={{ minHeight: "100%" }}>
          <DayDetailsMap
            items={items}
            selectedItemId={selectedItemId}
            editingItemId={editingItemId}
            onSelectItem={setSelectedItemId}
            onUpdateCoords={async (itemId, lng, lat) => {
              // Update the item's coordinates
              const geoPoint = `POINT(${lng} ${lat})`;
              await supabase
                .from("seed_itinerary_items")
                .update({ coords: geoPoint })
                .eq("id", itemId);
              refetch();
            }}
            centerPoint={repPointParsed}
          />
          {editingItemId && (
            <div className="absolute top-4 left-4 bg-yellow-100 border-2 border-yellow-500 px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm font-medium text-yellow-900">
                📍 Click map to place marker or drag to move
              </p>
            </div>
          )}
        </div>

        {/* Activities side */}
        <div className="w-1/3 bg-white border-l overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Image preview */}
            {day.image_url && (
              <div className="relative h-48 rounded-lg overflow-hidden">
                <Image
                  src={day.image_url}
                  alt={day.title}
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => setShowPhotoSearch(true)}
                  disabled={isApproved}
                  className="absolute bottom-2 right-2 bg-white/90 text-xs px-2 py-1 rounded font-medium hover:bg-white disabled:opacity-40"
                >
                  📷 Change
                </button>
              </div>
            )}

            {/* Status badge */}
            {isApproved && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
                ✓ Approved (editing disabled)
              </div>
            )}

            {/* Day details */}
            {editingDay ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={dayForm.title}
                  onChange={(e) =>
                    setDayForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Title"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={dayForm.city}
                    onChange={(e) =>
                      setDayForm((f) => ({ ...f, city: e.target.value }))
                    }
                    className="border rounded-lg px-3 py-2 text-sm"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={dayForm.country}
                    onChange={(e) =>
                      setDayForm((f) => ({ ...f, country: e.target.value }))
                    }
                    className="border rounded-lg px-3 py-2 text-sm"
                    placeholder="Country"
                  />
                </div>
                <textarea
                  value={dayForm.description}
                  onChange={(e) =>
                    setDayForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Description"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDay}
                    disabled={busy}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
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
                  <p className="text-sm text-gray-600">{day.description}</p>
                )}
                <button
                  onClick={() => setEditingDay(true)}
                  disabled={isApproved}
                  className="text-sm text-blue-600 underline disabled:opacity-40"
                >
                  Edit Details
                </button>
              </div>
            )}

            {/* Activities */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  Activities ({items.length})
                </h3>
                <button
                  onClick={() => setAddingItem(true)}
                  disabled={isApproved}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
                >
                  + Add
                </button>
              </div>

              <div className="space-y-2">
                {items
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((item) =>
                    editingItemId === item.id ? (
                      <ActivityEditor
                        key={item.id}
                        item={item}
                        dayId={day.id}
                        onSave={(updates) => handleUpdateItem(item.id, updates)}
                        onCancel={() => setEditingItemId(null)}
                        onDelete={() => handleDeleteItem(item.id)}
                      />
                    ) : (
                      <ActivityItem
                        key={item.id}
                        item={item}
                        isSelected={selectedItemId === item.id}
                        onSelect={() => setSelectedItemId(item.id)}
                        onEdit={() => setEditingItemId(item.id)}
                        disabled={isApproved}
                      />
                    )
                  )}

                {addingItem && (
                  <ActivityEditor
                    dayId={day.id}
                    nextIndex={items.length}
                    onSave={handleAddItem}
                    onCancel={() => setAddingItem(false)}
                  />
                )}
              </div>
            </div>
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
