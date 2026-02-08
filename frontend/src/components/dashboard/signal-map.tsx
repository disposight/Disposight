"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Signal } from "@/lib/api";

// US state centroids for fallback geocoding
const STATE_COORDS: Record<string, [number, number]> = {
  AL: [32.806671, -86.79113],
  AK: [61.370716, -152.404419],
  AZ: [33.729759, -111.431221],
  AR: [34.969704, -92.373123],
  CA: [36.116203, -119.681564],
  CO: [39.059811, -105.311104],
  CT: [41.597782, -72.755371],
  DE: [39.318523, -75.507141],
  FL: [27.766279, -81.686783],
  GA: [33.040619, -83.643074],
  HI: [21.094318, -157.498337],
  ID: [44.240459, -114.478773],
  IL: [40.349457, -88.986137],
  IN: [39.849426, -86.258278],
  IA: [42.011539, -93.210526],
  KS: [38.5266, -96.726486],
  KY: [37.66814, -84.670067],
  LA: [31.169546, -91.867805],
  ME: [44.693947, -69.381927],
  MD: [39.063946, -76.802101],
  MA: [42.230171, -71.530106],
  MI: [43.326618, -84.536095],
  MN: [45.694454, -93.900192],
  MS: [32.741646, -89.678696],
  MO: [38.456085, -92.288368],
  MT: [46.921925, -110.454353],
  NE: [41.12537, -98.268082],
  NV: [38.313515, -117.055374],
  NH: [43.452492, -71.563896],
  NJ: [40.298904, -74.521011],
  NM: [34.840515, -106.248482],
  NY: [42.165726, -74.948051],
  NC: [35.630066, -79.806419],
  ND: [47.528912, -99.784012],
  OH: [40.388783, -82.764915],
  OK: [35.565342, -96.928917],
  OR: [44.572021, -122.070938],
  PA: [40.590752, -77.209755],
  RI: [41.680893, -71.51178],
  SC: [33.856892, -80.945007],
  SD: [44.299782, -99.438828],
  TN: [35.747845, -86.692345],
  TX: [31.054487, -97.563461],
  UT: [40.150032, -111.862434],
  VT: [44.045876, -72.710686],
  VA: [37.769337, -78.169968],
  WA: [47.400902, -121.490494],
  WV: [38.491226, -80.954456],
  WI: [44.268543, -89.616508],
  WY: [42.755966, -107.30249],
  DC: [38.897438, -77.026817],
};

// Major US cities for better positioning
const CITY_COORDS: Record<string, [number, number]> = {
  "New York,NY": [40.7128, -74.006],
  "Los Angeles,CA": [34.0522, -118.2437],
  "Chicago,IL": [41.8781, -87.6298],
  "Houston,TX": [29.7604, -95.3698],
  "Phoenix,AZ": [33.4484, -112.074],
  "Philadelphia,PA": [39.9526, -75.1652],
  "San Antonio,TX": [29.4241, -98.4936],
  "San Diego,CA": [32.7157, -117.1611],
  "Dallas,TX": [32.7767, -96.797],
  "San Jose,CA": [37.3382, -121.8863],
  "Austin,TX": [30.2672, -97.7431],
  "San Francisco,CA": [37.7749, -122.4194],
  "Seattle,WA": [47.6062, -122.3321],
  "Denver,CO": [39.7392, -104.9903],
  "Boston,MA": [42.3601, -71.0589],
  "Nashville,TN": [36.1627, -86.7816],
  "Detroit,MI": [42.3314, -83.0458],
  "Portland,OR": [45.5152, -122.6784],
  "Las Vegas,NV": [36.1699, -115.1398],
  "Atlanta,GA": [33.749, -84.388],
  "Miami,FL": [25.7617, -80.1918],
  "Minneapolis,MN": [44.9778, -93.265],
  "Tampa,FL": [27.9506, -82.4572],
  "Charlotte,NC": [35.2271, -80.8431],
  "Raleigh,NC": [35.7796, -78.6382],
  "St. Louis,MO": [38.627, -90.1994],
  "Pittsburgh,PA": [40.4406, -79.9959],
  "Cincinnati,OH": [39.1031, -84.512],
  "Cleveland,OH": [41.4993, -81.6944],
  "Orlando,FL": [28.5383, -81.3792],
  "Sacramento,CA": [38.5816, -121.4944],
  "Irvine,CA": [33.6846, -117.8265],
  "Hayward,CA": [37.6688, -122.0808],
  "Chula Vista,CA": [32.6401, -117.0842],
  "Fresno,CA": [36.7378, -119.7871],
  "Oakland,CA": [37.8044, -122.2712],
  "Long Beach,CA": [33.767, -118.1892],
  "Bakersfield,CA": [35.3733, -119.0187],
  "Riverside,CA": [33.9806, -117.3755],
  "Santa Ana,CA": [33.7455, -117.8677],
  "Anaheim,CA": [33.8366, -117.9143],
  "Stockton,CA": [37.9577, -121.2908],
  "Chino,CA": [34.0122, -117.6889],
  "Tustin,CA": [33.7459, -117.8261],
  "Santa Fe Springs,CA": [33.9472, -118.0854],
  "City of Industry,CA": [34.0197, -117.9587],
};

