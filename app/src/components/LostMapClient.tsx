"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "./LostMap";

// Leaflet needs `window`; load the map only in the browser so the server render
// never evaluates it. The placeholder keeps the layout from jumping.
const LostMap = dynamic(() => import("./LostMap").then((m) => m.LostMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] min-[720px]:h-[440px] rounded-[16px] bg-panel2 flex items-center justify-center">
      <span className="label">Loading map</span>
    </div>
  ),
});

export function LostMapClient({ pins }: { pins: MapPin[] }) {
  return <LostMap pins={pins} className="h-[320px] min-[720px]:h-[440px] rounded-[16px] overflow-hidden border border-line" />;
}
