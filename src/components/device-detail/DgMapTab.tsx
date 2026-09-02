"use client";

// ============================================================================
// DG MAP — installed-location view for a stationary generator
// ----------------------------------------------------------------------------
// MapTab delegates here when asset_name === "DG". The vehicle map draws a route
// polyline and offers 24h / today playback, which for a genset is a tangle of
// GNSS jitter around one point dressed up as a journey.
//
// This shows the one thing that matters: where the unit is, how tightly its
// fixes cluster, and whether that cluster has drifted past DG_MOVED_KM — the
// same threshold the Analytics tab and the weekly report use.
//
// TODO: the plan is a 3D genset model rendered on the map rather than a plain
// marker. This is the flat version; the position/drift logic below is what the
// richer view would sit on top of.
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import { Device } from "@/types";
import { THEME } from "@/lib/theme";
import { timeAgo } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

interface DgMapTabProps {
  device: Device;
}

interface Movement {
  spread_km: number | null;
  fixes: number;
  moved: boolean;
  threshold_km: number;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_time: string | null;
}

const WINDOWS: { key: number; label: string }[] = [
  { key: 7,  label: "7D" },
  { key: 30, label: "30D" },
  { key: 90, label: "90D" },
];

export function DgMapTab({ device }: DgMapTabProps) {
  const isMobile = useIsMobile();
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<any[]>([]);

  const [days, setDays] = useState(30);
  const [movement, setMovement] = useState<Movement | null>(null);
  const [loading, setLoading] = useState(true);

  const lat = Number(device.last_latitude);
  const lon = Number(device.last_longitude);
  const hasPosition =
    device.last_latitude != null && device.last_longitude != null &&
    !isNaN(lat) && !isNaN(lon) && !(lat === 0 && lon === 0);

  // ── Drift figures come from the DG analytics endpoint, so the map and the
  //    Analytics tab can never disagree about whether the unit has moved. ────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/dg?device_id=${device.id}&days=${days}`);
        const data = await res.json();
        if (!cancelled) setMovement(data.success ? data.movement : null);
      } catch {
        if (!cancelled) setMovement(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [device.id, days]);

  // ── Map ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasPosition || !mapContainerRef.current) return;

    let disposed = false;
    import("leaflet").then((L) => {
      if (disposed || !mapContainerRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      // Zoom 17 frames a single installation; the vehicle map's 15 is chosen to
      // fit a route and leaves a genset as a dot in an empty field.
      const map = L.map(mapContainerRef.current, { scrollWheelZoom: false }).setView([lat, lon], 17);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      layersRef.current.forEach((l) => { try { l.remove(); } catch {} });
      layersRef.current = [];

      const moved = movement?.moved === true;
      const accent = moved ? "#dc2626" : "#16a34a";

      // The spread circle is drawn only when there are enough fixes to mean
      // something; a radius invented from three points would imply precision
      // the data does not have.
      if (movement?.spread_km != null && movement.spread_km > 0) {
        const circle = L.circle([lat, lon], {
          radius: (movement.spread_km * 1000) / 2,
          color: accent, weight: 2, fillColor: accent, fillOpacity: 0.08,
        }).addTo(map);
        layersRef.current.push(circle);
      }

      const marker = L.circleMarker([lat, lon], {
        radius: 9, color: "#ffffff", weight: 3,
        fillColor: accent, fillOpacity: 1,
      }).addTo(map);
      marker.bindPopup(
        `<b>${device.device_name || device.imei}</b><br/>` +
        `${lat.toFixed(5)}, ${lon.toFixed(5)}<br/>` +
        (device.last_location_time ? `Fix ${timeAgo(device.last_location_time)}` : "")
      );
      layersRef.current.push(marker);

      // Leaflet mis-measures its container when the tab mounts hidden.
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 120);
    });

    return () => {
      disposed = true;
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }
    };
  }, [device.id, device.device_name, device.imei, device.last_location_time, lat, lon, hasPosition, movement]);

  const cardStyle: React.CSSProperties = {
    background: "white", borderRadius: 14, border: `2px solid ${THEME.border.light}`,
    padding: isMobile ? 16 : 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  };

  return (
    <div style={{ padding: isMobile ? 14 : 24, background: THEME.background.secondary, minHeight: "100%", overflowY: "auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between", alignItems: isMobile ? "stretch" : "flex-start",
        gap: isMobile ? 12 : 0, marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: THEME.text.primary, letterSpacing: -0.5 }}>
            📍 Installed Location
          </div>
          <div style={{ fontSize: isMobile ? 11 : 13, color: THEME.text.secondary, marginTop: 3 }}>
            Where this generator sits, and whether it has moved
          </div>
        </div>

        <div style={{ display: "flex", gap: 2, background: THEME.neutral[100], padding: 3, borderRadius: 8, alignSelf: "flex-start" }}>
          {WINDOWS.map((w) => (
            <button key={w.key} onClick={() => setDays(w.key)} style={{
              padding: isMobile ? "5px 12px" : "7px 18px", borderRadius: 6,
              fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", border: "none", transition: "all 0.15s",
              background: days === w.key ? THEME.primary[500] : "transparent",
              color: days === w.key ? "white" : THEME.text.secondary,
              boxShadow: days === w.key ? THEME.shadow.sm : "none",
            }}>{w.label}</button>
          ))}
        </div>
      </div>

      {/* ── Movement verdict ── */}
      {movement?.moved && (
        <div style={{ background: "#fef2f2", border: "2px solid #fecaca", borderRadius: 12,
          padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16 }}>📍</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7f1d1d" }}>This generator has moved</div>
            <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 2, lineHeight: 1.5 }}>
              Its fixes span about {movement.spread_km?.toFixed(1)} km over the last {days} days,
              past the {movement.threshold_km} km limit. Confirm it was relocated and update the site record.
            </div>
          </div>
        </div>
      )}

      {!hasPosition ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 48, color: THEME.text.tertiary, fontSize: 13 }}>
          No position on record for this device yet.
        </div>
      ) : (
        <>
          {/* ── Map ── */}
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden", marginBottom: 16 }}>
            <div ref={mapContainerRef} style={{ height: isMobile ? 300 : 420, width: "100%" }} />
          </div>

          {/* ── Facts ── */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 14 }}>
            <Fact label="Status"
              value={loading ? "…" : movement?.moved ? "Moved" : "Stationary"}
              sub={movement?.spread_km != null ? `${movement.spread_km.toFixed(2)} km spread` : "spread unknown"}
              color={movement?.moved ? "#b91c1c" : "#15803d"} isMobile={isMobile} />
            <Fact label="Latitude" value={lat.toFixed(5)} sub="last fix" color={THEME.text.primary} isMobile={isMobile} />
            <Fact label="Longitude" value={lon.toFixed(5)} sub="last fix" color={THEME.text.primary} isMobile={isMobile} />
            <Fact label="Last fix"
              value={device.last_location_time ? timeAgo(device.last_location_time) : "—"}
              sub={loading ? "…" : `${movement?.fixes ?? 0} fixes in ${days}D`}
              color={THEME.text.primary} isMobile={isMobile} />
          </div>

          <div style={{ marginTop: 16, fontSize: 11, color: THEME.text.tertiary, lineHeight: 1.6 }}>
            The shaded circle is how far this unit&rsquo;s fixes spread over the window, not an accuracy
            figure — consumer GNSS wanders by tens of metres while standing still, which is why the
            movement limit is set at {movement?.threshold_km ?? 20} km rather than at any drift at all.
            Route playback is not shown: a generator has no route.
          </div>
        </>
      )}
    </div>
  );
}

function Fact({ label, value, sub, color, isMobile }: {
  label: string; value: string; sub: string; color: string; isMobile?: boolean;
}) {
  return (
    <div style={{ background: "white", border: `2px solid ${THEME.border.light}`,
      borderRadius: isMobile ? 10 : 14, padding: isMobile ? "12px 14px" : "16px 18px" }}>
      <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color, letterSpacing: -0.5, lineHeight: 1.2,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: isMobile ? 10 : 11, color: THEME.text.tertiary, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: isMobile ? 10 : 11, color: THEME.text.tertiary, marginTop: 2 }}>{sub}</div>
    </div>
  );
}
