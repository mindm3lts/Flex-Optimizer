export type PackageType = "Box" | "Envelope" | "Plastic Bag" | "Custom Sized" | "Unknown";

export type StopType = "House" | "Apartment" | "Business" | "Locker" | "Unknown";

export type RouteStopStatus = 'pending' | 'delivered' | 'attempted' | 'skipped';

export interface RouteStop {
  originalStopNumber: number;
  street: string;
  city: string;
  state: string;
  zip: string;
  label: string;
  packageType: PackageType;
  tba: string;
  packageLabel: string;
  type?: 'delivery' | 'location';
  deliveryWindowEnd?: string; // e.g., "17:00"
  stopType: StopType;
  isPriority?: boolean;
  status?: RouteStopStatus;
  completedAt?: string;
  isCurrentStop?: boolean;
}

export interface RouteSummary {
  totalStops: number;
  totalDistance: string;
  totalTime: string;
  routeBlockCode?: string;
}

export type TrafficStatus = "Light" | "Moderate" | "Heavy" | "Unknown";

export interface TrafficInfo {
  status: TrafficStatus;
  summary: string;
  lastUpdated: string;
}

export type WeatherIconType = "SUNNY" | "CLOUDY" | "RAINY" | "SNOWY" | "THUNDERSTORM" | "WINDY" | "PARTLY_CLOUDY" | "UNKNOWN";

export interface WeatherInfo {
  temperature: string;
  condition: string;
  icon: WeatherIconType;
}

export interface Geolocation {
  lat: number;
  lon: number;
}

export interface User {
  tier: 'Free' | 'Pro';
}