"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDiscoverMap } from "@/src/hooks/useDiscoverMap";
import { useUserLocation } from "@/src/store/locationStore";
import {
  getNearbyPublicPlans,
  getTopDestinations,
  getDayItems,
  type NearbyPlan,
  type TopDestination,
  type DayItem,
} from "@/src/supabase/itineraries";
import { parseWKBCoords } from "@/src/supabase/places";
import DiscoverMap from "./DiscoverMap";
import PlanResultsPanel from "./PlanResultsPanel";
import TopDestinationsPanel from "./TopDestinationsPanel";
import DiscoverSearchBar from "./DiscoverSearchBar";
import DayPlanDetailPanel from "./DayPlanDetailPanel";
import MarkerContextMenu, { type ContextMenuState } from "./MarkerContextMenu";
import AuthModal from "../AuthModal";
import { useAuth } from "@/src/hooks/useAuth";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import SearchIcon from "@mui/icons-material/Search";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  // Map hook
  const {
    mapContainerRef,
    mapLoaded,
    flyTo,
    mapCenter,
    lastMoveTs,
    loadingPOI,
    selectedPOI,
    closePOI,
    showPlanMarkers,
    clearPlanMarkers,
    showActivePlanOnMap,
    clearActivePlanOnMap,
  } = useDiscoverMap();

  // User IP location
  const { location: userLocation } = useUserLocation();

  // Nearby plans state
  const [plans, setPlans] = useState<NearbyPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [lastSearchedCenter, setLastSearchedCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Category filter
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  // Active plan preview
  const [activePlan, setActivePlan] = useState<NearbyPlan | null>(null);
  const [activePlanItems, setActivePlanItems] = useState<DayItem[]>([]);
  const [activePlanLoading, setActivePlanLoading] = useState(false);

  // Top destinations state
  const [destinations, setDestinations] = useState<TopDestination[]>([]);
  const [destsLoading, setDestsLoading] = useState(false);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);

  // Side panel open/close
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Context menu (right-click on plan marker)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Auth modal (shown when unauthenticated user tries to copy)
  const [authOpen, setAuthOpen] = useState(false);

  // Auth state for copy actions
  const { user } = useAuth();

  // Ref to avoid double-fetch in StrictMode
  const hasFetchedRef = useRef(false);
  // ── Show plan markers on the map whenever plans or map load state changes ────

  const handlePlanMarkerClick = useCallback(
    async (plan: NearbyPlan) => {
      setActivePlan(plan);
      setActivePlanItems([]);
      setActivePlanLoading(true);
      setContextMenu(null);
      try {
        const { items, routes } = await getDayItems(plan.id);
        setActivePlanItems(items);
        showActivePlanOnMap(items, routes);
      } finally {
        setActivePlanLoading(false);
      }
    },
    [showActivePlanOnMap],
  );

  const handlePlanMarkerRightClick = useCallback(
    (plan: NearbyPlan, e: MouseEvent) => {
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, plan });
    },
    [],
  );

  useEffect(() => {
    if (!mapLoaded || plans.length === 0) {
      clearPlanMarkers();
      return;
    }
    showPlanMarkers(plans, handlePlanMarkerClick, handlePlanMarkerRightClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, mapLoaded]);

  const handleClosePlanPreview = useCallback(() => {
    setActivePlan(null);
    setActivePlanItems([]);
    clearActivePlanOnMap();
  }, [clearActivePlanOnMap]);
  // ── Load top destinations once ────────────────────────────────────────────

  useEffect(() => {
    setDestsLoading(true);
    getTopDestinations()
      .then(setDestinations)
      .finally(() => setDestsLoading(false));
  }, []);

  // ── Fetch nearby plans ────────────────────────────────────────────────────

  const fetchPlans = useCallback(async (lat: number, lng: number) => {
    setPlansLoading(true);
    setLastSearchedCenter({ lat, lng });
    const data = await getNearbyPublicPlans(lat, lng, 50);
    setPlans(data);
    setPlansLoading(false);
  }, []);

  // ── Auto-fetch on user location resolve ──────────────────────────────────

  useEffect(() => {
    if (!userLocation?.resolved || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    flyTo(userLocation.lng, userLocation.lat, 11);
    fetchPlans(userLocation.lat, userLocation.lng);
  }, [userLocation, flyTo, fetchPlans]);

  // ── "Search here" visibility ─────────────────────────────────────────────
  // Show after ANY moveend/zoomend if we've already done a search

  const showSearchHere = useMemo(() => {
    if (!lastSearchedCenter || lastMoveTs === 0) return false;
    const dist = haversineKm(
      mapCenter.lat,
      mapCenter.lng,
      lastSearchedCenter.lat,
      lastSearchedCenter.lng,
    );
    return dist > 3; // show after ~3 km drift
  }, [mapCenter, lastSearchedCenter, lastMoveTs]);

  const handleSearchHere = useCallback(() => {
    fetchPlans(mapCenter.lat, mapCenter.lng);
    setLeftOpen(true);
  }, [mapCenter, fetchPlans]);

  // ── Closest destination to user ──────────────────────────────────────────

  const closestDestId = useMemo<string | null>(() => {
    if (!userLocation?.resolved || destinations.length === 0) return null;
    let minDist = Infinity;
    let closestId: string | null = null;
    destinations.forEach((dest) => {
      const coords = parseWKBCoords(dest.rep_point);
      if (!coords) return;
      const d = haversineKm(
        userLocation.lat,
        userLocation.lng,
        coords.lat,
        coords.lng,
      );
      if (d < minDist) {
        minDist = d;
        closestId = dest.id;
      }
    });
    return closestId;
  }, [destinations, userLocation]);

  // When destinations load and we have a user location, pre-select the closest group
  useEffect(() => {
    if (!closestDestId || destinations.length === 0 || activeGroupKey !== null)
      return;
    const closest = destinations.find((d) => d.id === closestDestId);
    if (closest?.group_key) setActiveGroupKey(closest.group_key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closestDestId]);

  // ── Category toggle ──────────────────────────────────────────────────────

  const toggleCategory = useCallback((cat: string) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }, []);

  // ── Plan click: fly to + highlight on map ────────────────────────────────

  const handlePlanClick = useCallback(
    (plan: NearbyPlan) => {
      if (plan.lat && plan.lng) {
        flyTo(plan.lng, plan.lat, 14);
      }
    },
    [flyTo],
  );

  // ── Search bar callbacks ─────────────────────────────────────────────────

  const handleSelectPlan = useCallback(
    (plan: {
      id: string;
      title: string;
      city: string | null;
      country: string | null;
    }) => {
      // Show this plan by navigating (open in new tab) or fly to it
      window.open(`/day/${plan.id}`, "_blank");
    },
    [],
  );

  const handleSelectDestination = useCallback(
    (dest: {
      id: string;
      label: string;
      destination_value: string;
      rep_point: string | null;
      bbox: number[] | null;
    }) => {
      const full = destinations.find((d) => d.id === dest.id) ?? {
        ...dest,
        image_url: null,
        group_key: null,
        group_label: null,
      };
      handleDestinationClick(full as TopDestination);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destinations],
  );

  // ── Destination click: fly to bbox or rep_point, fetch plans ─────────────

  const handleDestinationClick = useCallback(
    (dest: TopDestination) => {
      if (dest.bbox && dest.bbox.length === 4) {
        const [minLng, minLat, maxLng, maxLat] = dest.bbox;
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        flyTo(centerLng, centerLat, 10);
        fetchPlans(centerLat, centerLng);
      } else {
        const coords = parseWKBCoords(dest.rep_point);
        if (coords) {
          flyTo(coords.lng, coords.lat, 10);
          fetchPlans(coords.lat, coords.lng);
        }
      }
    },
    [flyTo, fetchPlans],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    // absolute inset-0 fills the relative <main> in page.tsx — no flex height chain
    <div className="absolute inset-0 overflow-hidden bg-gray-200">
      {/* ── Full-screen map (always rendered, never unmounted) ── */}
      <div className="absolute inset-0 z-0">
        <DiscoverMap
          mapContainerRef={mapContainerRef}
          mapLoaded={mapLoaded}
          selectedPOI={selectedPOI}
          loadingPOI={loadingPOI}
          onClosePOI={closePOI}
        />
      </div>

      {/* ── Search bar + map controls (floating over map) ── */}
      <div
        className="absolute top-3 z-20 transition-all duration-300"
        style={{
          left: leftOpen ? 292 : 12,
          right: rightOpen ? 268 : 12,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <DiscoverSearchBar
              onSelectPlan={handleSelectPlan}
              onSelectDestination={handleSelectDestination}
            />
          </div>
          {/* My location */}
          {userLocation?.resolved && (
            <button
              onClick={() => {
                flyTo(userLocation.lng, userLocation.lat, 12);
                fetchPlans(userLocation.lat, userLocation.lng);
              }}
              title="Back to my location"
              className="w-10 h-10 shrink-0 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:border-teal-400 transition"
            >
              <MyLocationIcon style={{ fontSize: 18 }} />
            </button>
          )}
        </div>

        {/* Search here pill */}
        {showSearchHere && (
          <div className="flex justify-center mt-2">
            <button
              onClick={handleSearchHere}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-800 text-sm font-semibold rounded-full shadow-lg border border-gray-200 hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 transition-all"
            >
              <SearchIcon style={{ fontSize: 16 }} />
              Search this area
            </button>
          </div>
        )}
      </div>

      {/* ── Left panel: plan results ── */}
      <div
        className="absolute left-0 top-0 bottom-0 z-10 flex transition-all duration-300"
        style={{ width: leftOpen ? 280 : 0 }}
      >
        {/* Panel body */}
        <div
          className={`flex-1 flex flex-col overflow-hidden bg-white shadow-2xl transition-opacity duration-300 ${
            leftOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <PlanResultsPanel
            plans={plans}
            loading={plansLoading}
            activeCategories={activeCategories}
            onCategoryToggle={toggleCategory}
            onPlanClick={handlePlanClick}
            userCity={userLocation?.city}
          />
        </div>

        {/* Toggle tab */}
        <button
          onClick={() => setLeftOpen((o) => !o)}
          className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-l-0 border-gray-200 rounded-r-lg shadow-md flex items-center justify-center text-gray-500 hover:text-teal-600 hover:bg-teal-50 transition z-20"
          title={leftOpen ? "Collapse plans" : "Expand plans"}
        >
          {leftOpen ? (
            <ChevronLeftIcon style={{ fontSize: 16 }} />
          ) : (
            <ChevronRightIcon style={{ fontSize: 16 }} />
          )}
        </button>
      </div>

      {/* ── Right panel: top destinations ── */}
      <div
        className="absolute right-0 top-0 bottom-0 z-10 flex flex-row-reverse transition-all duration-300"
        style={{ width: rightOpen ? 256 : 0 }}
      >
        {/* Panel body */}
        <div
          className={`flex-1 flex flex-col overflow-hidden bg-white shadow-2xl transition-opacity duration-300 ${
            rightOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <TopDestinationsPanel
            destinations={destinations}
            loading={destsLoading}
            activeGroupKey={activeGroupKey}
            onGroupChange={setActiveGroupKey}
            onDestinationClick={handleDestinationClick}
            closestDestId={closestDestId}
          />
        </div>

        {/* Toggle tab */}
        <button
          onClick={() => setRightOpen((o) => !o)}
          className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-r-0 border-gray-200 rounded-l-lg shadow-md flex items-center justify-center text-gray-500 hover:text-teal-600 hover:bg-teal-50 transition z-20"
          title={rightOpen ? "Collapse places" : "Expand places"}
        >
          {rightOpen ? (
            <ChevronRightIcon style={{ fontSize: 16 }} />
          ) : (
            <ChevronLeftIcon style={{ fontSize: 16 }} />
          )}
        </button>
      </div>

      {/* ── Day plan detail panel ── slides in from left, overlays plan results */}
      <DayPlanDetailPanel
        plan={activePlan}
        items={activePlanItems}
        loading={activePlanLoading}
        onClose={handleClosePlanPreview}
      />

      {/* ── Right-click context menu on plan markers ── */}
      <MarkerContextMenu
        state={contextMenu}
        isAuthenticated={!!user}
        items={activePlanItems}
        onClose={() => setContextMenu(null)}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* ── Auth modal (triggered from context menu when unauthenticated) ── */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
