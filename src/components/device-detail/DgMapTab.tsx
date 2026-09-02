"use client";

// ============================================================================
// DG MAP — installed-location view for a stationary generator
// ----------------------------------------------------------------------------
// MapTab delegates here when asset_name === "DG". The vehicle map draws a route
// polyline and offers 24h / today playback, which for a genset is a tangle of
// GNSS jitter around one point dressed up as a journey.
//
// There is no time-window picker either. "Where is this unit installed" has one
// answer, not three, and the drift check behind it only has to be long enough
// to be meaningful — DRIFT_WINDOW_DAYS is fixed at 30 and never surfaced as a
// control, because nobody looking at this page wants to choose it.
//
// The drift figure comes from `?only=movement`, which reads gps_records and
// nothing else. The full analytics endpoint scans io_records, and having the
// map wait on that is what made a slow analytics query blank the map too.
//
// Base layers: street and satellite. A genset usually sits in a yard or a field
// where the street map is empty white space — the screenshot that prompted this
// showed exactly that — so imagery is the more useful default for confirming
// which building or plot the unit is actually on.
//
// TODO: a 3D genset model on the map instead of a plain marker. This is the flat
// version; the position and drift logic below is what that would sit on.
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
}

/** Long enough for drift to mean something, short enough to stay cheap. */
const DRIFT_WINDOW_DAYS = 30;

type BaseLayer = "satellite" | "street";

const TILES: Record<BaseLayer, { url: string; attribution: string; maxZoom: number }> = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery &copy; Esri",
    maxZoom: 19,
  },
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 19,
  },
};

