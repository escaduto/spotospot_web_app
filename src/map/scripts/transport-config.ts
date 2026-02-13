/**
 * Transportation type configuration for route rendering.
 * Maps each TransportationType to visual properties for map display.
 */

export interface TransportConfig {
  label: string;
  icon: string;
  color: string;
  dashArray?: number[];
}

export const transportIconsList = [
  "car",
  "bicycle",
  "rail",
  "airport",
  "ferry",
  "taxi",
  "bicycle-share",
  "car-rental",
  "rail-light",
  "marker",
  "triangle",
] as const;

const TRANSPORT_CONFIGS: Record<string, TransportConfig> = {
  walking: {
    label: "Walking",
    icon: "soccer",
    color: "#22c55e", // green-500
    dashArray: [2, 4],
  },
  running: {
    label: "Running",
    icon: "soccer",
    color: "#16a34a", // green-600
    dashArray: [3, 3],
  },
  hiking: {
    label: "Hiking",
    icon: "soccer",
    color: "#15803d", // green-700
    dashArray: [4, 3],
  },
  driving: {
    label: "Driving",
    icon: "car",
    color: "#3b82f6", // blue-500
  },
  rideshare: {
    label: "Rideshare",
    icon: "taxi",
    color: "#2563eb", // blue-600
  },
  car_rental: {
    label: "Car Rental",
    icon: "car-rental",
    color: "#1d4ed8", // blue-700
  },
  cycling: {
    label: "Cycling",
    icon: "bicycle",
    color: "#f97316", // orange-500
    dashArray: [6, 3],
  },
  bikeshare: {
    label: "Bikeshare",
    icon: "bicycle-share",
    color: "#ea580c", // orange-600
    dashArray: [6, 3],
  },
  flight: {
    label: "Flight",
    icon: "airport",
    color: "#8b5cf6", // violet-500
    dashArray: [8, 6],
  },
  ferry: {
    label: "Ferry",
    icon: "ferry",
    color: "#06b6d4", // cyan-500
    dashArray: [6, 4],
  },
  train: {
    label: "Train",
    icon: "rail",
    color: "#ef4444", // red-500
    dashArray: [10, 4],
  },
  bus: {
    label: "Bus",
    icon: "bus",
    color: "#eab308", // yellow-500
  },
  "muni/tram": {
    label: "Muni/Tram",
    icon: "rail-light",
    color: "#d97706", // amber-600
    dashArray: [8, 3],
  },
  other: {
    label: "Other",
    icon: "marker",
    color: "#6b7280", // gray-500
    dashArray: [4, 4],
  },
};

const DEFAULT_CONFIG: TransportConfig = {
  label: "Route",
  icon: "marker",
  color: "#6b7280",
  dashArray: [4, 4],
};

const MULTIPLE_CONFIG: TransportConfig = {
  label: "Multiple",
  icon: "triangle",
  color: "#a855f7", // purple-500
  dashArray: [5, 3],
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
