"use client";

// Where a Nano unit is and where it has been, from the `gps` object in its
// frames (/api/nano/track). The marker is the newest fix in the window; the
// line is the thinned track. A window with no lock falls back to the last fix
// in the past 30 days, drawn grey, so "no GPS right now" doesn't read as "never
// had GPS". Short windows re-poll; 7 days loads once (it's ~20k frames).

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Device } from "@/types";
import { useIsMobile } from "@/hooks/useIsMobile";

interface Fix { lat: number; lon: number; t: number; sat: number | null }
interface TrackData {
  hours: number;
  truncated: boolean;
  points: Array<[number, number, number]>;
  last_fix: Fix | null;
  live: { fix: any; sat: any; lat: number | null; lon: number | null; ts: string | null } | null;
  stats: { fixes: number; distance_km: number; spread_m: number; first_t: number | null; last_t: number | null; avg_sat: number | null };
}

const C = {
  bg: "#181818", card: "#1e1e1e", border: "#2a2a2a",
  text: "#e2e8f0", dim: "#6b7280", faint: "#525252",
  accent: "#7c3aed", green: "#00c853", red: "#f87171", amber: "#fbbf24",
};

const WINDOWS: Array<{ h: number; label: string }> = [
  { h: 1, label: "1H" }, { h: 6, label: "6H" }, { h: 24, label: "24H" }, { h: 168, label: "7D" },
];
const POLL_MS = 30000;
const POLL_MAX_HOURS = 24;

type BaseLayer = "satellite" | "street";
const TILES: Record<BaseLayer, { url: string; attribution: string }> = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery &copy; Esri",
  },
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  },
};

const fmtT = (t: number) => new Date(t).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
function ago(t: number) {
  const s = (Date.now() - t) / 1000;
  return s < 90 ? "just now" : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 129600 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`;
}
const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`);

