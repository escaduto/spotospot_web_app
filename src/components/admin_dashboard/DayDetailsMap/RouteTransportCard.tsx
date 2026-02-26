"use client";

import { useState } from "react";
import {
  getSingleTransportConfig,
  TRANSPORTATION_TYPES,
} from "@/src/map/scripts/transport-config";
import CloseIcon from "@mui/icons-material/Close";
import RouteIcon from "@mui/icons-material/Route";

interface Props {
  /** IDs of the routes being edited (1 = single, >1 = bulk) */
  routeIds: string[];
  /** Initial types to pre-select (from the right-clicked / primary route) */
  initialTypes: string[];
  /** Screen-space position where the card should appear */
  position: { x: number; y: number };
  onSave: (routeIds: string[], types: string[]) => Promise<void>;
  onClose: () => void;
}

export default function RouteTransportCard({
  routeIds,
  initialTypes,
  position,
  onSave,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialTypes));
  const [saving, setSaving] = useState(false);

  const isBulk = routeIds.length > 1;

  const toggle = (val: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    await onSave(routeIds, [...selected]);
    setSaving(false);
    onClose();
  };

  // Clamp so card never overflows the viewport
  const x = Math.min(position.x, (globalThis.window?.innerWidth ?? 1280) - 268);
  const y = Math.min(position.y, (globalThis.window?.innerHeight ?? 800) - 340);

  return (
    <div
      className="absolute z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-64"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <RouteIcon style={{ fontSize: 14, color: "#6b7280" }} />
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {isBulk ? `${routeIds.length} Routes` : "Transport Type"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 flex items-center"
        >
          <CloseIcon style={{ fontSize: 14 }} />
        </button>
      </div>

      {isBulk && (
        <p className="text-[10px] text-gray-400 mb-2">
          Selection will replace types on all selected routes.
        </p>
      )}

      {/* Type pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TRANSPORTATION_TYPES.map(({ value, label }) => {
          const tc = getSingleTransportConfig(value);
          const isOn = selected.has(value);
          return (
            <button
              key={value}
              onClick={() => toggle(value)}
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full transition-all border ${
                isOn
                  ? "text-white border-transparent"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
              style={
                isOn ? { backgroundColor: tc.color, borderColor: tc.color } : {}
              }
            >
              <span>{tc.emoji}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 text-[11px] bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving…" : isBulk ? `Apply to ${routeIds.length}` : "Save"}
        </button>
        <button
          onClick={onClose}
          className="text-[11px] text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
