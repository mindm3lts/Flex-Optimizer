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
}
