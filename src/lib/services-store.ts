export const DEFAULT_SERVICES = [
  "Tenant Reports",
  "Smart Tenant Subscription",
  "Rent Promise & Protection",
  "Background Screening",
  "Property Management",
  "Other Service",
];

const STORAGE_KEY = "tenant_newsletter_services_v1";

export function getServices(): string[] {
  if (typeof window === "undefined") return DEFAULT_SERVICES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored
      ? JSON.parse(stored).map((s: string) => (s === "Credit Reports" ? "Property Management" : s))
      : DEFAULT_SERVICES;
  } catch {
    return DEFAULT_SERVICES;
  }
}

export function saveServices(services: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
}
