/**
 * Visual configuration for each `category_group` value from the places table.
 * Used for map markers, legend, popup headers, and search results.
 */

export interface CategoryConfig {
  label: string;
  color: string;
  emoji: string;
  bgColor: string;
}

export const CATEGORY_GROUPS: Record<string, CategoryConfig> = {
  food_and_drink: {
    label: "Food & Drink",
    color: "#E74C3C",
    emoji: "🍴",
    bgColor: "#FDEDEC",
  },
  accommodation: {
    label: "Accommodation",
    color: "#3498DB",
    emoji: "🏨",
    bgColor: "#EBF5FB",
  },
  tourism_and_attractions: {
    label: "Tourism",
    color: "#F39C12",
    emoji: "📸",
    bgColor: "#FEF9E7",
  },
  arts_and_culture: {
    label: "Arts & Culture",
    color: "#9B59B6",
    emoji: "🎨",
    bgColor: "#F4ECF7",
  },
  parks_and_nature: {
    label: "Parks & Nature",
    color: "#27AE60",
    emoji: "🌿",
    bgColor: "#EAFAF1",
  },
  shopping: {
    label: "Shopping",
    color: "#E91E63",
    emoji: "🛍️",
    bgColor: "#FCE4EC",
  },
  nightlife_and_entertainment: {
    label: "Nightlife",
    color: "#FF6F00",
    emoji: "🎵",
    bgColor: "#FFF3E0",
  },
  sports_and_activities: {
    label: "Sports",
    color: "#00BCD4",
    emoji: "⚽",
    bgColor: "#E0F7FA",
  },
  transit: {
    label: "Transit",
    color: "#607D8B",
    emoji: "🚌",
    bgColor: "#ECEFF1",
  },
  public_and_civic: {
    label: "Public & Civic",
    color: "#795548",
    emoji: "🏛️",
    bgColor: "#EFEBE9",
  },
};

export const DEFAULT_CATEGORY: CategoryConfig = {
  label: "Other",
  color: "#95A5A6",
  emoji: "📍",
  bgColor: "#F2F3F4",
};

export function getCategoryConfig(
  categoryGroup: string | null | undefined,
): CategoryConfig {
  if (!categoryGroup) return DEFAULT_CATEGORY;
  return CATEGORY_GROUPS[categoryGroup] ?? DEFAULT_CATEGORY;
}

export const ALL_CATEGORY_GROUPS = Object.keys(CATEGORY_GROUPS);
