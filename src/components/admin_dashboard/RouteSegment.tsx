"use client";

import { useState } from "react";
import type {
  itinerary_item_routes,
  TransportationType,
} from "@/src/supabase/types";
import {
  getTransportConfig,
  getSingleTransportConfig,
  TRANSPORTATION_TYPES,
} from "@/src/map/scripts/transport-config";

interface Props {
  route: itinerary_item_routes;
  disabled: boolean;
  onUpdateTransportTypes: (
    routeId: string,
    transportationTypes: string[],
  ) => Promise<void>;
  isRecalculating?: boolean;
}

export default function RouteSegment({
  route,
  disabled,
  onUpdateTransportTypes,
  isRecalculating,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const types = route.transportation_type ?? [];

  const config = getTransportConfig(types);

  const distLabel =
    route.distance_m >= 1000
      ? `${(route.distance_m / 1000).toFixed(1)} km`
      : `${Math.round(route.distance_m)} m`;

  const durLabel =
    route.duration_s >= 3600
      ? `${Math.floor(route.duration_s / 3600)}h ${Math.round((route.duration_s % 3600) / 60)}m`
      : `${Math.round(route.duration_s / 60)} min`;

  const handleRemoveType = async (typeToRemove: string) => {
    const updated = types.filter((t) => t !== typeToRemove);
    setSaving(true);
    await onUpdateTransportTypes(route.id, updated);
    setSaving(false);
  };

  const handleAddType = async (typeToAdd: string) => {
    if (types.includes(typeToAdd as TransportationType)) return;
    const updated = [...types, typeToAdd];
    setSaving(true);
    await onUpdateTransportTypes(route.id, updated);
    setSaving(false);
    setShowAdd(false);
  };

  const availableTypes = TRANSPORTATION_TYPES.filter(
    (t) => !types.includes(t.value as TransportationType),
  );

  return (
    <div className="flex items-center py-1.5 px-3">
      <div className="flex items-center gap-2 w-full">
        {/* Vertical connector */}
        <div className="w-6 flex justify-center shrink-0">
          <div className="w-px h-6 bg-gray-300" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Transport type chips */}
            {types.map((type) => {
              const tc = getSingleTransportConfig(type);
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border"
                  style={{
                    borderColor: tc.color,
                    color: tc.color,
                    backgroundColor: `${tc.color}10`,
                  }}
                >
                  <span>{tc.emoji}</span>
                  <span className="font-medium">{tc.label}</span>
                  {!disabled && !saving && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveType(type);
                      }}
                      className="ml-0.5 hover:opacity-70 text-[10px] leading-none"
                      title={`Remove ${tc.label}`}
                    >
                      ✕
                    </button>
                  )}
                </span>
              );
            })}

            {types.length === 0 && (
              <span className="text-[11px] text-gray-400 italic">
                No transport type
              </span>
            )}

            {/* Add button */}
            {!disabled && availableTypes.length > 0 && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAdd(!showAdd);
                  }}
                  className="inline-flex items-center text-[11px] text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded-full px-1.5 py-0.5"
                  title="Add transport type"
                >
                  +
                </button>
                {showAdd && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-40 max-h-48 overflow-y-auto">
                    {availableTypes.map((t) => (
                      <button
                        key={t.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddType(t.value);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span>{getSingleTransportConfig(t.value).emoji}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Distance / duration */}
            <span className="text-[10px] text-gray-400 ml-auto shrink-0 flex items-center gap-1">
              {isRecalculating && (
                <span
                  className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"
                  title="Route recalculating..."
                />
              )}
              <span style={{ color: config.color }} className="font-medium">
                {config.emoji} {config.label}
              </span>
              {distLabel} · {durLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