export function DgMapTab({ device }: DgMapTabProps) {
  const isMobile = useIsMobile();
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<any>(null);
  const overlayRef = useRef<any[]>([]);

  const [layer, setLayer] = useState<BaseLayer>("satellite");
  const [movement, setMovement] = useState<Movement | null>(null);
  const [loading, setLoading] = useState(true);

  const lat = Number(device.last_latitude);
  const lon = Number(device.last_longitude);
  const hasPosition =
    device.last_latitude != null && device.last_longitude != null &&
    !isNaN(lat) && !isNaN(lon) && !(lat === 0 && lon === 0);

  // ── Drift check ───────────────────────────────────────────────────────────
  // Deliberately not awaited by the map: the marker is drawn from the device
  // row and appears immediately, whether or not this ever comes back.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/analytics/dg?device_id=${device.id}&days=${DRIFT_WINDOW_DAYS}&only=movement`
        );
        const data = await res.json();
        if (!cancelled) setMovement(data.success ? data.movement : null);
      } catch {
        if (!cancelled) setMovement(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [device.id]);

  // ── Create the map once ───────────────────────────────────────────────────
  // Split from the layer/overlay effects on purpose: rebuilding the whole map
  // when the drift number arrives is what made it flash and re-centre.
  useEffect(() => {
    if (!hasPosition || !mapContainerRef.current || mapRef.current) return;

    let disposed = false;
    import("leaflet").then((L) => {
      if (disposed || !mapContainerRef.current || mapRef.current) return;

      // Zoom 16 rather than 17: one notch out is the difference between a plot
      // with recognisable surroundings and a featureless square.
      const map = L.map(mapContainerRef.current, { scrollWheelZoom: false }).setView([lat, lon], 16);
      mapRef.current = map;

      // Leaflet mis-measures its container when the tab mounts hidden.
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 150);
    });

    return () => {
      disposed = true;
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }
    };
  }, [hasPosition, lat, lon]);

  // ── Swap the base layer ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    let disposed = false;
    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (disposed || !map) return;
      if (tileLayerRef.current) { try { map.removeLayer(tileLayerRef.current); } catch {} }
      const t = TILES[layer];
      tileLayerRef.current = L.tileLayer(t.url, {
        attribution: t.attribution, maxZoom: t.maxZoom,
      }).addTo(map);
      // Keep the marker above the tiles after a swap.
      overlayRef.current.forEach((o) => { try { o.bringToFront?.(); } catch {} });
    });
    return () => { disposed = true; };
  }, [layer, hasPosition, movement]);

  // ── Marker and spread circle ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    let disposed = false;
    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (disposed || !map) return;

      overlayRef.current.forEach((o) => { try { map.removeLayer(o); } catch {} });
      overlayRef.current = [];

      const moved = movement?.moved === true;
      const accent = moved ? "#dc2626" : "#16a34a";

      // Drawn only when there are enough fixes to mean something; a radius
      // invented from three points would imply precision the data lacks.
      if (movement?.spread_km != null && movement.spread_km > 0) {
        const circle = L.circle([lat, lon], {
          radius: (movement.spread_km * 1000) / 2,
          color: accent, weight: 2, fillColor: accent, fillOpacity: 0.1,
        }).addTo(map);
        overlayRef.current.push(circle);
      }

      const marker = L.circleMarker([lat, lon], {
        radius: 9, color: "#ffffff", weight: 3, fillColor: accent, fillOpacity: 1,
      }).addTo(map);
      marker.bindPopup(
        `<b>${device.device_name || device.imei}</b><br/>` +
        `${lat.toFixed(5)}, ${lon.toFixed(5)}` +
        (device.last_location_time ? `<br/>Fix ${timeAgo(device.last_location_time)}` : "")
      );
      overlayRef.current.push(marker);
    });
    return () => { disposed = true; };
  }, [movement, lat, lon, device.device_name, device.imei, device.last_location_time, hasPosition]);

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

        {/* Base layer only — there is no time range to choose here. */}
        <div style={{ display: "flex", gap: 2, background: THEME.neutral[100], padding: 3, borderRadius: 8, alignSelf: "flex-start" }}>
          {([["satellite", "Satellite"], ["street", "Map"]] as [BaseLayer, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setLayer(k)} style={{
              padding: isMobile ? "5px 12px" : "7px 18px", borderRadius: 6,
              fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", border: "none", transition: "all 0.15s",
              background: layer === k ? THEME.primary[500] : "transparent",
              color: layer === k ? "white" : THEME.text.secondary,
              boxShadow: layer === k ? THEME.shadow.sm : "none",
            }}>{label}</button>
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
              Its fixes span about {movement.spread_km?.toFixed(1)} km over the last {DRIFT_WINDOW_DAYS} days,
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
            <div ref={mapContainerRef} style={{ height: isMobile ? 300 : 440, width: "100%", background: THEME.neutral[100] }} />
          </div>

          {/* ── Facts ── */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 14 }}>
            <Fact label="Status"
              value={loading ? "…" : movement === null ? "Unknown" : movement.moved ? "Moved" : "Stationary"}
              sub={movement?.spread_km != null
                ? `${movement.spread_km.toFixed(2)} km spread`
                : loading ? "checking" : "not enough fixes"}
              color={movement?.moved ? "#b91c1c" : movement === null ? THEME.text.tertiary : "#15803d"}
              isMobile={isMobile} />
            <Fact label="Latitude" value={lat.toFixed(5)} sub="last fix" color={THEME.text.primary} isMobile={isMobile} />
            <Fact label="Longitude" value={lon.toFixed(5)} sub="last fix" color={THEME.text.primary} isMobile={isMobile} />
            <Fact label="Last fix"
              value={device.last_location_time ? timeAgo(device.last_location_time) : "—"}
              sub={loading ? "…" : `${movement?.fixes ?? 0} fixes in ${DRIFT_WINDOW_DAYS}D`}
              color={THEME.text.primary} isMobile={isMobile} />
          </div>

          <div style={{ marginTop: 16, fontSize: 11, color: THEME.text.tertiary, lineHeight: 1.6 }}>
            Position is checked over the last {DRIFT_WINDOW_DAYS} days. The shaded circle is how far this
            unit&rsquo;s fixes spread in that time, not an accuracy figure — consumer GNSS wanders by tens of
            metres while standing still, which is why the movement limit is {movement?.threshold_km ?? 20} km
            rather than any drift at all. Route playback is not shown: a generator has no route.
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
