"use client";

import { useState, useEffect, useRef } from "react";
import type {
  ItineraryItem,
  itinerary_item_routes,
} from "@/src/supabase/types";
import ActivityEditor from "./ActivityEditor";
import { PlacePointResult } from "@/src/supabase/places";
import {
  getSingleTransportConfig,
  TRANSPORTATION_TYPES,
} from "@/src/map/scripts/transport-config";
import { createClient } from "@/src/supabase/client";
import EditIcon from "@mui/icons-material/Edit";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import HikingIcon from "@mui/icons-material/Hiking";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import LocalTaxiIcon from "@mui/icons-material/LocalTaxi";
import DriveEtaIcon from "@mui/icons-material/DriveEta";
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import FlightIcon from "@mui/icons-material/Flight";
import DirectionsBoatIcon from "@mui/icons-material/DirectionsBoat";
import TrainIcon from "@mui/icons-material/Train";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import TramIcon from "@mui/icons-material/Tram";
import MultipleStopIcon from "@mui/icons-material/MultipleStop";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import LocalActivityIcon from "@mui/icons-material/LocalActivity";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import HotelIcon from "@mui/icons-material/Hotel";
import PlaceIcon from "@mui/icons-material/Place";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LanguageIcon from "@mui/icons-material/Language";
import PhoneIcon from "@mui/icons-material/Phone";
import LinkIcon from "@mui/icons-material/Link";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

// -------------------------------------------------
// Helpers
// -------------------------------------------------

const ITEM_TYPE_CONFIG: Record<
  string,
  { color: string; bg: string; emoji: string }
> = {
  activity: { color: "#2563eb", bg: "#EFF6FF", emoji: "🎯" },
  food: { color: "#d97706", bg: "#FFFBEB", emoji: "🍽️" },
  transport: { color: "#6b7280", bg: "#F9FAFB", emoji: "🚌" },
  accommodation: { color: "#7c3aed", bg: "#F5F3FF", emoji: "🛏️" },
  other: { color: "#6b7280", bg: "#F9FAFB", emoji: "📌" },
};

// ── Icon helpers ────────────────────────────────────────────────────────────
const TRANSPORT_ICON_MAP: Record<
  string,
  React.ComponentType<{ style?: React.CSSProperties }>
> = {
  walking: DirectionsWalkIcon,
  running: DirectionsRunIcon,
  hiking: HikingIcon,
  driving: DirectionsCarIcon,
  rideshare: LocalTaxiIcon,
  car_rental: DriveEtaIcon,
  cycling: DirectionsBikeIcon,
  bikeshare: DirectionsBikeIcon,
  flight: FlightIcon,
  ferry: DirectionsBoatIcon,
  train: TrainIcon,
  bus: DirectionsBusIcon,
  "muni/tram": TramIcon,
};

function TransportIcon({
  type,
  style,
}: {
  type: string;
  style?: React.CSSProperties;
}) {
  const Icon = TRANSPORT_ICON_MAP[type];
  if (Icon) return <Icon style={style} />;
  return <TrendingFlatIcon style={style} />;
}

function TransportSummaryIcon({
  types,
  style,
}: {
  types: string[];
  style?: React.CSSProperties;
}) {
  if (!types || types.length === 0) return <TrendingFlatIcon style={style} />;
  if (types.length > 1) return <MultipleStopIcon style={style} />;
  return <TransportIcon type={types[0]} style={style} />;
}

const ITEM_TYPE_ICON_MAP: Record<
  string,
  React.ComponentType<{ style?: React.CSSProperties }>
> = {
  activity: LocalActivityIcon,
  food: RestaurantIcon,
  transport: DirectionsBusIcon,
  accommodation: HotelIcon,
  other: PlaceIcon,
};

function ItemTypeIcon({
  type,
  style,
}: {
  type: string;
  style?: React.CSSProperties;
}) {
  const Icon = ITEM_TYPE_ICON_MAP[type] ?? PlaceIcon;
  return <Icon style={style} />;
}

