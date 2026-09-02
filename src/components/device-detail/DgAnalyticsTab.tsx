"use client";

// ============================================================================
// DG ANALYTICS — the Analytics tab for a stationary diesel generator
// ----------------------------------------------------------------------------
// AnalyticsTab delegates here when asset_name === "DG". The fleet version
// reports distance, km/L, trips and idle fuel wasted; none of those mean
// anything for a genset bolted to a plinth, and showing them invites the
// customer to read noise as performance.
//
// What is here instead: run time, starts, time actually under load, output
// current — and one position check, because the only useful thing distance
// tells you about a DG is whether somebody has moved it.
//
// There is no fuel figure. It would need a CAN adapter on the genset
// controller and these units do not have one; the ids that looked like CAN
// fuel were an accelerometer axis. See CAN_ADAPTER_IO_MAP in
// src/app/api/telemetry/[deviceId]/route.ts.
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { Device } from "@/types";
import { THEME } from "@/lib/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

interface DgAnalyticsTabProps {
  device: Device;
  /** Rolling window in days, owned by the parent so both modes share one picker. */
  days: number;
  /** ISO instants when the parent is in custom-range mode. */
  startIso?: string | null;
  endIso?: string | null;
  /** Label for the active window, rendered next to each section heading. */
  windowLabel: string;
}

interface DgDay {
  day: string;
  engineOnHours: number;
  loadHours: number;
  starts: number;
  avgAmps: number | null;
}

// Every field is nullable: the four signal groups behind them are queried and
// settled independently, so a slow one leaves its own tiles blank instead of
// taking the page down. See the route's `degraded` note.
interface DgSummary {
  engine_on_hours: number | null;
  load_hours: number | null;
  starts: number | null;
  longest_run_hours: number | null;
  avg_amps: number | null;
  peak_amps: number | null;
  set_amps: number | null;
  utilisation_pct: number | null;
  load_ratio: number | null;
  hours_with_data: number | null;
  data_availability_pct: number | null;
  supply_min_v: number | null;
  supply_avg_v: number | null;
  battery_min_v: number | null;
  gsm_avg_pct: number | null;
}

