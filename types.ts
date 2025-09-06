export type PackageType = "Box" | "Envelope" | "Plastic Bag" | "Custom Sized" | "Unknown";

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

export interface Geolocation {
  lat: number;
  lon: number;
}