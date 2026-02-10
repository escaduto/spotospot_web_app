"use client";

import { useState } from "react";
import type { SeedItineraryItems } from "@/src/supabase/types";
import { toGeoPoint } from "@/src/utils/geo";

interface Props {
  item?: SeedItineraryItems;
  dayId: string;
  nextIndex?: number;
  onSave: (data: Partial<SeedItineraryItems>) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

export default function ItemEditor({
  item,
  dayId,
  nextIndex = 0,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const [form, setForm] = useState({
    title: item?.title ?? "",
    item_type: item?.item_type ?? "activity",
    description: item?.description ?? "",
    location_name: item?.location_name ?? "",
    location_address: item?.location_address ?? "",
    lat: item?.coords?.lat?.toString() ?? "",
    lng: item?.coords?.lng?.toString() ?? "",
    place_id: item?.place_id ?? "",
    start_time: item?.start_time ?? "",
    end_time: item?.end_time ?? "",
    duration_minutes: item?.duration_minutes?.toString() ?? "",
    cost_estimate: item?.cost_estimate?.toString() ?? "",
    currency: item?.currency ?? "USD",
    transportation_type: item?.transportation_type ?? "",
    notes: item?.notes ?? "",
    order_index: item?.order_index ?? nextIndex,
  });
  const [busy, setBusy] = useState(false);

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setBusy(true);
    const coords =
      form.lat && form.lng
        ? toGeoPoint({ lat: parseFloat(form.lat), lng: parseFloat(form.lng) })
        : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      seed_itinerary_day_id: dayId,
      title: form.title,
      item_type: form.item_type,
      description: form.description || null,
      location_name: form.location_name || null,
      location_address: form.location_address || null,
      coords,
      place_id: form.place_id || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      duration_minutes: form.duration_minutes
        ? parseInt(form.duration_minutes, 10)
        : null,
      cost_estimate: form.cost_estimate ? parseFloat(form.cost_estimate) : null,
      currency: form.currency || null,
      transportation_type: form.transportation_type || null,
      notes: form.notes || null,
      order_index:
        typeof form.order_index === "string"
          ? parseInt(form.order_index as string, 10)
          : form.order_index,
    };

    await onSave(payload);
    setBusy(false);
  };

  return (
    <div className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <MiniInput
          label="Title *"
          value={form.title}
          onChange={(v) => set("title", v)}
        />
        <MiniInput
          label="Type"
          value={form.item_type}
          onChange={(v) => set("item_type", v)}
        />
        <MiniInput
          label="Location Name"
          value={form.location_name}
          onChange={(v) => set("location_name", v)}
        />
        <MiniInput
          label="Address"
          value={form.location_address}
          onChange={(v) => set("location_address", v)}
        />
        <MiniInput
          label="Latitude"
          value={form.lat}
          onChange={(v) => set("lat", v)}
        />
        <MiniInput
          label="Longitude"
          value={form.lng}
          onChange={(v) => set("lng", v)}
        />
        <MiniInput
          label="Place ID"
          value={form.place_id}
          onChange={(v) => set("place_id", v)}
        />
        <MiniInput
          label="Transport Type"
          value={form.transportation_type}
          onChange={(v) => set("transportation_type", v)}
        />
        <MiniInput
          label="Start Time"
          value={form.start_time}
          onChange={(v) => set("start_time", v)}
        />
        <MiniInput
          label="End Time"
          value={form.end_time}
          onChange={(v) => set("end_time", v)}
        />
        <MiniInput
          label="Duration (min)"
          value={form.duration_minutes}
          onChange={(v) => set("duration_minutes", v)}
        />
        <div className="flex gap-2">
          <MiniInput
            label="Cost"
            value={form.cost_estimate}
            onChange={(v) => set("cost_estimate", v)}
          />
          <MiniInput
            label="Currency"
            value={form.currency}
            onChange={(v) => set("currency", v)}
          />
        </div>
        <MiniInput
          label="Order"
          value={form.order_index.toString()}
          onChange={(v) => set("order_index", v)}
        />
      </div>
      <div>
        <label className="text-[10px] font-medium text-gray-500">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="w-full border rounded px-2 py-1 text-xs mt-0.5 dark:bg-gray-700 dark:border-gray-600"
          rows={2}
        />
      </div>
      <div>
        <label className="text-[10px] font-medium text-gray-500">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="w-full border rounded px-2 py-1 text-xs mt-0.5 dark:bg-gray-700 dark:border-gray-600"
          rows={2}
        />
      </div>
      <div className="flex gap-2 items-center">
        <button
          onClick={handleSave}
          disabled={busy || !form.title}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
        >
          {item ? "Save Changes" : "Add Activity"}
        </button>
        <button onClick={onCancel} className="text-xs text-gray-500 underline">
          Cancel
        </button>
        {item && onDelete && (
          <button
            onClick={async () => {
              if (confirm("Delete this activity?")) {
                setBusy(true);
                await onDelete();
                setBusy(false);
              }
            }}
            className="ml-auto text-xs text-red-600 underline"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function MiniInput({
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
      <label className="text-[10px] font-medium text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-2 py-1 text-xs mt-0.5 dark:bg-gray-700 dark:border-gray-600"
      />
    </div>
  );
}