interface DgMovement {
  spread_km: number | null;
  fixes: number;
  moved: boolean;
  threshold_km: number;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_time: string | null;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function fmtHours(h: number | null | undefined): string {
  if (h === null || h === undefined || !isFinite(h)) return "—";
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  if (hh === 0 && mm === 0) return "0h";
  if (hh === 0) return `${mm}m`;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}m`;
}

function fmtVal(v: number | null | undefined, unit: string, dp = 1): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return `${v.toFixed(dp)} ${unit}`.trim();
}

function fmtDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

// ─── Small building blocks (kept local; the fleet tab's are not exported) ────

function SectionHeader({ icon, title, sub, isMobile }: {
  icon: string; title: string; sub: string; isMobile?: boolean;
}) {
  return (
    <div style={{ marginBottom: isMobile ? 12 : 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: isMobile ? 18 : 22 }}>{icon}</span>
        <div>
          <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, color: THEME.text.primary, letterSpacing: -0.3 }}>{title}</div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: THEME.text.tertiary, marginTop: 1 }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, bg, isMobile }: {
  icon: string; label: string; value: string; sub: string; color: string; bg: string; isMobile?: boolean;
}) {
  return (
    <div style={{ background: bg, border: `2px solid ${color}25`, borderRadius: isMobile ? 10 : 14,
      padding: isMobile ? "12px 14px" : "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: isMobile ? 18 : 22, marginBottom: isMobile ? 4 : 8 }}>{icon}</div>
      <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color, letterSpacing: -0.5, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: isMobile ? 10 : 11, color: THEME.text.tertiary, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: isMobile ? 10 : 11, color: THEME.text.tertiary, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "white", borderRadius: 14, border: `2px solid ${THEME.border.light}`,
      padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", ...style }}>
      {children}
    </div>
  );
}

function Banner({ tone, icon, title, body }: {
  tone: "red" | "amber" | "blue" | "gray"; icon: string; title: string; body: string;
}) {
  const P = {
    red:   { fg: "#b91c1c", bg: "#fef2f2", bd: "#fecaca", title: "#7f1d1d" },
    amber: { fg: "#b45309", bg: "#fffbeb", bd: "#fde68a", title: "#78350f" },
    blue:  { fg: "#1d4ed8", bg: "#eff6ff", bd: "#bfdbfe", title: "#1e3a8a" },
    gray:  { fg: "#64748b", bg: "#f1f5f9", bd: "#e2e8f0", title: "#334155" },
  }[tone];
  return (
    <div style={{ background: P.bg, border: `2px solid ${P.bd}`, borderRadius: 12,
      padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 16, lineHeight: 1.2 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: P.title }}>{title}</div>
        <div style={{ fontSize: 12, color: P.fg, marginTop: 2, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function DgAnalyticsTab({ device, days, startIso, endIso, windowLabel }: DgAnalyticsTabProps) {
  const isMobile = useIsMobile();
  const [summary, setSummary] = useState<DgSummary | null>(null);
  const [movement, setMovement] = useState<DgMovement | null>(null);
  const [daily, setDaily] = useState<DgDay[]>([]);
  const [windowHours, setWindowHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Signal groups the server could not compute in time. */
  const [degraded, setDegraded] = useState<string[]>([]);
  const [engineSource, setEngineSource] = useState<string | null>(null);

  const statGrid = isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)";

  const fetchDg = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = startIso && endIso
        ? `/api/analytics/dg?device_id=${device.id}&start_datetime=${encodeURIComponent(startIso)}&end_datetime=${encodeURIComponent(endIso)}`
        : `/api/analytics/dg?device_id=${device.id}&days=${days}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setMovement(data.movement);
        setDaily(data.daily ?? []);
        setWindowHours(data.window?.hours ?? 24);
        setDegraded(data.degraded ?? []);
        setEngineSource(data.meta?.engine_source ?? null);
      } else {
        // Clear rather than keep the previous window's numbers under the new
        // label — stale totals that look valid are worse than an empty state.
        setSummary(null); setMovement(null); setDaily([]); setDegraded([]);
        setError(data.error || "Failed to load generator analytics");
      }
    } catch {
      setSummary(null); setMovement(null); setDaily([]); setDegraded([]);
      setError("Failed to load generator analytics");
    } finally {
      setLoading(false);
    }
  }, [device.id, days, startIso, endIso]);

  useEffect(() => { fetchDg(); }, [fetchDg]);

  const maxHours = Math.max(...daily.map((d) => d.engineOnHours), 0.001);
  const activeDays = daily.filter((d) => d.engineOnHours > 0).length;

  // Running but producing little is the fault this tab exists to surface.
  // Requires both halves of the pair; one alone would give a false ratio.
  const underProducing =
    summary !== null && (summary.engine_on_hours ?? 0) > 0 &&
    summary.load_ratio !== null && summary.load_ratio < 0.5;

  const offSetpoint =
    summary !== null && summary.set_amps !== null && summary.avg_amps !== null &&
    Math.abs(summary.avg_amps - summary.set_amps) > summary.set_amps * 0.1;

  // "No data" is only true if the health group actually answered; a timed-out
  // coverage count must not be reported to the customer as a dead device.
  const noData =
    !loading && summary !== null && summary.hours_with_data === 0;
  const patchy =
    summary !== null && summary.hours_with_data !== null && summary.hours_with_data > 0 &&
    summary.data_availability_pct !== null && summary.data_availability_pct < 50;

  // No page padding or background here — AnalyticsTab owns the scroll container
  // and the range picker above; this component only supplies the sections.
  return (
    <div>

      {error && (
        <div style={{ padding: 16, background: "#fef2f2", border: "2px solid #fca5a5",
          borderRadius: 12, color: "#dc2626", fontSize: 13, marginBottom: 20 }}>⚠️ {error}</div>
      )}

      {/* ── Flags ── */}
      {movement?.moved && (
        <Banner tone="red" icon="📍" title="This generator has moved"
          body={`Its fixes span about ${movement.spread_km?.toFixed(1)} km over ${windowLabel}, past the ${movement.threshold_km} km limit. A stationary DG should not move — confirm it was relocated, and update the site record if so.`} />
      )}
      {underProducing && (
        <Banner tone="amber" icon="⚠️" title="Running without producing"
          body={`The engine ran ${fmtHours(summary!.engine_on_hours)} but output current stayed above 2 A for only ${fmtHours(summary!.load_hours)}. Check the electrolyser while the set is running.`} />
      )}
      {offSetpoint && (
        <Banner tone="amber" icon="⚡" title="Output outside the commissioned band"
          body={`Average output ${summary!.avg_amps!.toFixed(1)} A against a ${summary!.set_amps!.toFixed(1)} A setpoint — outside ±10%.`} />
      )}
      {noData && (
        <Banner tone="gray" icon="⚪" title="No data in this window"
          body="The device sent nothing over the selected period. Check connectivity and the SIM before reading anything into the figures below." />
      )}
      {patchy && (
        <Banner tone="amber" icon="📡" title="Patchy coverage"
          body={`Packets arrived in only ${summary!.data_availability_pct}% of the hours in this window (${summary!.hours_with_data} of ${windowHours}). Run time is measured from what arrived, so treat these totals as a floor.`} />
      )}

      {/* Some figures could not be computed in time. Naming which ones beats a
          single red error that hides the numbers that did come back. */}
      {degraded.length > 0 && !loading && (
        <Banner tone="blue" icon="⏳" title="Some figures took too long to compute"
          body={`${degraded.map((d) => d.split(":")[0]).join(", ")} could not be read within the time limit, so those tiles are blank — the rest of the page is accurate. This usually means the database is busy or the io_records index from migration 002 has not been built. Try a shorter window, or reload.`} />
      )}

      {/* ── SECTION 1: ENGINE RUN TIME ── */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-end",
        gap: isMobile ? 4 : 0, marginBottom: 16 }}>
        <SectionHeader icon="⏱️" title="Engine Run Time"
          sub="Din.1 run status — the genset's own contact" isMobile={isMobile} />
        <div style={{ fontSize: 11, fontWeight: 700, color: THEME.primary[600],
          background: THEME.primary[50], border: `1px solid ${THEME.primary[200]}`,
          borderRadius: 8, padding: "4px 10px", marginBottom: 16, whiteSpace: "nowrap" }}>
          {windowLabel}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: statGrid, gap: isMobile ? 10 : 14, marginBottom: 24 }}>
        <StatCard icon="⏱️" label="Engine-on time" value={loading ? "…" : fmtHours(summary?.engine_on_hours)}
          sub={summary?.utilisation_pct != null
            ? `${summary.utilisation_pct}% of the window${engineSource === "daily_summary" ? " · from rollup" : ""}`
            : "—"}
          color="#15803d" bg="#f0fdf4" isMobile={isMobile} />
        <StatCard icon="⚡" label="Under load" value={loading ? "…" : fmtHours(summary?.load_hours)}
          sub={summary?.load_ratio != null
            ? `${Math.round(summary.load_ratio * 100)}% of run time` : "output > 2 A"}
          color="#1d4ed8" bg="#eff6ff" isMobile={isMobile} />
        <StatCard icon="🔁" label="Starts" value={loading ? "…" : summary?.starts != null ? String(summary.starts) : "—"}
          sub={summary?.starts ? `longest run ${fmtHours(summary.longest_run_hours)}` : "no starts"}
          color="#b45309" bg="#fffbeb" isMobile={isMobile} />
        <StatCard icon="📊" label="Avg output" value={loading ? "…" : fmtVal(summary?.avg_amps, "A")}
          sub={summary?.peak_amps != null ? `peak ${summary.peak_amps.toFixed(1)} A` : "while producing"}
          color="#7c3aed" bg="#f5f3ff" isMobile={isMobile} />
      </div>

      {/* ── Daily run-time bars ── */}
      <Card style={{ marginBottom: 24, padding: isMobile ? 16 : 24 }}>
        <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 800, color: THEME.text.primary, marginBottom: 4 }}>
          Run time by day
        </div>
        <div style={{ fontSize: 11, color: THEME.text.tertiary, marginBottom: 16 }}>
          {activeDays} of {daily.length} day{daily.length === 1 ? "" : "s"} with the engine running
        </div>

        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: THEME.text.tertiary, fontSize: 13 }}>Loading…</div>
        ) : daily.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: THEME.text.tertiary, fontSize: 13 }}>No data in this window</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {daily.map((d) => (
              <div key={d.day} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: isMobile ? 78 : 104, flexShrink: 0, fontSize: isMobile ? 10 : 11,
                  fontWeight: 700, color: d.engineOnHours > 0 ? THEME.text.secondary : THEME.text.tertiary }}>
                  {fmtDay(d.day)}
                </div>
                {/* Load time sits inside run time, so the bars are stacked to
                    show the shortfall rather than drawn side by side. */}
                <div style={{ flex: 1, height: 14, background: THEME.neutral[100], borderRadius: 7, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, width: `${Math.min((d.engineOnHours / maxHours) * 100, 100)}%`,
                    background: "#bbf7d0", borderRadius: 7, transition: "width 0.4s ease" }} />
                  <div style={{ position: "absolute", inset: 0, width: `${Math.min((d.loadHours / maxHours) * 100, 100)}%`,
                    background: "#16a34a", borderRadius: 7, transition: "width 0.4s ease" }} />
                </div>
                <div style={{ width: isMobile ? 62 : 78, flexShrink: 0, textAlign: "right",
                  fontSize: isMobile ? 11 : 12, fontWeight: 700,
                  color: d.engineOnHours > 0 ? THEME.text.primary : THEME.text.tertiary }}>
                  {fmtHours(d.engineOnHours)}
                </div>
                <div style={{ width: isMobile ? 44 : 60, flexShrink: 0, textAlign: "right",
                  fontSize: isMobile ? 10 : 11, color: THEME.text.tertiary }}>
                  {d.starts > 0 ? `${d.starts}×` : "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 12,
          borderTop: `1px solid ${THEME.border.light}`, fontSize: 11, color: THEME.text.tertiary }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#16a34a", marginRight: 5, verticalAlign: -1 }} />Under load</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#bbf7d0", marginRight: 5, verticalAlign: -1 }} />Running, no output</span>
          <span style={{ marginLeft: "auto" }}>Right column = starts</span>
        </div>
      </Card>

      {/* ── SECTION 2: POWER & CONNECTIVITY ── */}
      <SectionHeader icon="🔌" title="Power & Connectivity"
        sub="Tracker supply health — a flat battery hides everything above" isMobile={isMobile} />

      <div style={{ display: "grid", gridTemplateColumns: statGrid, gap: isMobile ? 10 : 14, marginBottom: 24 }}>
        <StatCard icon="🔋" label="Supply voltage" value={loading ? "…" : fmtVal(summary?.supply_min_v, "V")}
          sub={summary?.supply_avg_v != null ? `min · avg ${summary.supply_avg_v.toFixed(1)} V` : "minimum"}
          color="#0f766e" bg="#f0fdfa" isMobile={isMobile} />
        <StatCard icon="🪫" label="Tracker battery" value={loading ? "…" : fmtVal(summary?.battery_min_v, "V", 2)}
          sub="minimum" color="#7c3aed" bg="#f5f3ff" isMobile={isMobile} />
        <StatCard icon="📶" label="GSM signal" value={loading ? "…" : fmtVal(summary?.gsm_avg_pct, "%", 0)}
          sub="average" color="#1d4ed8" bg="#eff6ff" isMobile={isMobile} />
        <StatCard icon="📈" label="Data availability"
          value={loading ? "…" : summary?.data_availability_pct != null ? `${summary.data_availability_pct}%` : "—"}
          sub={summary?.hours_with_data != null ? `${summary.hours_with_data} of ${windowHours} h` : "—"}
          color="#b45309" bg="#fffbeb" isMobile={isMobile} />
      </div>

      {/* ── SECTION 3: POSITION ── */}
      <SectionHeader icon="📍" title="Position"
        sub={`A DG should stay put — only movement beyond ${movement?.threshold_km ?? 20} km is flagged`} isMobile={isMobile} />

      <Card style={{ padding: isMobile ? 16 : 24 }}>
        {loading ? (
          <div style={{ color: THEME.text.tertiary, fontSize: 13 }}>Loading…</div>
        ) : movement === null || movement.spread_km === null ? (
          <div style={{ fontSize: 13, color: THEME.text.secondary }}>
            Not enough GPS fixes in this window to judge movement
            {movement ? ` (${movement.fixes} usable fix${movement.fixes === 1 ? "" : "es"})` : ""}.
            That is normal for an indoor installation and is not a fault on its own.
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800,
                color: movement.moved ? "#b91c1c" : "#15803d", letterSpacing: -0.5 }}>
                {movement.spread_km.toFixed(2)} km
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.text.tertiary,
                textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>
                Position spread
              </div>
              <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 2 }}>
                across {movement.fixes} fixes · limit {movement.threshold_km} km
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 8,
              background: movement.moved ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${movement.moved ? "#fecaca" : "#bbf7d0"}`,
              color: movement.moved ? "#b91c1c" : "#15803d" }}>
              {movement.moved ? "Moved — needs confirming" : "Stationary"}
            </div>
          </div>
        )}
      </Card>

      {/* Says plainly why there is no fuel section, so nobody goes looking for
          one that was quietly removed. */}
      <div style={{ marginTop: 20, fontSize: 11, color: THEME.text.tertiary, lineHeight: 1.6 }}>
        Distance, trips and idle time are not reported for a generator — they describe a vehicle.
        Fuel consumption needs a CAN adapter on the genset controller, which these units do not have,
        so no fuel figure is shown rather than one derived from a signal that does not carry it.
      </div>
    </div>
  );
}
