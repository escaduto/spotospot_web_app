// ─── POI filter groups (same shape as DayDetailsMap's MapPOIFilter) ───────────

interface FilterGroup {
  key: string;
  categoryGroup: string | string[];
  label: string;
  color: string;
  subcategories: { key: string; label: string }[];
}

export const FILTER_GROUPS: FilterGroup[] = [
  {
    key: "eat",
    categoryGroup: "food_and_drink",
    label: "Food & Drink",
    color: "#E74C3C",
    subcategories: [
      { key: "restaurant", label: "Restaurant" },
      { key: "cafe", label: "Café" },
      { key: "bakery", label: "Bakery" },
      { key: "bar", label: "Bar" },
      { key: "fast_food_restaurant", label: "Fast Food" },
      { key: "ice_cream_shop", label: "Ice Cream" },
      { key: "dessert_shop", label: "Dessert" },
    ],
  },
  {
    key: "nature",
    categoryGroup: "parks_and_nature",
    label: "Parks & Nature",
    color: "#27AE60",
    subcategories: [
      { key: "park", label: "Park" },
      { key: "beach", label: "Beach" },
      { key: "hiking_trail", label: "Hiking" },
      { key: "garden", label: "Garden" },
      { key: "nature_reserve", label: "Nature Reserve" },
    ],
  },
  {
    key: "sightseeing",
    categoryGroup: ["tourism_and_attractions", "arts_and_culture"],
    label: "Sights",
    color: "#F39C12",
    subcategories: [
      { key: "tourist_attraction", label: "Attraction" },
      { key: "landmark", label: "Landmark" },
      { key: "museum", label: "Museum" },
      { key: "viewpoint", label: "Viewpoint" },
    ],
  },
  {
    key: "shopping",
    categoryGroup: "shopping",
    label: "Shopping",
    color: "#E91E63",
    subcategories: [
      { key: "shopping_mall", label: "Mall" },
      { key: "market", label: "Market" },
    ],
  },
  {
    key: "nightlife",
    categoryGroup: "nightlife_and_entertainment",
    label: "Nightlife",
    color: "#FF6F00",
    subcategories: [
      { key: "nightclub", label: "Nightclub" },
      { key: "bar", label: "Bar" },
      { key: "rooftop_bar", label: "Rooftop Bar" },
    ],
  },
  {
    key: "accommodation",
    categoryGroup: "accommodation",
    label: "Stay",
    color: "#3498DB",
    subcategories: [
      { key: "hotel", label: "Hotel" },
      { key: "hostel", label: "Hostel" },
      { key: "resort", label: "Resort" },
    ],
  },
];
