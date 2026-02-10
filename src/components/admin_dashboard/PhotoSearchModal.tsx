"use client";

import { useState } from "react";
import { createClient } from "@/src/supabase/client";
import Image from "next/image";

// Standard Unsplash API format
interface UnsplashPhotoStandard {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    links: { html: string };
  };
  alt_description: string | null;
  width: number;
  height: number;
}

// Custom edge function format
interface UnsplashPhotoCustom {
  id: string;
  imageURL: string;
  thumbURL: string;
  alt: string | null;
  photographer: string;
  photographerURL?: string;
}

// Normalized format used in the component
interface NormalizedPhoto {
  id: string;
  imageUrl: string;
  thumbUrl: string;
  alt: string | null;
  photographer: string;
  photographerUrl: string;
}

interface Props {
  query: string;
  onSelect: (url: string, properties: Record<string, string>) => void;
  onClose: () => void;
}

export default function PhotoSearchModal({
  query: initialQuery,
  onSelect,
  onClose,
}: Props) {
  const supabase = createClient();
  const [query, setQuery] = useState(initialQuery);
  const [photos, setPhotos] = useState<NormalizedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Normalize different response formats to a common structure
  const normalizePhotos = (data: unknown): NormalizedPhoto[] => {
    if (!data || typeof data !== "object") return [];

    const d = data as Record<string, unknown>;

    // Custom edge function format: { photos: [...], total, totalPages }
    if (Array.isArray(d.photos)) {
      return (d.photos as UnsplashPhotoCustom[]).map((p) => ({
        id: p.id,
        imageUrl: p.imageURL,
        thumbUrl: p.thumbURL,
        alt: p.alt,
        photographer: p.photographer,
        photographerUrl: p.photographerURL || "",
      }));
    }

    // Standard Unsplash format: { results: [...], total, total_pages }
    if (Array.isArray(d.results)) {
      return (d.results as UnsplashPhotoStandard[]).map((p) => ({
        id: p.id,
        imageUrl: p.urls.regular,
        thumbUrl: p.urls.small,
        alt: p.alt_description,
        photographer: p.user.name,
        photographerUrl: p.user.links.html,
      }));
    }

    // Direct array of photos (either format)
    if (Array.isArray(data)) {
      return (data as (UnsplashPhotoStandard | UnsplashPhotoCustom)[]).map(
        (p) => {
          // Check if it's the custom format
          if ("imageURL" in p) {
            const custom = p as UnsplashPhotoCustom;
            return {
              id: custom.id,
              imageUrl: custom.imageURL,
              thumbUrl: custom.thumbURL,
              alt: custom.alt,
              photographer: custom.photographer,
              photographerUrl: custom.photographerURL || "",
            };
          }
          // Standard format
          const std = p as UnsplashPhotoStandard;
          return {
            id: std.id,
            imageUrl: std.urls.regular,
            thumbUrl: std.urls.small,
            alt: std.alt_description,
            photographer: std.user.name,
            photographerUrl: std.user.links.html,
          };
        },
      );
    }

    return [];
  };

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      // Ensure we have a valid session before invoking
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("You must be logged in to search photos");
      }

      // Use supabase.functions.invoke which auto-attaches JWT
      const { data, error: fnErr } = await supabase.functions.invoke(
        "retrieve_unsplash_photos",
        {
          body: { query: query.trim(), per_page: 20 },
        },
      );

      if (fnErr) {
        throw fnErr;
      }

      const normalized = normalizePhotos(data);
      setPhotos(normalized);

      if (normalized.length === 0) {
        console.warn("No photos found or unexpected format:", data);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error("Photo search error:", e);
      setError(e.message ?? "Failed to fetch photos");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    const photo = photos.find((p) => p.id === selectedId);
    if (!photo) return;
    onSelect(photo.imageUrl, {
      photographer: photo.photographer,
      photographer_url: photo.photographerUrl,
      alt_text: photo.alt ?? "",
      unsplash_id: photo.id,
      source: "unsplash",
    });
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="p-4 border-b flex items-center gap-3">
          <h3 className="font-semibold text-lg">Search Unsplash Photos</h3>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-4 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search for photos..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            onClick={search}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {error && <p className="px-4 text-sm text-red-500">{error}</p>}

        <div className="flex-1 overflow-y-auto p-4">
          {photos.length === 0 && !loading && (
            <p className="text-center text-gray-400 py-10">
              {error ? "" : "Search for photos above"}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedId(photo.id)}
                className={`relative rounded-lg overflow-hidden aspect-4/3 border-2 transition ${
                  selectedId === photo.id
                    ? "border-blue-500 ring-2 ring-blue-300"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                <Image
                  src={photo.thumbUrl}
                  fill
                  alt={photo.alt ?? ""}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-[10px] text-white px-1.5 py-0.5 truncate">
                  {photo.photographer}
                </div>
                {selectedId === photo.id && (
                  <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500">
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedId}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
          >
            Use Selected Photo
          </button>
        </div>
      </div>
    </div>
  );
}