function getCoords(city: string | null, state: string | null): [number, number] | null {
  if (!state) return null;
  const st = state.toUpperCase().trim();

  if (city) {
    const key = `${city.trim()},${st}`;
    if (CITY_COORDS[key]) return CITY_COORDS[key];
  }

  // Add small random offset so overlapping state markers don't stack
  if (STATE_COORDS[st]) {
    const [lat, lng] = STATE_COORDS[st];
    const jitter = () => (Math.random() - 0.5) * 0.5;
    return [lat + jitter(), lng + jitter()];
  }

  return null;
}

function severityColor(score: number): string {
  if (score >= 8) return "#ef4444"; // red
  if (score >= 6) return "#f97316"; // orange
  if (score >= 4) return "#eab308"; // yellow
  return "#22c55e"; // green
}

function signalTypeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SignalMapProps {
  signals: Signal[];
}

export default function SignalMap({ signals }: SignalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center: [39.8283, -98.5795], // US center
      zoom: 4,
      zoomControl: true,
      attributionControl: false,
    });

    // CartoDB Dark Matter tiles
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    // Add attribution in bottom-right
    L.control
      .attribution({ position: "bottomright" })
      .addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
      )
      .addTo(map);

    // Add signal markers
    const markers: L.CircleMarker[] = [];

    for (const signal of signals) {
      const coords = getCoords(signal.location_city, signal.location_state);
      if (!coords) continue;

      const color = severityColor(signal.severity_score);
      const radius = Math.max(5, Math.min(15, (signal.severity_score / 10) * 15));

      const marker = L.circleMarker(coords, {
        radius,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.5,
      }).addTo(map);

      const employees = signal.affected_employees
        ? `${signal.affected_employees.toLocaleString()} employees`
        : "Unknown headcount";
      const devices = signal.device_estimate
        ? `~${signal.device_estimate.toLocaleString()} devices`
        : "";

      marker.bindPopup(
        `<div style="font-family: var(--font-geist-sans, sans-serif); min-width: 200px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${signal.company_name || "Unknown"}</div>
          <div style="font-size: 12px; color: #a1a1aa; margin-bottom: 6px;">
            ${signalTypeLabel(signal.signal_type)}
          </div>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 2px;">
            <span>${employees}${devices ? " | " + devices : ""}</span>
            <span>${signal.location_city || ""}${signal.location_state ? ", " + signal.location_state : ""}</span>
            <span style="color: ${color}; font-weight: 600;">Severity: ${signal.severity_score}/10</span>
          </div>
        </div>`,
        {
          className: "dark-popup",
        }
      );

      markers.push(marker);
    }

    // Fit bounds if markers exist
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [signals]);

  return (
    <>
      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: #18181b;
          color: #fafafa;
          border: 1px solid #27272a;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,.3);
        }
        .dark-popup .leaflet-popup-tip {
          background: #18181b;
          border: 1px solid #27272a;
        }
        .leaflet-control-zoom a {
          background: #18181b !important;
          color: #fafafa !important;
          border-color: #27272a !important;
        }
        .leaflet-control-zoom a:hover {
          background: #27272a !important;
        }
      `}</style>
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg"
        style={{ minHeight: "400px" }}
      />
    </>
  );
}
