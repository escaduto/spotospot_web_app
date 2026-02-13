/**
 * Visual configuration for each `category_group` value from the places table.
 * Used for map markers, legend, popup headers, and search results.
 */

export interface CategoryConfig {
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
}

export const poiCategoryList = [
  "restaurant",
  "hotel",
  "attraction",
  "art-gallery",
  "park-alt1",
  "shop",
  "bar",
  "soccer",
  "bus",
  "town-hall",
] as const;

export const CATEGORY_GROUPS: Record<string, CategoryConfig> = {
  food_and_drink: {
    label: "Food & Drink",
    color: "#E74C3C",
    bgColor: "#FDEDEC",
    icon: "restaurant",
  },
  accommodation: {
    label: "Accommodation",
    color: "#3498DB",
    bgColor: "#EBF5FB",
    icon: "hotel",
  },
  tourism_and_attractions: {
    label: "Tourism",
    color: "#F39C12",
    bgColor: "#FEF9E7",
    icon: "attraction",
  },
  arts_and_culture: {
    label: "Arts & Culture",
    color: "#9B59B6",
    bgColor: "#F4ECF7",
    icon: "art-gallery",
  },
  parks_and_nature: {
    label: "Parks & Nature",
    color: "#27AE60",
    bgColor: "#EAFAF1",
    icon: "park-alt1",
  },
  shopping: {
    label: "Shopping",
    color: "#E91E63",
    bgColor: "#FDEDEC",
    icon: "shop",
  },
  nightlife_and_entertainment: {
    label: "Nightlife",
    color: "#FF6F00",
    bgColor: "#FFF3E0",
    icon: "bar",
  },
  sports_and_activities: {
    label: "Sports",
    color: "#00BCD4",
    bgColor: "#E0F7FA",
    icon: "soccer",
  },
  transit: {
    label: "Transit",
    color: "#607D8B",
    bgColor: "#ECEFF1",
    icon: "bus",
  },
  public_and_civic: {
    label: "Public & Civic",
    color: "#795548",
    bgColor: "#EFEBE9",
    icon: "town-hall",
  },
};

export const DEFAULT_CATEGORY: CategoryConfig = {
  label: "Other",
  color: "#95A5A6",
  bgColor: "#F2F3F4",
  icon: "park",
};

export function getCategoryConfig(
  categoryGroup: string | null | undefined,
): CategoryConfig {
  if (!categoryGroup) return DEFAULT_CATEGORY;
  return CATEGORY_GROUPS[categoryGroup] ?? DEFAULT_CATEGORY;
}

export const ALL_CATEGORY_GROUPS = Object.keys(CATEGORY_GROUPS);
