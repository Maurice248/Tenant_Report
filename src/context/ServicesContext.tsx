"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_SERVICES, getServices, saveServices } from "@/lib/services-store";

interface ServicesContextType {
  services: string[];
  addService: (name: string) => void;
  removeService: (name: string) => void;
}

const ServicesContext = createContext<ServicesContextType>({
  services: DEFAULT_SERVICES,
  addService: () => {},
  removeService: () => {},
});

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<string[]>(DEFAULT_SERVICES);

  useEffect(() => {
    setServices(getServices());
  }, []);

  const addService = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || services.includes(trimmed)) return;
    const updated = [...services, trimmed];
    setServices(updated);
    saveServices(updated);
  };

  const removeService = (name: string) => {
    const updated = services.filter((s) => s !== name);
    setServices(updated);
    saveServices(updated);
  };

  return (
    <ServicesContext.Provider value={{ services, addService, removeService }}>
      {children}
    </ServicesContext.Provider>
  );
}

export const useServices = () => useContext(ServicesContext);
