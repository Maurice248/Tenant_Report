"use client";

import { useState } from "react";
import { useServices } from "@/context/ServicesContext";
import "./newsletter.css";

export default function ManageServices() {
  const { services, addService, removeService } = useServices();
  const [newService, setNewService] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const trimmed = newService.trim();
    if (!trimmed) return;
    if (services.includes(trimmed)) {
      setError("This service already exists.");
      return;
    }
    addService(trimmed);
    setNewService("");
    setError("");
  };

  return (
    <div className="nl-root">
      <div className="nl-grid nl-grid-2">

        {/* ---- Left: Add form ---- */}
        <div className="nl-panel nl-panel-body flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">Add Service</h3>
              <p className="text-xs text-gray-400 mt-0.5">Define medical specialties for newsletters</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="nl-label">New Service Name</label>
            <input
              type="text"
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="e.g. Skin Rejuvenation"
              className="nl-input"
            />
          </div>

          <button onClick={handleAdd} className="nl-btn-primary">
            <span className="text-lg font-light leading-none">+</span>
            ADD SERVICE
          </button>

          {error && (
            <div className="flex items-center gap-3 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* ---- Right: Services list ---- */}
        <div className="nl-panel overflow-hidden flex flex-col min-h-[480px]">
          <div className="nl-panel-header">
            <div className="flex items-center gap-3">
              <h3 className="nl-panel-title">Available Services</h3>
              <span className="nl-count-badge">{services.length}</span>
            </div>
          </div>

          <div className="flex-1 p-5 space-y-2 overflow-y-auto">
            {services.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-400 py-16">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <p className="text-sm font-black text-gray-900 uppercase tracking-widest">No Services Found</p>
                <p className="text-gray-400 text-xs mt-1">Add your first specialty above.</p>
              </div>
            ) : (
              services.map((service) => (
                <div key={service} className="nl-svc-item">
                  <div className="flex items-center gap-3">
                    <div className="nl-svc-dot" />
                    <span className="nl-svc-name">{service}</span>
                  </div>
                  <button onClick={() => removeService(service)} className="nl-svc-delete">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
