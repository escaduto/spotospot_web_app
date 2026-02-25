/**
 * Transportation type configuration for route rendering.
 * Maps each TransportationType to visual properties for map display.
 */

export interface TransportConfig {
  label: string;
  icon: string;
  color: string;
  dashArray?: number[];
  emoji: string;
}

const TRANSPORT_CONFIGS: Record<string, TransportConfig> = {
  walking: {
    label: "Walking",
    icon: "pedestrian",
    color: "#22c55e", // green-500
    dashArray: [2, 4],
    emoji: "🚶",
  },
  running: {
    label: "Running",
    icon: "cross_country_skiing",
    color: "#16a34a", // green-600
    dashArray: [3, 3],
    emoji: "🏃",
  },
  hiking: {
    label: "Hiking",
    icon: "climbing",
    color: "#15803d", // green-700
    dashArray: [4, 3],
    emoji: "🥾",
  },
  driving: {
    label: "Driving",
    icon: "car",
    color: "#3b82f6", // blue-500
    emoji: "🚗",
  },
  rideshare: {
    label: "Rideshare",
    icon: "taxi",
    color: "#2563eb", // blue-600
    emoji: "🚕",
  },
  car_rental: {
    label: "Car Rental",
    icon: "car-rental",
    color: "#1d4ed8", // blue-700
    emoji: "🚙",
  },
  cycling: {
    label: "Cycling",
    icon: "bicycle",
    color: "#f97316", // orange-500
    emoji: "🚲",
  },
  bikeshare: {
    label: "Bikeshare",
    icon: "bicycle-share",
    color: "#ea580c", // orange-600
    emoji: "🚲",
  },
  flight: {
    label: "Flight",
    icon: "airport",
    color: "#8b5cf6", // violet-500
    dashArray: [8, 6],
    emoji: "✈️",
  },
  ferry: {
    label: "Ferry",
    icon: "ferry",
    color: "#06b6d4", // cyan-500
    dashArray: [6, 4],
    emoji: "⛴️",
  },
  train: {
    label: "Train",
    icon: "rail",
    color: "#4f4f4f", // gray-500
    emoji: "🚆",
  },
  bus: {
    label: "Bus",
    icon: "bus",
    color: "#eab308", // yellow-500
    emoji: "🚌",
  },
  "muni/tram": {
    label: "Muni/Tram",
    icon: "rail-light",
    color: "#d97706", // amber-600
    dashArray: [8, 3],
    emoji: "🚋",
  },
  other: {
    label: "Other",
    icon: "marker",
    color: "#6b7280", // gray-500
    dashArray: [4, 4],
    emoji: "📍",
  },
};

const DEFAULT_CONFIG: TransportConfig = {
  label: "Route",
  icon: "marker",
  color: "#6b7280",
  dashArray: [4, 4],
  emoji: "📍",
};

const MULTIPLE_CONFIG: TransportConfig = {
  label: "Multiple",
  icon: "triangle",
  color: "#a855f7", // purple-500
  dashArray: [5, 3],
  emoji: "✨",
};

/**
 * Get config for a transport type array.
 * Returns "Multiple" config when >1 type, single config for 1 type.
 */
export function getTransportConfig(
  types: string[] | undefined | null,
): TransportConfig {
  if (!types || types.length === 0) return DEFAULT_CONFIG;
  if (types.length > 1) return MULTIPLE_CONFIG;
  return TRANSPORT_CONFIGS[types[0]] ?? DEFAULT_CONFIG;
}

/** Get config for a single transport type string */
export function getSingleTransportConfig(
  type: string | undefined | null,
): TransportConfig {
  if (!type) return DEFAULT_CONFIG;
  return TRANSPORT_CONFIGS[type] ?? DEFAULT_CONFIG;
}

export const TRANSPORTATION_TYPES = Object.entries(TRANSPORT_CONFIGS).map(
  ([value, config]) => ({
    value,
    label: config.label,
    icon: config.icon,
  }),
);
