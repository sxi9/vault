"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

/** A finder location event joined to its item. Plain data so it can cross the server/client boundary. */
export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  text: string | null;
  createdAt: string;
  itemNickname: string;
  itemCode: string;
  itemLost: boolean;
};

const FALLBACK: [number, number] = [52.52, 13.405];
const LIME = "#c9f33f";
const RED = "#ff6b61";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Leaflet map of finder pins. Imported only on the client (see LostMapClient)
 * and Leaflet itself is loaded inside the effect, so it never touches `window`
 * during server rendering. OpenStreetMap tiles, no API key.
 */
export function LostMap({ pins, className = "" }: { pins: MapPin[]; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    const node = el.current;
    if (!node) return;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !node) return;

      const map = L.map(node, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      if (pins.length === 0) {
        map.setView(FALLBACK, 11);
        return;
      }

      const bounds = L.latLngBounds([]);
      for (const p of pins) {
        const colour = p.itemLost ? RED : LIME;
        const m = L.circleMarker([p.lat, p.lng], {
          radius: 9,
          color: "#0e0e11",
          weight: 2,
          fillColor: colour,
          fillOpacity: 0.95,
        }).addTo(map);
        const parts = [esc(p.itemNickname), p.text ? esc(p.text) : null, esc(fmtDate(p.createdAt))].filter(Boolean);
        m.bindPopup(
          `<div style="font-family:var(--font-dm-sans),system-ui,sans-serif;font-size:13px;line-height:1.4;color:#121214">` +
            `<strong style="font-family:var(--font-unbounded),sans-serif;letter-spacing:-0.02em">${esc(p.itemNickname)}</strong>` +
            `<span style="font-family:var(--font-jetbrains),monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5d5c66;margin-left:6px">${esc(p.itemCode)}${p.itemLost ? " · LOST" : ""}</span>` +
            `<div style="margin-top:4px">${parts.slice(1).join(" · ")}</div></div>`,
        );
        bounds.extend([p.lat, p.lng]);
      }
      if (pins.length === 1) map.setView([pins[0]!.lat, pins[0]!.lng], 15);
      else map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // pins are serialised server data; the map is rebuilt when they change.
  }, [pins]);

  return (
    <>
      <style>{`
        .loot-map { background: var(--panel2); }
        .loot-map .leaflet-container { font-family: var(--font-dm-sans), system-ui, sans-serif; }
        :root:not([data-theme="light"]) .loot-map .leaflet-tile-pane {
          filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.9) saturate(0.6);
        }
        .loot-map .leaflet-control-zoom a { background: #16161b; color: #f1f0ea; border-color: #2a2a32; }
        :root[data-theme="light"] .loot-map .leaflet-control-zoom a { background: #fff; color: #121214; border-color: #e2e0d7; }
        .loot-map .leaflet-popup-content-wrapper { border-radius: 14px; background: #f3f1ea; box-shadow: 0 18px 40px rgba(0,0,0,.4); }
        .loot-map .leaflet-popup-tip { background: #f3f1ea; }
        .loot-map .leaflet-popup-content { margin: 12px 14px; }
        .loot-map .leaflet-control-attribution { font-size: 10px; background: rgba(243,241,234,.85); color: #5d5c66; }
      `}</style>
      <div ref={el} className={`loot-map w-full ${className}`} role="region" aria-label="Map of places where your items were found" />
    </>
  );
}
