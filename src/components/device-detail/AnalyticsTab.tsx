"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Device } from "@/types";
import { THEME } from "@/lib/theme";

interface AnalyticsTabProps { device: Device; }

interface DailyData {
  day: string;
  distance_km: number;
  fuel_litres: number;
  fuel_average_kmpl: number | null;
}
interface Summary {
  total_distance_km: number;
  total_fuel_litres: number;
  overall_fuel_average_kmpl: number | null;
  days_with_data: number;
}
interface Trip {
  trip_number: number;
  start_time: string;
  end_time: string;
  duration_min: number;
  distance_km: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  gps_points: number;
}
interface TripSummary {
  total_trips: number;
  total_distance_km: number;
  total_duration_min: number;
  avg_trip_distance_km: number;
  avg_trip_duration_min: number;
  longest_trip_km: number;
}
interface IdleSummary {
  total_idle_events: number;
  total_idle_minutes: number;
  total_idle_hours: number;
  estimated_fuel_wasted_litres: number;
  estimated_co2_wasted_kg: number;
  avg_idle_duration_min: number;
}
interface DailyIdle {
  day: string;
  idle_minutes: number;
  idle_events: number;
  idle_hours: number;
}

const CO2_PER_LITRE = 2.68;

// ── Datetime helpers ──────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD in local time */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Builds IST-anchored ISO string: "2025-03-01T09:00:00+05:30" */
function toISTIso(date: string, time: string): string {
  return `${date}T${time}:00+05:30`;
}

/** Label shown on button: "Mar 1, 09:00 – Mar 17, 17:30" */
function formatDatetimeLabel(sd: string, st: string, ed: string, et: string): string {
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (sd === ed) return `${fmt(sd)}, ${st} – ${et}`;
  return `${fmt(sd)}, ${st} – ${fmt(ed)}, ${et}`;
}

function isInRange(day: string, start: string, end: string) { return day >= start && day <= end; }