export function NanoMapTab({ device }: { device: Device }) {
  const isMobile = useIsMobile();
  const [hours, setHours] = useState(24);
  const [layer, setLayer] = useState<BaseLayer>("satellite");
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileRef = useRef<any>(null);
  const overlayRef = useRef<any[]>([]);
  // Fit the view once per window, not on every poll — a re-centre while the
  // user is panning around is what makes a live map unusable.
  const fittedFor = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/nano/track?device_id=${device.id}&hours=${hours}`);
      const d = await res.json();
      if (d.success) { setData(d.data); setErr(null); }
      else setErr(d.message || d.error || "Could not load the track");
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, [device.id, hours]);

  useEffect(() => {
    fittedFor.current = null;
    load();
    if (hours > POLL_MAX_HOURS) return;
    const i = setInterval(load, POLL_MS);
    return () => clearInterval(i);
  }, [load, hours]);

  // ── Create the map once ───────────────────────────────────────────────────
  useEffect(() => {
    let disposed = false;
    import("leaflet").then((L) => {
      if (disposed || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { scrollWheelZoom: true, zoomControl: true }).setView([20.6, 78.9], 4);
      mapRef.current = map;
      setMapReady(true);
      // Leaflet mis-measures its container when the tab mounts mid-layout.
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 150);
    });
    return () => {
      disposed = true;
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }
    };
  }, []);

  // ── Base layer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;
      if (tileRef.current) { try { map.removeLayer(tileRef.current); } catch {} }
      tileRef.current = L.tileLayer(TILES[layer].url, { attribution: TILES[layer].attribution, maxZoom: 19 }).addTo(map);
      tileRef.current.bringToBack();
    });
  }, [layer, mapReady]);

  // ── Track + marker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !data) return;
    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;
      overlayRef.current.forEach((o) => { try { map.removeLayer(o); } catch {} });
      overlayRef.current = [];

      const pts = data.points.map((p) => [p[0], p[1]] as [number, number]);
      const name = device.device_name || device.imei;

      if (pts.length > 1) {
        // Dark under-stroke so the line reads on satellite imagery too.
        overlayRef.current.push(L.polyline(pts, { color: "#000", weight: 6, opacity: 0.35 }).addTo(map));
        overlayRef.current.push(L.polyline(pts, { color: C.green, weight: 3, opacity: 0.95 }).addTo(map));
        const [s0, s1, st] = data.points[0];
        overlayRef.current.push(
          L.circleMarker([s0, s1], { radius: 5, color: "#fff", weight: 2, fillColor: C.dim, fillOpacity: 1 })
            .bindPopup(`<b>Start of window</b><br/>${fmtT(st)}`)
            .addTo(map)
        );
      }

      const fix = data.last_fix;
      if (fix) {
        const inWindow = data.points.length > 0;
        const m = L.circleMarker([fix.lat, fix.lon], {
          radius: 9, color: "#fff", weight: 3, fillColor: inWindow ? C.green : C.faint, fillOpacity: 1,
        }).bindPopup(
          `<b>${name}</b><br/>${fix.lat.toFixed(6)}, ${fix.lon.toFixed(6)}<br/>` +
          `Fix ${ago(fix.t)}${fix.sat != null ? ` · ${fix.sat} sats` : ""}` +
          (inWindow ? "" : "<br/><i>Last fix — none in this window</i>")
        ).addTo(map);
        overlayRef.current.push(m);
      }

      if (fittedFor.current !== data.hours) {
        fittedFor.current = data.hours;
        if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 17 });
        else if (fix) map.setView([fix.lat, fix.lon], 16);
      }
    });
  }, [data, mapReady, device.device_name, device.imei]);

  const fix = data?.last_fix ?? null;
  const live = data?.live ?? null;
  const liveFix = typeof live?.fix === "number" ? live.fix > 0 : !!live?.fix;
  const stats = data?.stats;

  const btn = (active: boolean): React.CSSProperties => ({
    padding: isMobile ? "5px 10px" : "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
    fontSize: 11, fontWeight: 700, fontFamily: "inherit",
    background: active ? C.accent : "transparent", color: active ? "#fff" : C.dim,
  });

  return (
    <div style={{ padding: isMobile ? 12 : 20, background: C.bg, minHeight: "100%", color: C.text }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

      {/* ── Controls ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
            color: liveFix ? C.green : C.amber,
            background: liveFix ? "rgba(0,200,83,0.12)" : "rgba(251,191,36,0.12)",
            border: `1px solid ${liveFix ? "rgba(0,200,83,0.3)" : "rgba(251,191,36,0.3)"}`,
          }}>
            {live ? (liveFix ? `● GPS LOCK${live.sat != null ? ` · ${live.sat} SATS` : ""}` : `○ NO LOCK${live.sat != null ? ` · ${live.sat} SATS` : ""}`) : "○ NO FRAMES YET"}
          </span>
          {loading && <span style={{ fontSize: 11, color: C.dim }}>Loading…</span>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 2, background: C.card, border: `1px solid ${C.border}`, padding: 3, borderRadius: 8 }}>
            {WINDOWS.map((w) => <button key={w.h} onClick={() => setHours(w.h)} style={btn(hours === w.h)}>{w.label}</button>)}
          </div>
          <div style={{ display: "flex", gap: 2, background: C.card, border: `1px solid ${C.border}`, padding: 3, borderRadius: 8 }}>
            {([["satellite", "Satellite"], ["street", "Map"]] as [BaseLayer, string][]).map(([k, label]) =>
              <button key={k} onClick={() => setLayer(k)} style={btn(layer === k)}>{label}</button>)}
          </div>
          <button onClick={load} style={{ ...btn(false), background: C.card, border: `1px solid ${C.border}`, color: C.text }}>↻</button>
        </div>
      </div>

      {err && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: C.red, borderRadius: 8, padding: "10px 14px", fontSize: 12, marginBottom: 12 }}>
          {err}
        </div>
      )}

      {/* ── Map ── */}
      <div style={{ position: "relative", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
        <div ref={containerRef} style={{ height: isMobile ? 320 : 480, width: "100%", background: "#111", zIndex: 0 }} />
        {data && !fix && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(17,17,17,0.75)", zIndex: 500, pointerEvents: "none" }}>
            <div style={{ textAlign: "center", fontSize: 13, color: C.dim }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📡</div>
              No GPS fix from this unit in the last 30 days.
            </div>
          </div>
        )}
        {data && fix && data.points.length === 0 && (
          <div style={{ position: "absolute", top: 10, left: 54, right: 10, zIndex: 500, background: "rgba(24,24,24,0.9)",
            border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, color: C.amber }}>
            No fix in this window — showing the last known position from {ago(fix.t)}.
          </div>
        )}
      </div>

      {/* ── Facts ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: 10 }}>
        <Fact label="Position" value={fix ? `${fix.lat.toFixed(5)}, ${fix.lon.toFixed(5)}` : "—"}
          sub={fix ? (
            <a href={`https://www.google.com/maps?q=${fix.lat},${fix.lon}`} target="_blank" rel="noreferrer" style={{ color: C.accent }}>Open in Google Maps ↗</a>
          ) : "no fix"} />
        <Fact label="Last fix" value={fix ? ago(fix.t) : "—"} sub={fix ? fmtT(fix.t) : ""} />
        <Fact label="Satellites" value={stats?.avg_sat != null ? stats.avg_sat.toFixed(1) : live?.sat != null ? String(live.sat) : "—"}
          sub={stats?.avg_sat != null ? "average in window" : "current"} />
        <Fact label="Path length" value={stats && stats.fixes > 0 ? fmtDist(stats.distance_km * 1000) : "—"}
          sub={stats ? `${stats.fixes.toLocaleString()} fixes${data?.truncated ? " (capped)" : ""}` : ""} />
        <Fact label="Spread" value={stats && stats.fixes > 0 ? fmtDist(stats.spread_m) : "—"} sub="furthest from current"
          color={stats && stats.spread_m > 500 ? C.amber : undefined} />
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: C.faint, lineHeight: 1.6 }}>
        Only frames with a GPS lock (fix &gt; 0) are plotted. Points closer than 10 m to the previous one are dropped,
        so a parked unit shows as a dot rather than a scribble of GNSS jitter — path length is measured on that thinned
        track. {hours <= POLL_MAX_HOURS ? "Refreshes every 30 s." : "7-day view loads once; press ↻ to refresh."}
      </div>
    </div>
  );
}

function Fact({ label, value, sub, color }: { label: string; value: string; sub: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || C.text, marginTop: 4, fontFamily: "monospace",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
    </div>
  );
}