function getTypeConfig(type: string) {
  return ITEM_TYPE_CONFIG[type] ?? ITEM_TYPE_CONFIG.other;
}

function fmt12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function routeDuration(route: itinerary_item_routes): string {
  const min = Math.round(route.duration_s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function routeDistance(route: itinerary_item_routes): string {
  if (route.distance_m >= 1000)
    return `${(route.distance_m / 1000).toFixed(1)} km`;
  return `${Math.round(route.distance_m)} m`;
}

// -------------------------------------------------
// Place detail hook (lazy fetch when item selected)
// -------------------------------------------------

interface PlaceInfo {
  name_default: string;
  name_en: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website_url: string | null;
  phone_number: string | null;
  popularity_score: number | null;
}

function usePlaceDetails(placeId: string | null): PlaceInfo | null {
  const [placeMap, setPlaceMap] = useState<Record<string, PlaceInfo>>({});
  const fetchedIds = useRef(new Set<string>());

  useEffect(() => {
    if (!placeId || fetchedIds.current.has(placeId)) return;
    fetchedIds.current.add(placeId);
    const supabase = createClient();
    supabase
      .from("places")
      .select(
        "name_default, name_en, category, address, city, country, website_url, phone_number, popularity_score",
      )
      .eq("id", placeId)
      .single()
      .then(({ data }: { data: PlaceInfo | null }) => {
        if (data)
          setPlaceMap((prev) => ({ ...prev, [placeId]: data as PlaceInfo }));
      });
  }, [placeId]);

  return placeId ? (placeMap[placeId] ?? null) : null;
}

// -------------------------------------------------
// Props
// -------------------------------------------------

interface ActivityScheduleProps {
  items: ItineraryItem[];
  routes?: itinerary_item_routes[];
  selectedItemId: string | null;
  editingItemId: string | null;
  dayId: string;
  isApproved: boolean;
  busy: boolean;
  mapCenter?: { lng: number; lat: number };
  mapSelectedPOI?: PlacePointResult | null;
  onSearchResultsChange?: (places: PlacePointResult[]) => void;
  onHoverSearchResult?: (placeId: string | null) => void;
  onMapPOIConsumed?: () => void;
  onSelect: (id: string | null) => void;
  onEdit: (id: string | null) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, updates: Partial<ItineraryItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateTransportTypes?: (routeId: string, types: string[]) => Promise<void>;
  // Adding new (inline at bottom)
  addingItem: boolean;
  nextIndex: number;
  onSaveNew: (item: Partial<ItineraryItem>) => Promise<void>;
  onCancelNew: () => void;
  // Drag-reorder
  onDragStart: (idx: number) => void;
  onDragOver: (idx: number) => void;
  onDragEnd: () => void;
  dragFromIdx: number | null;
  dragOverIdx: number | null;
}

// -------------------------------------------------
// Route connector row
// -------------------------------------------------

function RouteConnector({
  route,
  isEditable,
  onUpdate,
}: {
  route: itinerary_item_routes;
  isEditable?: boolean;
  onUpdate?: (routeId: string, types: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(route.transportation_type ?? []),
  );

  // Re-sync local selection if route prop changes (e.g. after DB save)
  const prevRouteId = route.id + (route.transportation_type ?? []).join(",");
  const [syncKey, setSyncKey] = useState(prevRouteId);
  if (syncKey !== prevRouteId) {
    setSyncKey(prevRouteId);
    setSelected(new Set(route.transportation_type ?? []));
  }

  const toggleType = (val: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  const handleSave = () => {
    onUpdate?.(route.id, [...selected]);
    setEditing(false);
  };

  return (
    <div className="select-none">
      {/* Connector summary row */}
      <div
        className={`flex items-center gap-1.5 py-1.5 px-3 ${isEditable ? "cursor-pointer hover:bg-gray-50 rounded-lg" : ""}`}
        onClick={() => isEditable && setEditing((e) => !e)}
      >
        <div className="flex flex-col items-center w-7 shrink-0">
          <div className="w-px flex-1 bg-gray-200" style={{ minHeight: 14 }} />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 flex-1 flex-wrap">
          <span className="inline-flex text-gray-500">
            <TransportSummaryIcon
              types={[...selected]}
              style={{ fontSize: 15 }}
            />
          </span>
          <span>{routeDuration(route)}</span>
          <span>·</span>
          <span>{routeDistance(route)}</span>
          {route.transportation_type &&
            route.transportation_type.length > 0 && (
              <div className="flex gap-0.5 flex-wrap">
                {route.transportation_type.map((t) => {
                  const tc = getSingleTransportConfig(t);
                  return (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
                      style={{ backgroundColor: tc.color }}
                    >
                      <span className="inline-flex align-middle">
                        <TransportIcon type={t} style={{ fontSize: 11 }} />
                      </span>{" "}
                      {tc.label}
                    </span>
                  );
                })}
              </div>
            )}
        </div>
      </div>

      {/* Editable transport type pills */}
      {editing && (
        <div className="mx-3 mb-2 bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            Transport type
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TRANSPORTATION_TYPES.map(({ value, label }) => {
              const tc = getSingleTransportConfig(value);
              const isOn = selected.has(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleType(value)}
                  className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full transition-all border ${
                    isOn
                      ? "text-white border-transparent"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                  style={
                    isOn
                      ? { backgroundColor: tc.color, borderColor: tc.color }
                      : {}
                  }
                >
                  <span>{tc.emoji}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="text-[11px] bg-blue-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setSelected(new Set(route.transportation_type ?? []));
                setEditing(false);
              }}
              className="text-[11px] text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------
// Activity block
// -------------------------------------------------

interface ActivityBlockProps {
  item: ItineraryItem;
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  disabled: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  isDragOver: boolean;
  isDragging: boolean;
}

function ActivityBlock({
  item,
  index,
  isSelected,
  isEditing,
  disabled,
  onSelect,
  onEdit,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragOver,
  isDragging,
}: ActivityBlockProps) {
  const cfg = getTypeConfig(item.item_type ?? "other");
  const timeLabel = item.start_time ? fmt12(item.start_time) : null;
  const endLabel = item.end_time ? fmt12(item.end_time) : null;

  // Only fetch place details when selected and linked
  const placeDetails = usePlaceDetails(
    isSelected && item.place_table === "places" ? item.place_source_id : null,
  );

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDragEnd={onDragEnd}
      className={`flex gap-0 transition-all group ${
        isDragging
          ? "opacity-40"
          : isDragOver
            ? "border-t-2 border-blue-400"
            : ""
      }`}
    >
      {/* Left time column */}
      <div className="w-12 shrink-0 flex flex-col items-end pr-2 pt-2.5">
        {timeLabel ? (
          <span className="text-[11px] font-bold text-gray-500 leading-tight text-right">
            {timeLabel}
            {endLabel && (
              <>
                <br />
                <span className="text-[10px] text-gray-400">{endLabel}</span>
              </>
            )}
          </span>
        ) : (
          <span
            className="w-5 h-5 rounded-full text-[16px] font-bold flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: cfg.color }}
          >
            {index + 1}
          </span>
        )}
      </div>

      {/* Card block */}
      <div
        className={`relative flex-1 flex border-l-4 rounded-r-xl transition-all cursor-pointer min-w-0 ${
          isEditing ? "shadow-md" : isSelected ? "shadow-sm" : ""
        }`}
        style={{
          borderLeftColor: isEditing
            ? "#f59e0b"
            : isSelected
              ? cfg.color
              : cfg.color + "60",
          backgroundColor: isEditing
            ? "#fffbeb"
            : isSelected
              ? cfg.bg
              : "#fafafa",
        }}
        onClick={onSelect}
      >
        <div className="flex-1 px-3 py-2 min-w-0">
          {/* Title row */}
          <div className="flex items-start gap-1.5 min-w-0 pr-6">
            {timeLabel && (
              <span
                className="shrink-0 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white mt-0.5"
                style={{ backgroundColor: cfg.color }}
              >
                {index + 1}
              </span>
            )}
            <p className="font-semibold text-[13px] text-gray-900 leading-tight truncate">
              {item.title}
            </p>
          </div>

          {/* Collapsed meta: type + duration + linked badge */}
          {!isSelected && (
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap justify-between">
              <div>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm inline-flex items-center gap-0.5 mr-2"
                  style={{
                    backgroundColor: cfg.color + "20",
                    color: cfg.color,
                  }}
                >
                  <ItemTypeIcon
                    type={item.item_type ?? "other"}
                    style={{ fontSize: 10 }}
                  />{" "}
                  {item.item_type}
                </span>
                {item.duration_minutes != null && item.duration_minutes > 0 && (
                  <span className="text-[10px] text-gray-400">
                    {fmtDuration(item.duration_minutes)}
                  </span>
                )}
              </div>
              {item.place_source_id && (
                <span className="text-[10px]  text-green-700 px-1.5 py-0.5 rounded-sm font-medium inline-flex items-center gap-0.5 justify-end">
                  <TaskAltIcon style={{ fontSize: 10 }} />
                </span>
              )}
            </div>
          )}

          {/* Expanded details when selected */}
          {isSelected && (
            <div className="mt-2 space-y-2">
              {/* Type + duration */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm inline-flex items-center gap-0.5"
                  style={{
                    backgroundColor: cfg.color + "20",
                    color: cfg.color,
                  }}
                >
                  <ItemTypeIcon
                    type={item.item_type ?? "other"}
                    style={{ fontSize: 10 }}
                  />{" "}
                  {item.item_type}
                </span>
                {item.duration_minutes != null && item.duration_minutes > 0 && (
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-sm inline-flex items-center gap-0.5">
                    <AccessTimeIcon style={{ fontSize: 10 }} />{" "}
                    {fmtDuration(item.duration_minutes)}
                  </span>
                )}
              </div>

              {/* Place details (if POI linked) */}
              {item.place_source_id && (
                <div
                  className="rounded-lg p-2.5 border space-y-1"
                  style={{
                    backgroundColor: cfg.color + "08",
                    borderColor: cfg.color + "30",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <p className="text-[11px] font-semibold text-gray-800">
                      {placeDetails?.name_en ||
                        placeDetails?.name_default ||
                        item.location_name ||
                        "Linked place"}
                    </p>
                    <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm font-medium shrink-0 inline-flex items-center gap-0.5">
                      <TaskAltIcon style={{ fontSize: 10 }} /> Verified Place
                    </span>
                  </div>
                  {placeDetails?.address && (
                    <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      <LocationOnIcon style={{ fontSize: 10 }} />{" "}
                      {placeDetails.address}
                    </p>
                  )}
                  {placeDetails &&
                    (placeDetails.city || placeDetails.country) && (
                      <p className="text-[10px] text-gray-400">
                        {[placeDetails.city, placeDetails.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  {placeDetails?.website_url && (
                    <a
                      href={placeDetails.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      <LanguageIcon style={{ fontSize: 10 }} /> Website
                    </a>
                  )}
                  {placeDetails?.phone_number && (
                    <p className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      <PhoneIcon style={{ fontSize: 10 }} />{" "}
                      {placeDetails.phone_number}
                    </p>
                  )}
                </div>
              )}

              {/* Location name (no POI) */}
              {!item.place_source_id && item.location_name && (
                <p className="text-[11px] text-gray-500 flex items-center gap-0.5">
                  <LocationOnIcon style={{ fontSize: 11 }} />{" "}
                  {item.location_name}
                </p>
              )}

              {/* Description */}
              {item.description && (
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Notes */}
              {item.notes && (
                <p className="text-[11px] text-gray-400 italic">{item.notes}</p>
              )}

              {/* Booking link */}
              {item.booking_url && (
                <a
                  href={item.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                >
                  <LinkIcon style={{ fontSize: 11 }} /> Booking link
                </a>
              )}
            </div>
          )}
        </div>

        {/* Edit button — floating top-right, appears on hover */}
        {!disabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={`absolute top-1.5 right-6 w-6 h-6 rounded-full flex items-center justify-center text-[11px] bg-white shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow transition-all ${
              isSelected || isEditing
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
            title="Edit"
          >
            <EditIcon style={{ color: "#616161", fontSize: 16 }} />
          </button>
        )}

        {/* Drag handle */}
        {!disabled && (
          <div className="self-center px-1 text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing">
            <DragIndicatorIcon style={{ fontSize: 16 }} />
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------
// Main component
// -------------------------------------------------

export default function ActivitySchedule({
  items,
  routes,
  selectedItemId,
  editingItemId,
  dayId,
  isApproved,
  busy,
  mapCenter,
  mapSelectedPOI,
  onSearchResultsChange,
  onHoverSearchResult,
  onMapPOIConsumed,
  onSelect,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onUpdateTransportTypes,
  addingItem,
  nextIndex,
  onSaveNew,
  onCancelNew,
  onDragStart,
  onDragOver,
  onDragEnd,
  dragFromIdx,
  dragOverIdx,
}: ActivityScheduleProps) {
  // These are still passed through to ActivityEditor for "new" items;
  // for existing items, the parent modal handles save/delete
  void onSaveEdit;
  void onDelete;
  void onCancelEdit;

  const sorted = [...items].sort((a, b) => a.order_index - b.order_index);

  const routeByFromItem = new Map(
    (routes ?? [])
      .filter((r) => r.from_item_id)
      .map((r) => [r.from_item_id!, r]),
  );

  return (
    <div className="space-y-0 pb-2">
      {sorted.flatMap((item, idx) => {
        const elements: React.ReactNode[] = [];

        // Always render ActivityBlock — editing state just highlights it
        // (ActivityEditor for edit is shown as a right-side modal by the parent)
        elements.push(
          <ActivityBlock
            key={item.id}
            item={item}
            index={idx}
            isSelected={selectedItemId === item.id}
            isEditing={editingItemId === item.id}
            disabled={isApproved || busy}
            onSelect={() => {
              if (selectedItemId !== item.id) {
                onSelect(item.id);
                if (editingItemId !== null) onEdit(item.id); // immediately open editor
              } else {
                onSelect(null);
                onEdit(null);
              }
            }}
            onEdit={() => {
              if (editingItemId === item.id) {
                onEdit(null);
              } else {
                onEdit(item.id);
              }
            }}
            onDragStart={() => onDragStart(idx)}
            onDragOver={() => onDragOver(idx)}
            onDragEnd={onDragEnd}
            isDragOver={dragOverIdx === idx && dragFromIdx !== idx}
            isDragging={dragFromIdx === idx}
          />,
        );

        // Route connector with editable transport pills
        const route = routeByFromItem.get(item.id);
        if (route && idx < sorted.length - 1) {
          elements.push(
            <RouteConnector
              key={`route-${route.id}`}
              route={route}
              isEditable={!isApproved && !busy}
              onUpdate={onUpdateTransportTypes}
            />,
          );
        }

        return elements;
      })}

      {/* Add new activity (inline at bottom) */}
      {addingItem && (
        <ActivityEditor
          key="new-activity"
          dayId={dayId}
          nextIndex={nextIndex}
          onSave={onSaveNew}
          onCancel={onCancelNew}
          mapCenter={mapCenter}
          onSearchResultsChange={onSearchResultsChange}
          onHoverSearchResult={onHoverSearchResult}
          mapSelectedPOI={mapSelectedPOI}
          onMapPOIConsumed={onMapPOIConsumed}
        />
      )}
    </div>
  );
}
