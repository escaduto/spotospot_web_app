"use client";

import { useState, useRef } from "react";
import type {
  ItineraryDay,
  ItineraryItem,
  itinerary_item_routes,
} from "@/src/supabase/types";
import { createClient } from "@/src/supabase/client";
import Image from "next/image";
import { parsePoint } from "@/src/utils/geo";
import PhotoSearchModal from "./PhotoSearchModal";
import ActivitySchedule from "./ActivitySchedule";
import ActivityEditor from "./ActivityEditor";
import { PlacePointResult } from "@/src/supabase/places";
import DayDetailsMap from "./DayDetailsMap/DayDetailsMap";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

interface Props {
  day: ItineraryDay;
  items: ItineraryItem[];
  routes?: itinerary_item_routes[];
  onBack: () => void;
  refetch: () => void;
}

export default function DayDetailsView({
  day,
  items,
  routes,
  onBack,
  refetch,
}: Props) {
  const supabase = createClient();
  const [showPhotoSearch, setShowPhotoSearch] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [busy, setBusy] = useState(false);
  // Default to first activity so the map centres on it on load
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    () =>
      [...items].sort((a, b) => a.order_index - b.order_index)[0]?.id ?? null,
  );
  const [panelOpen, setPanelOpen] = useState(true);
  const [searchPOIs, setSearchPOIs] = useState<PlacePointResult[]>([]);
  const [hoveredSearchPOIId, setHoveredSearchPOIId] = useState<string | null>(
    null,
  );
  const [mapSelectedPOI, setMapSelectedPOI] = useState<PlacePointResult | null>(
    null,
  );
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isApproved = day.visibility === "public";

  const handlePhotoSelect = async (
    url: string,
    properties: Record<string, string>,
    blur_hash: string | null | undefined,
  ) => {
    await supabase
      .from("itinerary_days")
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
      .from("itinerary_days")
      .update({ visibility: "public" })
      .eq("id", day.id);
    setBusy(false);
    refetch();
  };

  const handleReject = async () => {
    setBusy(true);
    await supabase
      .from("itinerary_days")
      .update({ visibility: "private" })
      .eq("id", day.id);
    setBusy(false);
    refetch();
  };

  const handleUpdateItem = async (
    itemId: string,
    updates: Partial<ItineraryItem>,
  ) => {
    await supabase.from("itinerary_items").update(updates).eq("id", itemId);
    setEditingItemId(null);
    refetch();
  };

  const handleAddItem = async (newItem: Partial<ItineraryItem>) => {
    await supabase
      .from("itinerary_items")
      .insert(newItem as Omit<ItineraryItem, "id">);
    setAddingItem(false);
    refetch();
  };

  const handleDeleteItem = async (itemId: string) => {
    await supabase.from("itinerary_items").delete().eq("id", itemId);
    setEditingItemId(null);
    refetch();
  };

  const handleUpdateRouteTransportTypes = async (
    routeId: string,
    types: string[],
  ) => {
    await supabase
      .from("itinerary_item_routes")
      .update({ transportation_type: types })
      .eq("id", routeId);
    refetch();
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const sorted = [...items].sort((a, b) => a.order_index - b.order_index);
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= sorted.length ||
      toIndex >= sorted.length
    )
      return;

    // Build new order: remove the dragged item, insert at target position
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Collect the original time slots (keyed by order position)
    const originalSlots = sorted.map((item) => ({
      start_time: item.start_time,
      end_time: item.end_time,
    }));

    setBusy(true);
    // Update all items that changed position
    const updates = reordered
      .map((item, idx) => {
        const newOrderIndex = sorted[idx].order_index; // use the original order_index values
        const slot = originalSlots[idx];
        if (
          item.order_index === newOrderIndex &&
          item.start_time === slot.start_time &&
          item.end_time === slot.end_time
        ) {
          return null; // no change
        }
        return supabase
          .from("itinerary_items")
          .update({
            order_index: newOrderIndex,
            start_time: slot.start_time,
            end_time: slot.end_time,
          })
          .eq("id", item.id);
      })
      .filter(Boolean);

    await Promise.all(updates);
    setBusy(false);
    refetch();
  };

  // Clear search POIs when editing stops
  const handleCancelEditing = () => {
    setEditingItemId(null);
    setSearchPOIs([]);
    setMapSelectedPOI(null);
  };

  const handleCancelAdding = () => {
    setAddingItem(false);
    setSearchPOIs([]);
    setMapSelectedPOI(null);
  };

  // Quick-add from map POI click
  const handleQuickAddActivity = async (data: Partial<ItineraryItem>) => {
    const supabase = createClient();
    await supabase
      .from("itinerary_items")
      .insert({ ...data, itinerary_day_id: day.id } as Omit<
        ItineraryItem,
        "id"
      >);
    refetch();
  };

  // Parse rep_point for display
  const repPointParsed = parsePoint(day.rep_point);

  // Get the item currently being edited (for the right-side modal)
  const editingItem = editingItemId
    ? items.find((i) => i.id === editingItemId)
    : null;

  return (
    <div className="relative h-screen overflow-hidden bg-gray-900">
      {/* Full-screen map */}
      <div className="absolute inset-0 z-0">
        <DayDetailsMap
          items={items}
          selectedItemId={selectedItemId}
          editingItemId={editingItemId}
          onSelectItem={setSelectedItemId}
          onUpdateCoords={async (itemId, lng, lat) => {
            const geoPoint = `POINT(${lng} ${lat})`;
            await supabase
              .from("itinerary_items")
              .update({ location_coords: geoPoint })
              .eq("id", itemId);
            refetch();
          }}
          centerPoint={repPointParsed}
          searchPOIs={editingItemId || addingItem ? searchPOIs : []}
          onSelectSearchPOI={setMapSelectedPOI}
          hoveredSearchPOIId={
            editingItemId || addingItem ? hoveredSearchPOIId : null
          }
          routes={routes}
          onQuickAddActivity={handleQuickAddActivity}
          isApproved={isApproved}
        />
      </div>

      {/* ── Left floating panel ──────────────────────────────────── */}
      <div
        className={`absolute left-0 top-0 bottom-0 z-10 flex transition-all duration-300 ${
          panelOpen ? "w-1/2 md:w-1/3 lg:w-1/4" : "w-0"
        }`}
      >
        {/* Panel body */}
        <div
          ref={scrollRef}
          onScroll={() =>
            setHeaderCollapsed((scrollRef.current?.scrollTop ?? 0) > 10)
          }
          className={`flex-1 flex flex-col overflow-y-auto pb-50 bg-white/60 backdrop-blur-sm shadow-2xl transition-opacity duration-300 ${
            panelOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Sticky compact header (visible when scrolled past threshold) */}
          <div
            className={`sticky top-0 z-10 bg-white/60 backdrop-blur-sm border-b border-gray-100 shrink-0 transition-all duration-200 overflow-hidden ${
              headerCollapsed ? "h-12 shadow-sm" : "h-0"
            }`}
          >
            <div className="px-3 h-10 flex items-center gap-2">
              <button
                onClick={onBack}
                className="text-gray-500 hover:text-gray-800 shrink-0 flex items-center"
              >
                <ArrowBackIcon style={{ fontSize: 16 }} />
              </button>
              <div className="flex-1 truncate mt-2">
                <h1 className="font-bold text-sm text-gray-900 truncate">
                  {day.title}
                </h1>
                {(day.city || day.country) && (
                  <p className="text-[11px] text-gray-500 flex items-center gap-0.5">
                    <LocationOnIcon style={{ fontSize: 11 }} />
                    {[day.city, day.country].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>

              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  isApproved
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isApproved ? "Public" : "Draft"}
              </span>
            </div>
          </div>

          {/* Animated collapsible full header */}
          <div
            className={`shrink-0 overflow-hidden transition-all duration-300 ${
              headerCollapsed ? "max-h-0" : "max-h-150"
            }`}
          >
            {/* ── Section 1: Day plan info ─────────────────── */}
            <div className="shrink-0">
              {/* Day image header */}
              {day.image_url ? (
                <div className="relative h-70 w-full">
                  {day.image_url ? (
                    <Image
                      src={day.image_url}
                      alt={day.title ?? "Day image"}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                  {/* Back button */}
                  <button
                    onClick={onBack}
                    className="absolute top-3 left-3 text-white/90 hover:text-white text-sm font-medium flex items-center gap-1"
                  >
                    <ArrowBackIcon style={{ fontSize: 16 }} /> Back
                  </button>
                  {/* Photo change */}
                  <button
                    onClick={() => setShowPhotoSearch(true)}
                    disabled={isApproved}
                    className="absolute top-3 right-3 text-[10px] bg-white/20 hover:bg-white/40 text-white px-2 py-1 rounded-full backdrop-blur-sm transition disabled:opacity-0"
                  >
                    <PhotoCameraIcon style={{ fontSize: 14 }} />
                  </button>
                  {/* Title over image */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h1 className="text-white font-bold text-sm leading-tight line-clamp-2">
                      {day.title}
                    </h1>
                    {(day.city || day.country) && (
                      <p className="text-white/70 text-[11px] mt-0.5 flex items-center gap-0.5">
                        <LocationOnIcon style={{ fontSize: 11 }} />
                        {[day.city, day.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* No image: compact header */
                <div className="p-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={onBack}
                      className="text-gray-500 hover:text-gray-800 text-xs flex items-center gap-1"
                    >
                      <ArrowBackIcon style={{ fontSize: 14 }} /> Back
                    </button>
                    <button
                      onClick={() => setShowPhotoSearch(true)}
                      disabled={isApproved}
                      className="text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-30 flex items-center"
                    >
                      <PhotoCameraIcon style={{ fontSize: 14 }} />
                    </button>
                  </div>
                  <h1 className="font-bold text-sm text-gray-900 mt-1.5 leading-tight">
                    {day.title}
                  </h1>
                  {(day.city || day.country) && (
                    <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-0.5">
                      <LocationOnIcon style={{ fontSize: 11 }} />
                      {[day.city, day.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              )}

              {/* Stats + controls row */}
              <div className="px-3 py-2 flex items-center gap-2 flex-wrap border-b border-gray-100">
                {/* Activity count */}
                <span className="text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                  {items.length}{" "}
                  {items.length === 1 ? "activity" : "activities"}
                </span>

                {/* Date */}
                {day.date && (
                  <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                    <CalendarTodayIcon style={{ fontSize: 11 }} />{" "}
                    {new Date(day.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}

                {/* Status badge */}
                <span
                  className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
                    isApproved
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isApproved ? (
                    <>
                      <CheckIcon style={{ fontSize: 10 }} /> Public
                    </>
                  ) : (
                    "Draft"
                  )}
                </span>

                {/* Approve / reject */}
                {!isApproved ? (
                  <button
                    onClick={handleApprove}
                    disabled={busy}
                    className="text-[11px] bg-green-600 text-white px-2 py-0.5 rounded-full font-medium disabled:opacity-40 hover:bg-green-700 transition"
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    onClick={handleReject}
                    disabled={busy}
                    className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-full font-medium disabled:opacity-40 hover:bg-red-600 transition"
                  >
                    Unpublish
                  </button>
                )}
              </div>

              {/* Category chips */}
              {day.category_type && day.category_type.length > 0 && (
                <div className="px-3 py-1.5 flex flex-wrap gap-1 border-b border-gray-100">
                  {day.category_type.map((c) => (
                    <span
                      key={c}
                      className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize"
                    >
                      {c.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>{" "}
            {/* end animated collapsible header */}
          </div>
          {/* ── Section 2: Activities ─────────────────────── */}
          <div className="flex-1">
            {/* Section header */}
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                Schedule
              </p>
              {!isApproved && (
                <button
                  onClick={() => setAddingItem(true)}
                  disabled={addingItem}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium disabled:opacity-40"
                >
                  <AddIcon />
                </button>
              )}
            </div>

            <div className="px-1 pb-4">
              <ActivitySchedule
                items={items}
                routes={routes}
                selectedItemId={selectedItemId}
                editingItemId={editingItemId}
                dayId={day.id}
                isApproved={isApproved}
                busy={busy}
                mapCenter={repPointParsed ?? undefined}
                mapSelectedPOI={mapSelectedPOI}
                onSelect={setSelectedItemId}
                onEdit={(id) => {
                  setEditingItemId(id);
                  setAddingItem(false);
                }}
                onCancelEdit={handleCancelEditing}
                onSaveEdit={handleUpdateItem}
                onDelete={handleDeleteItem}
                onUpdateTransportTypes={handleUpdateRouteTransportTypes}
                onSearchResultsChange={setSearchPOIs}
                onHoverSearchResult={setHoveredSearchPOIId}
                onMapPOIConsumed={() => setMapSelectedPOI(null)}
                addingItem={addingItem}
                nextIndex={
                  items.length > 0
                    ? Math.max(...items.map((i) => i.order_index)) + 1
                    : 1
                }
                onSaveNew={handleAddItem}
                onCancelNew={handleCancelAdding}
                onDragStart={setDragFromIdx}
                onDragOver={setDragOverIdx}
                onDragEnd={() => {
                  if (
                    dragFromIdx != null &&
                    dragOverIdx != null &&
                    dragFromIdx !== dragOverIdx
                  ) {
                    handleReorder(dragFromIdx, dragOverIdx);
                  }
                  setDragFromIdx(null);
                  setDragOverIdx(null);
                }}
                dragFromIdx={dragFromIdx}
                dragOverIdx={dragOverIdx}
              />
            </div>
          </div>
        </div>

        {/* Collapse / expand toggle — sticks out from right edge */}
        <button
          onClick={() => setPanelOpen((p) => !p)}
          className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-12 bg-white rounded-r-xl shadow-md border border-gray-200 border-l-0 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition z-20"
          title={panelOpen ? "Collapse panel" : "Expand panel"}
        >
          {panelOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </button>
      </div>

      {/* ── Right edit modal (when editing an existing item) ─── */}
      {editingItemId && editingItem && (
        <div className="absolute right-0 top-0 bottom-0 z-20 w-1/3 md:w-1/4 bg-white shadow-2xl flex flex-col overflow-hidden border-l border-gray-200">
          {/* Modal header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Edit Activity
              </p>
              <p className="text-sm font-bold text-gray-900 leading-tight truncate max-w-55">
                {editingItem.title}
              </p>
            </div>
            <button
              onClick={handleCancelEditing}
              className="w-7 h-7 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
            >
              <CloseIcon style={{ fontSize: 16 }} />
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-4">
            <ActivityEditor
              key={editingItemId ?? "edit"}
              item={editingItem}
              dayId={day.id}
              onSave={(updates) => handleUpdateItem(editingItemId, updates)}
              onCancel={handleCancelEditing}
              mapCenter={repPointParsed ?? undefined}
              onSearchResultsChange={setSearchPOIs}
              onHoverSearchResult={setHoveredSearchPOIId}
              mapSelectedPOI={mapSelectedPOI}
              onMapPOIConsumed={() => setMapSelectedPOI(null)}
            />
            {/* Delete button */}
            {!isApproved && (
              <div className="shrink-0 px-4 py-2 border-b border-gray-100">
                <button
                  onClick={async () => {
                    if (confirm("Delete this activity?"))
                      await handleDeleteItem(editingItemId);
                  }}
                  disabled={busy}
                  className="text-xs text-gray-500 hover:text-red-700 font-medium disabled:opacity-40 flex items-center gap-1"
                >
                  <DeleteIcon style={{ fontSize: 14 }} /> Delete activity
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo search modal */}
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
