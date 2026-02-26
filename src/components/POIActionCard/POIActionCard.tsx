// -------------------------------------------------
// Action card shown when user clicks a search-result POI on map
// -------------------------------------------------

import { getPOIConfig } from "@/src/map/scripts/poi-config";
import { PlacePointResult } from "@/src/supabase/places";
import { ItineraryItem } from "@/src/supabase/types";
import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import LanguageIcon from "@mui/icons-material/Language";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import LocationOnIcon from "@mui/icons-material/LocationOn";

interface SearchPOIActionCardProps {
  place: PlacePointResult;
  editingItemId: string | null;
  nextIndex: number;
  onAddActivity: (data: Partial<ItineraryItem>) => void;
  onReplaceActivity: (place: PlacePointResult) => void;
  onDismiss: () => void;
}

function SearchPOIActionCard({
  place,
  editingItemId,
  nextIndex,
  onAddActivity,
  onReplaceActivity,
  onDismiss,
}: SearchPOIActionCardProps) {
  const cfg = getPOIConfig(place.category);
  const [title, setTitle] = useState(place.name_default);

  const location = [place.address, place.city, place.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: cfg.color }}
          >
            <PlaceIcon style={{ fontSize: 14 }} />
          </span>
          <div>
            <p className="text-xs font-semibold text-gray-900 leading-tight">
              {place.name_en || place.name_default}
            </p>
            <p className="text-[10px] text-gray-400">{cfg.label}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 shrink-0"
        >
          <CloseIcon style={{ fontSize: 16 }} />
        </button>
      </div>

      {/* Location */}
      {location && (
        <p className="text-[11px] text-gray-500 flex items-center gap-0.5">
          <LocationOnIcon style={{ fontSize: 12 }} /> {location}
        </p>
      )}

      {/* Extra details */}
      {place?.website_url && (
        <a
          href={place.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
        >
          <LanguageIcon style={{ fontSize: 11 }} /> Website
        </a>
      )}
      {place?.phone_number && (
        <p className="text-[11px] text-gray-500 flex items-center gap-0.5">
          <PhoneIcon style={{ fontSize: 11 }} /> {place.phone_number}
        </p>
      )}

      {/* Title override */}
      <div>
        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          Activity title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() =>
            onAddActivity({
              title:
                title.trim() ||
                place.name_default ||
                place.name_en ||
                "Untitled Activity",
              location_name: place.name_en || place.name_default,
              location_coords: `POINT(${place.lng} ${place.lat})`,
              place_source_id: place.id || null,
              place_table: place.place_table || "places",
              order_index: nextIndex,
              item_type: "activity",
            })
          }
          disabled={!place.name_default?.trim()}
          className="flex-1 bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-xl disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          + Add Activity
        </button>
        {editingItemId && (
          <button
            onClick={() => onReplaceActivity(place)}
            className="text-xs text-blue-600 border border-blue-300 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors font-medium"
          >
            Replace
          </button>
        )}
        <button
          onClick={onDismiss}
          className="text-xs text-gray-500 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

export default SearchPOIActionCard;