// ── TimeInput ─────────────────────────────────────────────────────────────────
function TimeInput({ label, value, onChange, accentColor }: {
  label: string; value: string; onChange: (v: string) => void; accentColor: string;
}) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: THEME.text.tertiary,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{label}</div>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "7px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          border: `2px solid ${accentColor}40`, outline: "none", fontFamily: "inherit",
          color: THEME.text.primary, background: `${accentColor}08`, boxSizing: "border-box",
        }}
        onFocus={(e) => { e.target.style.borderColor = accentColor; }}
        onBlur={(e) => { e.target.style.borderColor = `${accentColor}40`; }}
      />
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function Calendar({ rangeStart, rangeEnd, activeStep, onSelect }: {
  rangeStart: string | null; rangeEnd: string | null;
  activeStep: "start" | "end"; onSelect: (date: string) => void;
}) {
  const today = toLocalDateString(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = activeStep === "end" && rangeEnd ? rangeEnd : rangeStart ?? today;
    return new Date(base + "T00:00:00");
  });

  const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const MONTHS = ["January","February","March","April","May","June","July",
    "August","September","October","November","December"];

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);

  const startColor = THEME.primary[500];
  const endColor = "#8b5cf6";

  return (
    <div style={{ userSelect: "none" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <button onClick={() => setViewMonth(d => { const n=new Date(d); n.setMonth(n.getMonth()-1); return n; })}
          style={{ width:26, height:26, border:`1px solid ${THEME.border.light}`, borderRadius:6,
            background:"white", cursor:"pointer", fontSize:14, color:THEME.text.secondary,
            display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
        <div style={{ fontSize:12, fontWeight:700, color:THEME.text.primary }}>{MONTHS[month]} {year}</div>
        <button onClick={() => setViewMonth(d => { const n=new Date(d); n.setMonth(n.getMonth()+1); return n; })}
          style={{ width:26, height:26, border:`1px solid ${THEME.border.light}`, borderRadius:6,
            background:"white", cursor:"pointer", fontSize:14, color:THEME.text.secondary,
            display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:2, marginBottom:3 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:9, fontWeight:700,
          color:THEME.text.tertiary, padding:"2px 0" }}>{d}</div>)}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const isFuture = day > today;
          const isStart = rangeStart && day === rangeStart;
          const isEnd = rangeEnd && day === rangeEnd;
          const inRange = rangeStart && rangeEnd && isInRange(day, rangeStart, rangeEnd);
          const bg = isStart ? startColor : isEnd ? endColor : inRange ? THEME.primary[100] : "transparent";
          const fg = isStart||isEnd ? "white" : isFuture ? THEME.neutral[300]
            : day===today ? THEME.primary[600] : inRange ? THEME.primary[700] : THEME.text.primary;
          return (
            <button key={day} disabled={isFuture} onClick={() => !isFuture && onSelect(day)}
              style={{ width:"100%", aspectRatio:"1", border:"none", borderRadius:6,
                fontSize:11, fontWeight:isStart||isEnd?800:day===today?700:500,
                cursor:isFuture?"not-allowed":"pointer", background:bg, color:fg,
                transition:"all 0.1s",
                outline: day===today&&!isStart&&!isEnd ? `2px solid ${THEME.primary[200]}` : "none",
                outlineOffset:-1 }}>
              {parseInt(day.split("-")[2])}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── DatetimeRangePicker ───────────────────────────────────────────────────────
function DatetimeRangePicker({ startDate, startTime, endDate, endTime, onConfirm, onClose }: {
  startDate: string|null; startTime: string;
  endDate: string|null; endTime: string;
  onConfirm: (sd:string, st:string, ed:string, et:string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"start"|"end">("start");
  const [tSD, setTSD] = useState<string|null>(startDate);
  const [tST, setTST] = useState(startTime);
  const [tED, setTED] = useState<string|null>(endDate);
  const [tET, setTET] = useState(endTime);

  const handleDateSelect = (day: string) => {
    if (step === "start") {
      setTSD(day);
      if (tED && day > tED) setTED(null);
      setStep("end");
    } else {
      if (tSD && day < tSD) { setTED(tSD); setTSD(day); }
      else setTED(day);
    }
  };

  const handleApply = () => {
    if (!tSD || !tED) return;
    onConfirm(tSD, tST, tED, tET);
    onClose();
  };

  const applyPreset = (daysBack: number) => {
    const end = toLocalDateString(new Date());
    const s = new Date(); s.setDate(s.getDate() - (daysBack-1));
    onConfirm(toLocalDateString(s), "00:00", end, "23:59");
    onClose();
  };

  const stepColor = step === "start" ? THEME.primary[500] : "#8b5cf6";

  return (
    <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, zIndex:999,
      background:"white", borderRadius:14, border:`2px solid ${THEME.border.light}`,
      boxShadow:"0 8px 32px rgba(0,0,0,0.14)", padding:16, width:290 }}>

      {/* Step toggle */}
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        {(["start","end"] as const).map(s => {
          const isActive = step === s;
          const color = s==="start" ? THEME.primary[500] : "#8b5cf6";
          const date = s==="start" ? tSD : tED;
          const time = s==="start" ? tST : tET;
          return (
            <button key={s} onClick={() => setStep(s)} style={{
              flex:1, padding:"7px 6px", borderRadius:8, fontSize:11, fontWeight:700,
              border:`2px solid ${isActive ? color : THEME.border.light}`,
              background:isActive ? `${color}10` : "white",
              color:isActive ? color : THEME.text.tertiary,
              cursor:"pointer", fontFamily:"inherit", textAlign:"center" as const }}>
              <div>{s==="start" ? "🟢 Start" : "🔴 End"}</div>
              <div style={{ fontSize:10, marginTop:2, color:date?color:THEME.text.tertiary, fontWeight:800 }}>
                {date
                  ? `${new Date(date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})} · ${time}`
                  : "Pick date"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Step hint */}
      <div style={{ fontSize:10, color:stepColor, fontWeight:700, textAlign:"center",
        marginBottom:10, background:`${stepColor}10`, borderRadius:6, padding:"4px 0" }}>
        {step==="start" ? "Click to set start date" : "Click to set end date"}
      </div>

      {/* Calendar */}
      <Calendar rangeStart={tSD} rangeEnd={tED} activeStep={step} onSelect={handleDateSelect} />

      {/* Time pickers */}
      <div style={{ display:"flex", gap:8, marginTop:12 }}>
        <TimeInput label="Start time" value={tST} onChange={setTST} accentColor={THEME.primary[500]} />
        <TimeInput label="End time" value={tET} onChange={setTET} accentColor="#8b5cf6" />
      </div>

      {/* Apply */}
      <button onClick={handleApply} disabled={!tSD||!tED} style={{
        width:"100%", marginTop:12, padding:"9px 0", borderRadius:9,
        fontSize:13, fontWeight:800, border:"none",
        cursor:tSD&&tED?"pointer":"not-allowed",
        background:tSD&&tED ? `linear-gradient(90deg, ${THEME.primary[500]}, #8b5cf6)` : THEME.neutral[200],
        color:tSD&&tED?"white":THEME.text.tertiary,
        fontFamily:"inherit", opacity:tSD&&tED?1:0.6 }}>
        Apply Range
      </button>

      {/* Quick presets */}
      <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${THEME.border.light}` }}>
        <div style={{ fontSize:10, color:THEME.text.tertiary, fontWeight:700,
          textTransform:"uppercase", letterSpacing:0.5, marginBottom:7 }}>Quick select</div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {[{label:"Today",days:1},{label:"Last 7d",days:7},
            {label:"Last 14d",days:14},{label:"Last 30d",days:30}].map(({label,days}) => (
            <button key={label} onClick={() => applyPreset(days)} style={{
              padding:"4px 9px", borderRadius:6, fontSize:11, fontWeight:600,
              border:`1px solid ${THEME.border.light}`, background:THEME.neutral[50],
              color:THEME.text.secondary, cursor:"pointer", fontFamily:"inherit" }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, sub }: { icon:string; title:string; sub:string }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:22 }}>{icon}</span>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:THEME.text.primary, letterSpacing:-0.3 }}>{title}</div>
          <div style={{ fontSize:12, color:THEME.text.tertiary, marginTop:1 }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value:number; max:number; color:string }) {
  return (
    <div style={{ flex:1, height:6, background:THEME.neutral[100], borderRadius:3, overflow:"hidden" }}>
      <div style={{ width:`${max>0?Math.min((value/max)*100,100):0}%`, height:"100%",
        background:color, borderRadius:3, transition:"width 0.4s ease" }} />
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, bg }: {
  icon:string; label:string; value:string; sub:string; color:string; bg:string;
}) {
  return (
    <div style={{ background:bg, border:`2px solid ${color}25`, borderRadius:14,
      padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize:22, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:18, fontWeight:800, color, letterSpacing:-0.5, lineHeight:1.1 }}>{value}</div>
      <div style={{ fontSize:11, color:THEME.text.tertiary, fontWeight:700,
        textTransform:"uppercase", letterSpacing:0.5, marginTop:4 }}>{label}</div>
      <div style={{ fontSize:11, color:THEME.text.tertiary, marginTop:2 }}>{sub}</div>
    </div>
  );
}

function Card({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) {
  return (
    <div style={{ background:"white", borderRadius:14, border:`2px solid ${THEME.border.light}`,
      padding:24, boxShadow:"0 1px 4px rgba(0,0,0,0.05)", ...style }}>
      {children}
    </div>
  );
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes/60), m = Math.round(minutes%60);
  return h===0 ? `${m}m` : `${h}h ${m}m`;
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
}
function formatDay(dayStr: string) {
  return new Date(dayStr).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
}

// ── Main component ────────────────────────────────────────────────────────────
export function AnalyticsTab({ device }: AnalyticsTabProps) {
  const [days, setDays] = useState(1);

  // Custom datetime range (fuel section only)
  const [customMode, setCustomMode] = useState(false);
  const [startDate, setStartDate] = useState<string|null>(null);
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState<string|null>(null);
  const [endTime, setEndTime] = useState("23:59");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [summary, setSummary] = useState<Summary|null>(null);
  const [fuelLoading, setFuelLoading] = useState(true);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripSummary, setTripSummary] = useState<TripSummary|null>(null);
  const [tripsLoading, setTripsLoading] = useState(true);

  const [idleSummary, setIdleSummary] = useState<IdleSummary|null>(null);
  const [dailyIdle, setDailyIdle] = useState<DailyIdle[]>([]);
  const [idleLoading, setIdleLoading] = useState(true);

  const [error, setError] = useState<string|null>(null);

  const [baselineKmpl, setBaselineKmpl] = useState(10);
  const [editingBaseline, setEditingBaseline] = useState(false);
  const [baselineInput, setBaselineInput] = useState("10");
  const baselineRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`baseline_kmpl_${device.id}`);
    if (saved) { const v=parseFloat(saved); if(!isNaN(v)&&v>0){setBaselineKmpl(v);setBaselineInput(v.toString());} }
  }, [device.id]);

  useEffect(() => { if(editingBaseline) baselineRef.current?.focus(); }, [editingBaseline]);

  useEffect(() => {
    if(!calendarOpen) return;
    const h = (e:MouseEvent) => { if(calendarRef.current&&!calendarRef.current.contains(e.target as Node)) setCalendarOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [calendarOpen]);

  const fetchFuel = useCallback(async () => {
    setFuelLoading(true); setError(null);
    try {
      let url: string;
      if (customMode && startDate && endDate) {
        const s = encodeURIComponent(toISTIso(startDate, startTime));
        const e = encodeURIComponent(toISTIso(endDate, endTime));
        url = `/api/analytics?device_id=${device.id}&start_datetime=${s}&end_datetime=${e}`;
      } else {
        url = `/api/analytics?device_id=${device.id}&days=${days}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if(data.success){setDailyData(data.data);setSummary(data.summary);}
      else setError(data.error);
    } catch { setError("Failed to fetch fuel data"); }
    finally { setFuelLoading(false); }
  }, [device.id, days, customMode, startDate, startTime, endDate, endTime]);

  const fetchTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      const res = await fetch(`/api/analytics/trips?device_id=${device.id}&days=${days}`);
      const data = await res.json();
      if(data.success){setTrips(data.trips);setTripSummary(data.summary);}
    } catch {}
    finally { setTripsLoading(false); }
  }, [device.id, days]);

  const fetchIdle = useCallback(async () => {
    setIdleLoading(true);
    try {
      const res = await fetch(`/api/analytics/idle?device_id=${device.id}&days=${days}`);
      const data = await res.json();
      if(data.success){setIdleSummary(data.summary);setDailyIdle(data.daily);}
    } catch {}
    finally { setIdleLoading(false); }
  }, [device.id, days]);

  useEffect(() => { if(!customMode) fetchFuel(); fetchTrips(); fetchIdle(); }, [device.id, days]);
  useEffect(() => { if(customMode&&startDate&&endDate) fetchFuel(); }, [customMode,startDate,startTime,endDate,endTime,device.id]);

  const handleConfirm = (sd:string, st:string, ed:string, et:string) => {
    setStartDate(sd); setStartTime(st); setEndDate(ed); setEndTime(et); setCustomMode(true);
  };

  const handleBaselineSave = () => {
    const v = parseFloat(baselineInput);
    if(!isNaN(v)&&v>0){ setBaselineKmpl(v); localStorage.setItem(`baseline_kmpl_${device.id}`,v.toString()); }
    setEditingBaseline(false);
  };

  const validDays = dailyData.filter(d=>d.fuel_average_kmpl!==null&&d.fuel_litres>0);
  const baselineFuelTotal = validDays.reduce((s,d)=>s+d.distance_km/baselineKmpl,0);
  const actualFuelTotal = validDays.reduce((s,d)=>s+d.fuel_litres,0);
  const fuelSaved = parseFloat((baselineFuelTotal-actualFuelTotal).toFixed(2));
  const co2Saved = parseFloat((Math.abs(fuelSaved)*CO2_PER_LITRE).toFixed(2));
  const improved = fuelSaved > 0;

  const maxKmpl = Math.max(...dailyData.map(d=>d.fuel_average_kmpl??0), baselineKmpl, 1);
  const maxIdleMin = Math.max(...dailyIdle.map(d=>d.idle_minutes), 1);
  const customLabel = customMode&&startDate&&endDate
    ? formatDatetimeLabel(startDate,startTime,endDate,endTime) : "Custom";

  const renderComparisonChart = () => {
    const chartData = [...dailyData].reverse();
    if(chartData.length===0) return (
      <div style={{padding:40,textAlign:"center",color:THEME.text.tertiary,fontSize:13}}>
        No efficiency data for this period
      </div>
    );
    const W=640,H=190,PAD={top:16,right:60,bottom:32,left:48};
    const gW=W-PAD.left-PAD.right, gH=H-PAD.top-PAD.bottom, n=chartData.length;
    const yMax=maxKmpl*1.2;
    const xPos=(i:number)=>PAD.left+(n===1?gW/2:(i/(n-1))*gW);
    const yPos=(v:number)=>PAD.top+gH-(v/yMax)*gH;
    const actualPoints=chartData
      .map((d,i)=>d.fuel_average_kmpl!==null?{x:xPos(i),y:yPos(d.fuel_average_kmpl),v:d.fuel_average_kmpl}:null)
      .filter(Boolean) as {x:number;y:number;v:number}[];
    const path=actualPoints.length>1?`M ${actualPoints.map(p=>`${p.x},${p.y}`).join(" L ")}` : "";
    const baseY=yPos(baselineKmpl);
    return (
      <div style={{width:"100%",overflowX:"auto"}}>
        <svg width={W} height={H} style={{display:"block",overflow:"visible"}}>
          <defs>
            <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={THEME.primary[500]} stopOpacity={0.25}/>
              <stop offset="100%" stopColor={THEME.primary[500]} stopOpacity={0}/>
            </linearGradient>
          </defs>
          {[0,0.25,0.5,0.75,1].map(f=>{
            const v=parseFloat((yMax*f).toFixed(1)), y=yPos(v);
            return <g key={f}>
              <line x1={PAD.left} y1={y} x2={PAD.left+gW} y2={y} stroke={THEME.border.light} strokeWidth={1} strokeDasharray="4,4"/>
              <text x={PAD.left-6} y={y+4} fill={THEME.text.tertiary} fontSize={10} textAnchor="end">{v}</text>
            </g>;
          })}
          <line x1={PAD.left} y1={baseY} x2={PAD.left+gW} y2={baseY} stroke="#f59e0b" strokeWidth={2} strokeDasharray="8,4"/>
          <text x={PAD.left+gW+6} y={baseY+4} fill="#f59e0b" fontSize={10} fontWeight="700">{baselineKmpl}</text>
          {path&&<>
            <path d={`${path} L ${actualPoints[actualPoints.length-1].x},${PAD.top+gH} L ${actualPoints[0].x},${PAD.top+gH} Z`} fill="url(#ag)"/>
            <path d={path} fill="none" stroke={THEME.primary[500]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
          </>}
          {actualPoints.map((p,i)=>(
            <circle key={i} cx={p.x} cy={p.y} r={5} fill="white" stroke={THEME.primary[500]} strokeWidth={2.5}>
              <title>{p.v.toFixed(2)} km/L</title>
            </circle>
          ))}
          {chartData.map((d,i)=>(
            <text key={i} x={xPos(i)} y={H-4} fill={THEME.text.tertiary} fontSize={10} textAnchor="middle">
              {new Date(d.day).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
            </text>
          ))}
          <text x={13} y={PAD.top+gH/2} fill={THEME.text.secondary} fontSize={11}
            textAnchor="middle" transform={`rotate(-90, 13, ${PAD.top+gH/2})`}>km/L</text>
        </svg>
        <div style={{display:"flex",gap:18,marginTop:10,paddingLeft:PAD.left}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:18,height:3,background:THEME.primary[500],borderRadius:2}}/>
            <span style={{fontSize:11,color:THEME.text.secondary}}>Actual efficiency</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:18,height:2,borderTop:"2px dashed #f59e0b"}}/>
            <span style={{fontSize:11,color:THEME.text.secondary}}>Baseline ({baselineKmpl} km/L)</span>
          </div>
        </div>
      </div>
    );
  };

  const Spinner = () => (
    <div style={{display:"flex",justifyContent:"center",padding:32}}>
      <div style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${THEME.border.light}`,
        borderTop:`3px solid ${THEME.primary[500]}`,animation:"spin 1s linear infinite"}}/>
    </div>
  );

  return (
    <div style={{padding:24,background:THEME.background.secondary,minHeight:"100%",overflowY:"auto"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:THEME.text.primary,letterSpacing:-0.5}}>📊 Fleet Analytics</div>
          <div style={{fontSize:13,color:THEME.text.secondary,marginTop:3}}>{device.device_name} · Fuel · Trips · Idle time</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {/* Preset buttons */}
          <div style={{display:"flex",gap:4,background:THEME.neutral[100],padding:4,borderRadius:10}}>
            {[1,7,14].map(d=>(
              <button key={d} onClick={()=>{setCustomMode(false);setDays(d);}} style={{
                padding:"7px 18px",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",
                fontFamily:"inherit",border:"none",transition:"all 0.15s",
                background:!customMode&&days===d?THEME.primary[500]:"transparent",
                color:!customMode&&days===d?"white":THEME.text.secondary,
                boxShadow:!customMode&&days===d?THEME.shadow.sm:"none" }}>{d}D</button>
            ))}
          </div>

          {/* Custom datetime picker */}
          <div ref={calendarRef} style={{position:"relative"}}>
            <button onClick={()=>setCalendarOpen(o=>!o)} style={{
              padding:"7px 13px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:"none",transition:"all 0.15s",
              background:customMode?`linear-gradient(90deg,${THEME.primary[500]},#8b5cf6)`:THEME.neutral[100],
              color:customMode?"white":THEME.text.secondary,
              boxShadow:customMode?THEME.shadow.sm:"none",
              display:"flex",alignItems:"center",gap:5,maxWidth:230,overflow:"hidden" }}>
              <span>📅</span>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{customLabel}</span>
              <span style={{fontSize:9,opacity:0.7,flexShrink:0}}>▼</span>
            </button>
            {calendarOpen && (
              <DatetimeRangePicker
                startDate={startDate} startTime={startTime}
                endDate={endDate} endTime={endTime}
                onConfirm={handleConfirm} onClose={()=>setCalendarOpen(false)}
              />
            )}
          </div>
        </div>
      </div>

      {error&&(
        <div style={{padding:16,background:"#fef2f2",border:"2px solid #fca5a5",
          borderRadius:12,color:"#dc2626",fontSize:13,marginBottom:20}}>⚠️ {error}</div>
      )}

      {/* ── SECTION 1: FUEL EFFICIENCY ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
        <SectionHeader icon="⛽" title="Fuel Efficiency" sub="Daily consumption vs baseline target"/>
        {customMode&&startDate&&endDate&&(
          <div style={{fontSize:11,fontWeight:700,color:THEME.primary[600],
            background:THEME.primary[50],border:`1px solid ${THEME.primary[200]}`,
            borderRadius:8,padding:"4px 10px",marginBottom:16,whiteSpace:"nowrap"}}>
            📅 {formatDatetimeLabel(startDate,startTime,endDate,endTime)}
          </div>
        )}
      </div>

      {!fuelLoading&&summary&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12,marginBottom:16}}>
          <StatCard icon="🛣️" label="Total Distance"
            value={`${summary.total_distance_km.toLocaleString("en-IN")} km`}
            sub={`${summary.days_with_data} days with data`} color={THEME.primary[500]} bg={THEME.primary[50]}/>
          <StatCard icon="⛽" label="Fuel Consumed"
            value={`${summary.total_fuel_litres.toLocaleString("en-IN")} L`}
            sub={customMode&&startDate&&endDate?formatDatetimeLabel(startDate,startTime,endDate,endTime):`${days}D window`}
            color="#f59e0b" bg="#fffbeb"/>
          <StatCard icon="📈" label="Avg Efficiency"
            value={summary.overall_fuel_average_kmpl?`${summary.overall_fuel_average_kmpl} km/L`:"N/A"}
            sub={`Baseline: ${baselineKmpl} km/L`} color="#3b82f6" bg="#eff6ff"/>
          <StatCard icon={improved?"🌱":"⚡"} label="CO₂ Impact"
            value={validDays.length>0?`${improved?"-":"+"}${co2Saved} kg`:"N/A"}
            sub={improved?`${Math.abs(fuelSaved)}L saved`:`${Math.abs(fuelSaved)}L extra`}
            color={improved?"#16a34a":"#dc2626"} bg={improved?"#dcfce7":"#fef2f2"}/>
        </div>
      )}
      {fuelLoading&&<Spinner/>}

      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:THEME.text.primary}}>Actual vs Baseline Efficiency</div>
            <div style={{fontSize:11,color:THEME.text.tertiary,marginTop:2}}>km/L — higher is better</div>
          </div>
          {editingBaseline?(
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input ref={baselineRef} type="number" value={baselineInput}
                onChange={e=>setBaselineInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")handleBaselineSave();if(e.key==="Escape")setEditingBaseline(false);}}
                style={{width:65,padding:"6px 10px",borderRadius:8,fontSize:13,fontWeight:700,
                  border:`2px solid ${THEME.primary[500]}`,outline:"none",textAlign:"center",fontFamily:"inherit"}}/>
              <span style={{fontSize:11,color:THEME.text.tertiary}}>km/L</span>
              <button onClick={handleBaselineSave} style={{padding:"6px 12px",background:THEME.primary[500],color:"white",
                border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Set</button>
              <button onClick={()=>setEditingBaseline(false)} style={{padding:"6px 10px",background:THEME.neutral[100],
                color:THEME.text.secondary,border:"none",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
            </div>
          ):(
            <button onClick={()=>setEditingBaseline(true)} style={{padding:"6px 14px",background:"#fffbeb",
              border:"2px solid #f59e0b",borderRadius:8,fontSize:13,fontWeight:700,color:"#92400e",
              cursor:"pointer",fontFamily:"inherit"}}>✏️ {baselineKmpl} km/L baseline</button>
          )}
        </div>
        {fuelLoading?<Spinner/>:renderComparisonChart()}
      </Card>

      {!fuelLoading&&validDays.length>0&&(
        <div style={{display:"flex",alignItems:"center",gap:16,
          background:improved?"linear-gradient(135deg,#f0fdf4,#dcfce7)":"linear-gradient(135deg,#fef2f2,#fee2e2)",
          border:`2px solid ${improved?"#86efac":"#fca5a5"}`,
          borderRadius:14,padding:"18px 22px",marginBottom:28,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          <span style={{fontSize:40}}>{improved?"🌱":"⚠️"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:800,color:improved?"#15803d":"#b91c1c"}}>
              {improved?`${co2Saved} kg CO₂ saved vs baseline`:`${co2Saved} kg extra CO₂ vs baseline`}
            </div>
            <div style={{fontSize:12,color:improved?"#166534":"#991b1b",marginTop:3}}>
              {improved?`${Math.abs(fuelSaved)}L less fuel than baseline · ~${(co2Saved/0.12).toFixed(0)} km worth of savings`
                :`${Math.abs(fuelSaved)}L more fuel than baseline`}
            </div>
            <div style={{fontSize:10,color:THEME.text.tertiary,marginTop:3}}>
              CO₂ factor: {CO2_PER_LITRE} kg/L diesel · Based on {validDays.length} days with fuel data
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:THEME.text.tertiary,textTransform:"uppercase",letterSpacing:0.5}}>
              Fuel {improved?"saved":"excess"}
            </div>
            <div style={{fontSize:22,fontWeight:800,color:improved?"#16a34a":"#dc2626"}}>
              {improved?"-":"+"}{Math.abs(fuelSaved)} L
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: TRIPS ── */}
      <SectionHeader icon="🗺️" title="Trip Analysis" sub="Ignition ON → OFF based trips with GPS distance"/>
      {tripsLoading?<Spinner/>:tripSummary&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12,marginBottom:16}}>
            <StatCard icon="🚗" label="Total Trips" value={`${tripSummary.total_trips}`}
              sub={`${days}D window`} color="#8b5cf6" bg="#f5f3ff"/>
            <StatCard icon="📍" label="GPS Distance" value={`${tripSummary.total_distance_km} km`}
              sub="Haversine calculated" color={THEME.primary[500]} bg={THEME.primary[50]}/>
            <StatCard icon="⏱️" label="Total Drive Time" value={formatDuration(tripSummary.total_duration_min)}
              sub={`Avg ${formatDuration(tripSummary.avg_trip_duration_min)}/trip`} color="#0891b2" bg="#ecfeff"/>
            <StatCard icon="🏆" label="Longest Trip" value={`${tripSummary.longest_trip_km} km`}
              sub={`Avg ${tripSummary.avg_trip_distance_km} km/trip`} color="#f59e0b" bg="#fffbeb"/>
          </div>
          {trips.length>0&&(
            <Card style={{marginBottom:28}}>
              <div style={{fontSize:13,fontWeight:700,color:THEME.text.primary,marginBottom:14}}>Trip Log</div>
              <div style={{display:"grid",gridTemplateColumns:"48px 1fr 80px 90px 90px 80px",gap:10,
                padding:"8px 12px",background:THEME.neutral[50],borderRadius:8,fontSize:10,fontWeight:700,
                color:THEME.text.tertiary,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>
                <div>#</div><div>Time</div><div>Duration</div><div>Distance</div><div>Avg Speed</div>
                <div style={{textAlign:"right"}}>Max Speed</div>
              </div>
              {trips.map(trip=>(
                <div key={trip.trip_number} style={{display:"grid",gridTemplateColumns:"48px 1fr 80px 90px 90px 80px",
                  gap:10,padding:"10px 12px",alignItems:"center",borderBottom:`1px solid ${THEME.border.light}`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:THEME.primary[100],
                    color:THEME.primary[600],display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,fontWeight:800}}>{trip.trip_number}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:THEME.text.primary}}>
                      {formatTime(trip.start_time)} → {formatTime(trip.end_time)}
                    </div>
                    <div style={{fontSize:10,color:THEME.text.tertiary,marginTop:1}}>
                      {new Date(trip.start_time).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                      {" · "}{trip.gps_points} GPS points
                    </div>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:"#0891b2"}}>{formatDuration(trip.duration_min)}</div>
                  <div style={{fontSize:13,fontWeight:700,color:THEME.primary[600]}}>{trip.distance_km} km</div>
                  <div style={{fontSize:13,fontWeight:600,color:THEME.text.primary}}>{trip.avg_speed_kmh} km/h</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#f59e0b",textAlign:"right"}}>{trip.max_speed_kmh} km/h</div>
                </div>
              ))}
            </Card>
          )}
          {trips.length===0&&(
            <Card style={{marginBottom:28,textAlign:"center",color:THEME.text.tertiary,fontSize:13,padding:32}}>
              No trips detected in this period. Check ignition IO 239 records.
            </Card>
          )}
        </>
      )}

      {/* ── SECTION 3: IDLE ── */}
      <SectionHeader icon="💤" title="Idle Time" sub="Engine ON + Speed = 0 for more than 5 minutes"/>
      {idleLoading?<Spinner/>:idleSummary&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12,marginBottom:16}}>
            <StatCard icon="⏳" label="Total Idle Time" value={formatDuration(idleSummary.total_idle_minutes)}
              sub={`${idleSummary.total_idle_events} idle events`} color="#dc2626" bg="#fef2f2"/>
            <StatCard icon="📊" label="Avg Idle Duration" value={formatDuration(idleSummary.avg_idle_duration_min)}
              sub="Per idle event" color="#f59e0b" bg="#fffbeb"/>
            <StatCard icon="⛽" label="Fuel Wasted (est.)" value={`${idleSummary.estimated_fuel_wasted_litres} L`}
              sub="@ 0.8 L/h idle rate" color="#ea580c" bg="#fff7ed"/>
            <StatCard icon="🌫️" label="CO₂ from Idling" value={`${idleSummary.estimated_co2_wasted_kg} kg`}
              sub="Preventable emissions" color="#7c3aed" bg="#f5f3ff"/>
          </div>
          {dailyIdle.length>0&&(
            <Card style={{marginBottom:24}}>
              <div style={{fontSize:13,fontWeight:700,color:THEME.text.primary,marginBottom:14}}>Daily Idle Breakdown</div>
              {dailyIdle.map((row,i)=>(
                <div key={row.day} style={{display:"grid",gridTemplateColumns:"120px 1fr 90px 80px",
                  gap:12,padding:"10px 0",alignItems:"center",
                  borderBottom:i<dailyIdle.length-1?`1px solid ${THEME.border.light}`:"none"}}>
                  <div style={{fontSize:12,fontWeight:600,color:THEME.text.primary}}>{formatDay(row.day)}</div>
                  <MiniBar value={row.idle_minutes} max={maxIdleMin} color="#dc2626"/>
                  <div style={{fontSize:12,fontWeight:700,color:"#dc2626",textAlign:"right"}}>{formatDuration(row.idle_minutes)}</div>
                  <div style={{fontSize:11,color:THEME.text.tertiary,textAlign:"right"}}>
                    {row.idle_events} event{row.idle_events!==1?"s":""}
                  </div>
                </div>
              ))}
            </Card>
          )}
          {dailyIdle.length===0&&(
            <Card style={{marginBottom:24,textAlign:"center",color:THEME.text.tertiary,fontSize:13,padding:32}}>
              No idle events ≥ 5 min detected in this period.
            </Card>
          )}
        </>
      )}
    </div>
  );
}