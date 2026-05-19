// "use client";

// import React, { useState, useEffect, useCallback } from "react";
// import { Device } from "@/types";
// import { THEME } from "@/lib/theme";

// // ── IO Name Mappings (shared with telemetry route) ──────────────────────────

// const SHARED_IO_NAMES: Record<number, { name: string; unit?: string }> = {
//   1:   { name: "din.1" },
//   2:   { name: "din.2" },
//   3:   { name: "din.3" },
//   4:   { name: "din.4" },
//   5:   { name: "pulse.counter.din2" },
//   9:   { name: "ain.1", unit: "V" },
//   10:  { name: "ain.2", unit: "V" },
//   11:  { name: "ain.3", unit: "V" },
//   12:  { name: "fuel.used.gps", unit: "l" },
//   13:  { name: "fuel.rate.gps", unit: "l/100km" },
//   21:  { name: "gsm.signal.level" },
//   22:  { name: "data.mode.enum" },
//   24:  { name: "vehicle.speed", unit: "km/h" },
//   50:  { name: "dout.3" },
//   51:  { name: "dout.4" },
//   66:  { name: "external.voltage", unit: "V" },
//   67:  { name: "battery.voltage", unit: "V" },
//   68:  { name: "battery.current", unit: "mA" },
//   71:  { name: "gnss.state" },
//   72:  { name: "dallas.temp.1", unit: "°C" },
//   73:  { name: "dallas.temp.2", unit: "°C" },
//   74:  { name: "dallas.temp.3", unit: "°C" },
//   75:  { name: "dallas.temp.4", unit: "°C" },
//   76:  { name: "dallas.temp.id.1" },
//   80:  { name: "data.mode" },
//   81:  { name: "pdop", unit: "" },
//   82:  { name: "hdop", unit: "" },
//   85:  { name: "geofence.zone.1" },
//   86:  { name: "geofence.zone.2" },
//   104: { name: "bluetooth.status" },
//   105: { name: "total.odometer", unit: "m" },
//   113: { name: "battery.level / fms.service.distance" },
//   179: { name: "dout.1" },
//   180: { name: "dout.2" },
//   181: { name: "gnss.pdop" },
//   182: { name: "gnss.hdop" },
//   199: { name: "trip.odometer", unit: "m" },
//   200: { name: "sleep.mode" },
//   216: { name: "vehicle.mileage", unit: "m" },
//   236: { name: "accelerometer.x", unit: "mG" },
//   237: { name: "accelerometer.y", unit: "mG" },
//   238: { name: "accelerometer.z", unit: "mG" },
//   239: { name: "ignition.status" },
//   240: { name: "movement.status" },
//   241: { name: "gsm.operator" },
//   245: { name: "ain.4", unit: "V" },
//   250: { name: "trip.event" },
//   483: { name: "can.program.number" },
// };

// // CAN Bus extended IDs
// const CAN_IO_NAMES: Record<number, { name: string; unit?: string }> = {
//   10912: { name: "can.engine.worktime", unit: "min" },
//   10913: { name: "can.engine.fuel.total", unit: "l" },
//   10914: { name: "can.engine.rpm", unit: "rpm" },
//   10915: { name: "can.vehicle.speed", unit: "km/h" },
//   10916: { name: "can.fuel.level", unit: "%" },
//   10917: { name: "can.adblue.level", unit: "l" },
// };

// function getIOName(ioId: number): string {
//   return SHARED_IO_NAMES[ioId]?.name
//     || CAN_IO_NAMES[ioId]?.name
//     || `io.${ioId}`;
// }

// function getIOUnit(ioId: number): string {
//   return SHARED_IO_NAMES[ioId]?.unit
//     || CAN_IO_NAMES[ioId]?.unit
//     || "";
// }

// // ── Helper: format timestamp to IST ─────────────────────────────────────────

// function formatIST(ts: string): string {
//   const d = new Date(ts);
//   return d.toLocaleString("en-IN", {
//     timeZone: "Asia/Kolkata",
//     year: "numeric",
//     month: "short",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: true,
//   });
// }

// // ── Helper: today's date as YYYY-MM-DD ──────────────────────────────────────

// function todayDate(): string {
//   const now = new Date();
//   // Get IST date
//   const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
//   return ist.toISOString().split("T")[0];
// }

// // ── Styles ──────────────────────────────────────────────────────────────────

// const inputStyle: React.CSSProperties = {
//   background: "white",
//   border: `2px solid ${THEME.border.light}`,
//   borderRadius: 8,
//   padding: "10px 14px",
//   color: THEME.text.primary,
//   fontSize: 13,
//   fontFamily: "inherit",
//   outline: "none",
//   boxSizing: "border-box",
//   transition: "border-color 0.2s",
//   width: "100%",
// };

// const labelStyle: React.CSSProperties = {
//   fontSize: 11,
//   color: THEME.text.tertiary,
//   textTransform: "uppercase",
//   letterSpacing: 1,
//   display: "block",
//   marginBottom: 6,
//   fontWeight: 600,
// };

// // ── Component ───────────────────────────────────────────────────────────────

// interface LogsTabProps {
//   device: Device;
// }

// interface LogRecord {
//   io_id: number;
//   io_value: string;
//   timestamp: string;
// }

// export function LogsTab({ device }: LogsTabProps) {
//   // Available IO parameters for this device
//   const [availableParams, setAvailableParams] = useState<number[]>([]);
//   const [loadingParams, setLoadingParams] = useState(true);

//   // Filter controls
//   const [selectedDate, setSelectedDate] = useState(todayDate());
//   const [startTime, setStartTime] = useState("00:00");
//   const [endTime, setEndTime] = useState("23:59");
//   const [selectedIOIds, setSelectedIOIds] = useState<number[]>([]);
//   const [showParamDropdown, setShowParamDropdown] = useState(false);
//   const [paramSearch, setParamSearch] = useState("");

//   // Results
//   const [records, setRecords] = useState<LogRecord[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [queryInfo, setQueryInfo] = useState<{ count: number; time: number } | null>(null);

//   // Fetch available IO parameters on mount
//   useEffect(() => {
//     async function fetchParams() {
//       try {
//         const res = await fetch(`/api/io-logs/${device.id}?mode=params`);
//         const data = await res.json();
//         if (data.success) {
//           setAvailableParams(data.io_ids);
//         }
//       } catch (err) {
//         console.error("Failed to load IO params:", err);
//       } finally {
//         setLoadingParams(false);
//       }
//     }
//     fetchParams();
//   }, [device.id]);

//   // Toggle IO id selection
//   const toggleIOId = (ioId: number) => {
//     setSelectedIOIds((prev) => {
//       if (prev.includes(ioId)) return prev.filter((id) => id !== ioId);
//       if (prev.length >= 10) return prev; // max 10
//       return [...prev, ioId];
//     });
//   };

//   // Remove a selected IO id
//   const removeIOId = (ioId: number) => {
//     setSelectedIOIds((prev) => prev.filter((id) => id !== ioId));
//   };

//   // Fetch logs
//   const handleFetch = useCallback(async () => {
//     if (selectedIOIds.length === 0) {
//       setError("Select at least one IO parameter");
//       return;
//     }

//     setError("");
//     setLoading(true);
//     setRecords([]);
//     setQueryInfo(null);

//     const startIST = `${selectedDate}T${startTime}:00+05:30`;
//     const endIST = `${selectedDate}T${endTime}:59+05:30`;

//     const startUTC = new Date(startIST).toISOString();
//     const endUTC = new Date(endIST).toISOString();

//     const t0 = performance.now();

//     try {
//       const params = new URLSearchParams({
//         io_ids: selectedIOIds.join(","),
//         start: startUTC,
//         end: endUTC,
//       });

//       const res = await fetch(`/api/io-logs/${device.id}?${params}`);
//       const data = await res.json();

//       const elapsed = Math.round(performance.now() - t0);

//       if (data.success) {
//         setRecords(data.data);
//         setQueryInfo({ count: data.count, time: elapsed });
//       } else {
//         setError(data.error || "Failed to fetch logs");
//       }
//     } catch (err: any) {
//       setError("Network error. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   }, [device.id, selectedDate, startTime, endTime, selectedIOIds]);

//   // Filter params by search
//   const filteredParams = availableParams.filter((ioId) => {
//     if (!paramSearch) return true;
//     const name = getIOName(ioId).toLowerCase();
//     const search = paramSearch.toLowerCase();
//     return name.includes(search) || ioId.toString().includes(search);
//   });

//   return (
//     <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
//       {/* Header */}
//       <div style={{ marginBottom: 20 }}>
//         <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 4 }}>
//           IO Data Logs
//         </div>
//         <div style={{ fontSize: 13, color: THEME.text.secondary }}>
//           Query historical IO parameter values by date, time, and parameter
//         </div>
//       </div>

//       {/* Filter Card */}
//       <div
//         style={{
//           background: "white",
//           borderRadius: 12,
//           border: `2px solid ${THEME.border.light}`,
//           padding: 24,
//           marginBottom: 20,
//           boxShadow: THEME.shadow.sm,
//         }}
//       >
//         {/* Row 1: Date + Time Range */}
//         <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
//           {/* Date */}
//           <div style={{ flex: "1 1 180px", minWidth: 160 }}>
//             <label style={labelStyle}>Date</label>
//             <input
//               type="date"
//               value={selectedDate}
//               onChange={(e) => setSelectedDate(e.target.value)}
//               max={todayDate()}
//               style={inputStyle}
//             />
//           </div>

//           {/* Start Time */}
//           <div style={{ flex: "1 1 140px", minWidth: 120 }}>
//             <label style={labelStyle}>From Time (IST)</label>
//             <input
//               type="time"
//               value={startTime}
//               onChange={(e) => setStartTime(e.target.value)}
//               style={inputStyle}
//             />
//           </div>

//           {/* End Time */}
//           <div style={{ flex: "1 1 140px", minWidth: 120 }}>
//             <label style={labelStyle}>To Time (IST)</label>
//             <input
//               type="time"
//               value={endTime}
//               onChange={(e) => setEndTime(e.target.value)}
//               style={inputStyle}
//             />
//           </div>
//         </div>

//         {/* Row 2: IO Parameter Selector */}
//         <div style={{ marginBottom: 20 }}>
//           <label style={labelStyle}>
//             IO Parameters
//             {selectedIOIds.length > 0 && (
//               <span style={{ color: THEME.primary[500], marginLeft: 8, fontWeight: 700, fontSize: 12 }}>
//                 {selectedIOIds.length} selected
//               </span>
//             )}
//           </label>

//           {/* Selected tags */}
//           {selectedIOIds.length > 0 && (
//             <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
//               {selectedIOIds.map((ioId) => (
//                 <div
//                   key={ioId}
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 6,
//                     background: THEME.primary[50],
//                     border: `1px solid ${THEME.primary[200]}`,
//                     borderRadius: 6,
//                     padding: "4px 10px",
//                     fontSize: 12,
//                     fontWeight: 600,
//                     color: THEME.primary[700],
//                   }}
//                 >
//                   <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
//                     {getIOName(ioId)}
//                   </span>
//                   <span
//                     onClick={() => removeIOId(ioId)}
//                     style={{
//                       cursor: "pointer",
//                       fontSize: 14,
//                       lineHeight: 1,
//                       color: THEME.primary[400],
//                       marginLeft: 2,
//                     }}
//                   >
//                     ×
//                   </span>
//                 </div>
//               ))}
//               {selectedIOIds.length > 1 && (
//                 <div
//                   onClick={() => setSelectedIOIds([])}
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 4,
//                     background: "#fee2e2",
//                     border: "1px solid #fecaca",
//                     borderRadius: 6,
//                     padding: "4px 10px",
//                     fontSize: 11,
//                     fontWeight: 600,
//                     color: "#dc2626",
//                     cursor: "pointer",
//                   }}
//                 >
//                   Clear all
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Dropdown trigger */}
//           <div style={{ position: "relative" }}>
//             <div
//               onClick={() => setShowParamDropdown(!showParamDropdown)}
//               style={{
//                 ...inputStyle,
//                 cursor: "pointer",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//                 color: selectedIOIds.length === 0 ? THEME.text.tertiary : THEME.text.primary,
//               }}
//             >
//               <span>
//                 {loadingParams
//                   ? "Loading parameters..."
//                   : selectedIOIds.length === 0
//                   ? "Click to select IO parameters..."
//                   : `${selectedIOIds.length} parameter${selectedIOIds.length > 1 ? "s" : ""} selected`}
//               </span>
//               <span style={{ fontSize: 10, transform: showParamDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
//                 ▼
//               </span>
//             </div>

//             {/* Dropdown */}
//             {showParamDropdown && (
//               <div
//                 style={{
//                   position: "absolute",
//                   top: "calc(100% + 4px)",
//                   left: 0,
//                   right: 0,
//                   background: "white",
//                   border: `2px solid ${THEME.border.light}`,
//                   borderRadius: 10,
//                   boxShadow: THEME.shadow.lg,
//                   zIndex: 100,
//                   maxHeight: 320,
//                   overflow: "hidden",
//                   display: "flex",
//                   flexDirection: "column",
//                 }}
//               >
//                 {/* Search */}
//                 <div style={{ padding: "10px 12px", borderBottom: `1px solid ${THEME.border.light}` }}>
//                   <input
//                     type="text"
//                     placeholder="Search parameters..."
//                     value={paramSearch}
//                     onChange={(e) => setParamSearch(e.target.value)}
//                     autoFocus
//                     style={{
//                       ...inputStyle,
//                       border: `1px solid ${THEME.border.light}`,
//                       padding: "8px 12px",
//                       fontSize: 12,
//                     }}
//                   />
//                 </div>

//                 {/* Options list */}
//                 <div style={{ overflowY: "auto", maxHeight: 250 }}>
//                   {filteredParams.length === 0 ? (
//                     <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: THEME.text.tertiary }}>
//                       No parameters found
//                     </div>
//                   ) : (
//                     filteredParams.map((ioId) => {
//                       const isSelected = selectedIOIds.includes(ioId);
//                       const unit = getIOUnit(ioId);
//                       return (
//                         <div
//                           key={ioId}
//                           onClick={() => toggleIOId(ioId)}
//                           style={{
//                             display: "flex",
//                             alignItems: "center",
//                             gap: 10,
//                             padding: "10px 14px",
//                             cursor: "pointer",
//                             background: isSelected ? THEME.primary[50] : "transparent",
//                             borderBottom: `1px solid ${THEME.neutral[100]}`,
//                             transition: "background 0.15s",
//                           }}
//                           onMouseEnter={(e) => {
//                             if (!isSelected) e.currentTarget.style.background = THEME.neutral[50];
//                           }}
//                           onMouseLeave={(e) => {
//                             if (!isSelected) e.currentTarget.style.background = "transparent";
//                           }}
//                         >
//                           {/* Checkbox */}
//                           <div
//                             style={{
//                               width: 18,
//                               height: 18,
//                               borderRadius: 4,
//                               border: `2px solid ${isSelected ? THEME.primary[500] : THEME.border.light}`,
//                               background: isSelected ? THEME.primary[500] : "white",
//                               display: "flex",
//                               alignItems: "center",
//                               justifyContent: "center",
//                               flexShrink: 0,
//                               transition: "all 0.15s",
//                             }}
//                           >
//                             {isSelected && (
//                               <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>✓</span>
//                             )}
//                           </div>

//                           {/* Name + ID */}
//                           <div style={{ flex: 1, minWidth: 0 }}>
//                             <div style={{
//                               fontSize: 13,
//                               fontWeight: 600,
//                               color: THEME.text.primary,
//                               fontFamily: "JetBrains Mono, monospace",
//                             }}>
//                               {getIOName(ioId)}
//                             </div>
//                           </div>

//                           {/* IO ID badge */}
//                           <div style={{
//                             fontSize: 10,
//                             fontWeight: 700,
//                             color: THEME.text.tertiary,
//                             background: THEME.neutral[100],
//                             padding: "2px 8px",
//                             borderRadius: 4,
//                             fontFamily: "JetBrains Mono, monospace",
//                           }}>
//                             ID: {ioId}
//                           </div>

//                           {/* Unit */}
//                           {unit && (
//                             <div style={{
//                               fontSize: 11,
//                               color: THEME.text.secondary,
//                               fontStyle: "italic",
//                             }}>
//                               {unit}
//                             </div>
//                           )}
//                         </div>
//                       );
//                     })
//                   )}
//                 </div>

//                 {/* Footer */}
//                 <div style={{
//                   padding: "8px 14px",
//                   borderTop: `1px solid ${THEME.border.light}`,
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   background: THEME.neutral[50],
//                 }}>
//                   <span style={{ fontSize: 11, color: THEME.text.tertiary }}>
//                     {selectedIOIds.length}/10 selected
//                   </span>
//                   <button
//                     onClick={() => { setShowParamDropdown(false); setParamSearch(""); }}
//                     style={{
//                       fontSize: 12,
//                       fontWeight: 600,
//                       color: THEME.primary[500],
//                       background: "none",
//                       border: "none",
//                       cursor: "pointer",
//                       fontFamily: "inherit",
//                     }}
//                   >
//                     Done
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Fetch Button */}
//         <button
//           onClick={handleFetch}
//           disabled={loading || selectedIOIds.length === 0}
//           style={{
//             background: selectedIOIds.length > 0 ? THEME.primary[500] : THEME.neutral[200],
//             color: selectedIOIds.length > 0 ? "white" : THEME.text.tertiary,
//             border: "none",
//             borderRadius: 10,
//             padding: "12px 32px",
//             fontWeight: 700,
//             fontSize: 14,
//             cursor: selectedIOIds.length > 0 && !loading ? "pointer" : "not-allowed",
//             fontFamily: "inherit",
//             transition: "all 0.2s",
//             boxShadow: selectedIOIds.length > 0 ? THEME.shadow.md : "none",
//           }}
//           onMouseEnter={(e) => {
//             if (selectedIOIds.length > 0 && !loading) {
//               e.currentTarget.style.background = THEME.primary[600];
//               e.currentTarget.style.transform = "translateY(-1px)";
//             }
//           }}
//           onMouseLeave={(e) => {
//             if (selectedIOIds.length > 0) {
//               e.currentTarget.style.background = THEME.primary[500];
//               e.currentTarget.style.transform = "translateY(0)";
//             }
//           }}
//         >
//           {loading ? "⏳ LOADING..." : "🔍 FETCH LOGS"}
//         </button>

//         {/* Error */}
//         {error && (
//           <div style={{
//             marginTop: 12,
//             padding: "10px 14px",
//             background: "#fef2f2",
//             border: "1px solid #fecaca",
//             borderRadius: 8,
//             fontSize: 13,
//             color: "#dc2626",
//             fontWeight: 500,
//           }}>
//             ⚠️ {error}
//           </div>
//         )}
//       </div>

//       {/* Results */}
//       {queryInfo && (
//         <div
//           style={{
//             background: "white",
//             borderRadius: 12,
//             border: `2px solid ${THEME.border.light}`,
//             overflow: "hidden",
//             boxShadow: THEME.shadow.sm,
//           }}
//         >
//           {/* Results header */}
//           <div
//             style={{
//               padding: "14px 20px",
//               borderBottom: `2px solid ${THEME.border.light}`,
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//               background: THEME.neutral[50],
//             }}
//           >
//             <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text.primary }}>
//               Results
//               <span style={{
//                 marginLeft: 10,
//                 fontSize: 12,
//                 fontWeight: 600,
//                 color: THEME.primary[500],
//                 background: THEME.primary[50],
//                 padding: "2px 10px",
//                 borderRadius: 20,
//               }}>
//                 {queryInfo.count} records
//               </span>
//             </div>
//             <div style={{ fontSize: 11, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace" }}>
//               {queryInfo.time}ms
//             </div>
//           </div>

//           {records.length === 0 ? (
//             <div style={{
//               padding: 40,
//               textAlign: "center",
//               fontSize: 13,
//               color: THEME.text.tertiary,
//             }}>
//               No records found for this time range
//             </div>
//           ) : (
//             <div style={{ overflowX: "auto" }}>
//               <table
//                 style={{
//                   width: "100%",
//                   borderCollapse: "collapse",
//                   fontSize: 13,
//                 }}
//               >
//                 <thead>
//                   <tr style={{ background: THEME.neutral[50] }}>
//                     <th style={{
//                       textAlign: "left",
//                       padding: "12px 16px",
//                       fontSize: 11,
//                       fontWeight: 700,
//                       color: THEME.text.tertiary,
//                       textTransform: "uppercase",
//                       letterSpacing: 1,
//                       borderBottom: `2px solid ${THEME.border.light}`,
//                       position: "sticky",
//                       top: 0,
//                       background: THEME.neutral[50],
//                     }}>
//                       Timestamp (IST)
//                     </th>
//                     {selectedIOIds.length > 1 && (
//                       <th style={{
//                         textAlign: "left",
//                         padding: "12px 16px",
//                         fontSize: 11,
//                         fontWeight: 700,
//                         color: THEME.text.tertiary,
//                         textTransform: "uppercase",
//                         letterSpacing: 1,
//                         borderBottom: `2px solid ${THEME.border.light}`,
//                         position: "sticky",
//                         top: 0,
//                         background: THEME.neutral[50],
//                       }}>
//                         Parameter
//                       </th>
//                     )}
//                     <th style={{
//                       textAlign: "right",
//                       padding: "12px 16px",
//                       fontSize: 11,
//                       fontWeight: 700,
//                       color: THEME.text.tertiary,
//                       textTransform: "uppercase",
//                       letterSpacing: 1,
//                       borderBottom: `2px solid ${THEME.border.light}`,
//                       position: "sticky",
//                       top: 0,
//                       background: THEME.neutral[50],
//                     }}>
//                       Value
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {records.map((rec, idx) => {
//                     const unit = getIOUnit(rec.io_id);
//                     return (
//                       <tr
//                         key={idx}
//                         style={{
//                           borderBottom: `1px solid ${THEME.neutral[100]}`,
//                           transition: "background 0.1s",
//                         }}
//                         onMouseEnter={(e) => {
//                           e.currentTarget.style.background = THEME.neutral[50];
//                         }}
//                         onMouseLeave={(e) => {
//                           e.currentTarget.style.background = "transparent";
//                         }}
//                       >
//                         <td style={{
//                           padding: "10px 16px",
//                           fontFamily: "JetBrains Mono, monospace",
//                           fontSize: 12,
//                           color: THEME.text.secondary,
//                           whiteSpace: "nowrap",
//                         }}>
//                           {formatIST(rec.timestamp)}
//                         </td>
//                         {selectedIOIds.length > 1 && (
//                           <td style={{
//                             padding: "10px 16px",
//                             fontFamily: "JetBrains Mono, monospace",
//                             fontSize: 12,
//                             color: THEME.primary[600],
//                             fontWeight: 600,
//                           }}>
//                             {getIOName(rec.io_id)}
//                           </td>
//                         )}
//                         <td style={{
//                           padding: "10px 16px",
//                           textAlign: "right",
//                           fontFamily: "JetBrains Mono, monospace",
//                           fontSize: 13,
//                           fontWeight: 700,
//                           color: THEME.text.primary,
//                         }}>
//                           {rec.io_value}
//                           {unit && (
//                             <span style={{
//                               marginLeft: 4,
//                               fontSize: 11,
//                               fontWeight: 400,
//                               color: THEME.text.tertiary,
//                             }}>
//                               {unit}
//                             </span>
//                           )}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           {/* Footer note */}
//           {queryInfo.count >= 1000 && (
//             <div style={{
//               padding: "10px 20px",
//               borderTop: `1px solid ${THEME.border.light}`,
//               background: "#fffbeb",
//               fontSize: 12,
//               color: "#92400e",
//               fontWeight: 500,
//             }}>
//               ⚠️ Results capped at 1,000 records. Narrow your time range for complete data.
//             </div>
//           )}
//         </div>
//       )}

//       {/* Empty state — no query yet */}
//       {!queryInfo && !loading && (
//         <div
//           style={{
//             background: "white",
//             borderRadius: 12,
//             border: `2px dashed ${THEME.border.light}`,
//             padding: 48,
//             textAlign: "center",
//           }}
//         >
//           <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
//           <div style={{ fontSize: 15, fontWeight: 600, color: THEME.text.primary, marginBottom: 8 }}>
//             Select parameters and time range
//           </div>
//           <div style={{ fontSize: 13, color: THEME.text.tertiary, maxWidth: 400, margin: "0 auto" }}>
//             Choose a date, time window, and one or more IO parameters above, then click Fetch Logs to query the database.
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
"use client";

import React, { useState, useCallback } from "react";
import { Device } from "@/types";
import { THEME } from "@/lib/theme";

// ── Hardcoded common IO parameters ──────────────────────────────────────────

const COMMON_PARAMS: { io_id: number; name: string; unit: string; multiplier?: number }[] = [
  { io_id: 216, name: "vehicle.mileage", unit: "m" },
  { io_id: 16, name: "total.odometer", unit: "m" },
  { io_id: 18, name: "can.fuel.rate", unit: "l/hr", multiplier: 0.1 },
  { io_id: 9, name: "ain.1", unit: "V", multiplier: 0.001 },
  { io_id: 10, name: "ain.2", unit: "V", multiplier: 0.001 },
  { io_id: 11, name: "ain.3", unit: "V", multiplier: 0.001 },
  { io_id: 245, name: "ain.4", unit: "V", multiplier: 0.001 },
  { io_id: 179, name: "dout.1", unit: "" },
  { io_id: 180, name: "dout.2", unit: "" },
  { io_id: 1, name: "din.1", unit: "" },
  { io_id: 2, name: "din.2", unit: "" },
  { io_id: 3, name: "din.3", unit: "" },
  { io_id: 4, name: "din.4", unit: "" },
  { io_id: 67, name: "battery.voltage", unit: "V", multiplier: 0.001 },
  { io_id: 66, name: "external.voltage", unit: "V", multiplier: 0.001 },
  { io_id: 68, name: "battery.current", unit: "mA" },
  { io_id: 12, name: "fuel.used.gps", unit: "l", multiplier: 0.001 },
  { io_id: 13, name: "fuel.rate.gps", unit: "l/100km", multiplier: 0.01 },
  { io_id: 34, name: "can.fuel.level.liters", unit: "l", multiplier: 0.1 },
  { io_id: 35, name: "can.engine.rpm", unit: "rpm" },
  { io_id: 36, name: "can.tracker.counted.mileage", unit: "m" },
  { io_id: 24, name: "vehicle.speed", unit: "km/h" },
  { io_id: 239, name: "ignition.status", unit: "" },
  { io_id: 240, name: "movement.status", unit: "" },
  { io_id: 199, name: "trip.odometer", unit: "m" },
  { io_id: 21, name: "gsm.signal.level", unit: "%" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatIST(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function todayDate(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split("T")[0];
}

const inputStyle: React.CSSProperties = {
  background: "white",
  border: `2px solid ${THEME.border.light}`,
  borderRadius: 8,
  padding: "10px 14px",
  color: THEME.text.primary,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: THEME.text.tertiary,
  textTransform: "uppercase",
  letterSpacing: 1,
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
};

// ── Component ───────────────────────────────────────────────────────────────

interface LogsTabProps {
  device: Device;
}

interface LogRecord {
  io_id: number;
  io_value: string;
  timestamp: string;
}

export function LogsTab({ device }: LogsTabProps) {
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [selectedIOIds, setSelectedIOIds] = useState<number[]>([]);
  const [showParamDropdown, setShowParamDropdown] = useState(false);
  const [paramSearch, setParamSearch] = useState("");

  const [minFilter, setMinFilter] = useState("");
  const [maxFilter, setMaxFilter] = useState("");

  const [records, setRecords] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [queryInfo, setQueryInfo] = useState<{ count: number; time: number } | null>(null);

  const getParam = (ioId: number) => COMMON_PARAMS.find((p) => p.io_id === ioId);

  const formatValue = (ioId: number, raw: string): string => {
    const p = getParam(ioId);
    if (!p?.multiplier) return raw;
    const num = parseFloat(raw);
    if (isNaN(num)) return raw;
    return parseFloat((num * p.multiplier).toFixed(3)).toString();
  };

  const toggleIOId = (ioId: number) => {
    setSelectedIOIds((prev) => {
      if (prev.includes(ioId)) return prev.filter((id) => id !== ioId);
      if (prev.length >= 10) return prev;
      return [...prev, ioId];
    });
  };

  const removeIOId = (ioId: number) => {
    setSelectedIOIds((prev) => prev.filter((id) => id !== ioId));
  };

  const handleFetch = useCallback(async () => {
    if (selectedIOIds.length === 0) {
      setError("Select at least one IO parameter");
      return;
    }

    setError("");
    setLoading(true);
    setRecords([]);
    setQueryInfo(null);

    const startIST = `${selectedDate}T${startTime}:00+05:30`;
    const endIST = `${selectedDate}T${endTime}:59+05:30`;
    const startUTC = new Date(startIST).toISOString();
    const endUTC = new Date(endIST).toISOString();

    const t0 = performance.now();

    try {
      // const params = new URLSearchParams({
      //   io_ids: selectedIOIds.join(","),
      //   start: startUTC,
      //   end: endUTC,
      // });

      const params = new URLSearchParams({
        io_ids: selectedIOIds.join(","),
        start: startUTC,
        end: endUTC,
      });
      if (minFilter.trim() || maxFilter.trim()) {
        // If only one IO param selected and it has a multiplier, convert back to raw
        const multiplier = selectedIOIds.length === 1
          ? (getParam(selectedIOIds[0])?.multiplier || 1)
          : 1;

        if (minFilter.trim()) {
          const rawMin = parseFloat(minFilter) / multiplier;
          params.set('min', rawMin.toString());
        }
        if (maxFilter.trim()) {
          const rawMax = parseFloat(maxFilter) / multiplier;
          params.set('max', rawMax.toString());
        }
      }

      const res = await fetch(`/api/io-logs/${device.id}?${params}`);
      const data = await res.json();
      const elapsed = Math.round(performance.now() - t0);

      if (data.success) {
        setRecords(data.data);
        setQueryInfo({ count: data.count, time: elapsed });
      } else {
        setError(data.error || "Failed to fetch logs");
      }
    } catch (err: any) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [device.id, selectedDate, startTime, endTime, selectedIOIds, minFilter, maxFilter]);

  const filteredParams = COMMON_PARAMS.filter((p) => {
    if (!paramSearch) return true;
    const search = paramSearch.toLowerCase();
    return p.name.toLowerCase().includes(search) || p.io_id.toString().includes(search);
  });

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 4 }}>
          IO Data Logs
        </div>
        <div style={{ fontSize: 13, color: THEME.text.secondary }}>
          Query historical IO parameter values by date, time, and parameter
        </div>
      </div>

      {/* Filter Card */}
      {/* <div
        style={{
          background: "white",
          borderRadius: 12,
          border: `2px solid ${THEME.border.light}`,
          padding: 24,
          marginBottom: 20,
          boxShadow: THEME.shadow.sm,
        }}
      > */}
        {/* Date + Time */}
        {/* <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 180px", minWidth: 160 }}>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={todayDate()}
              style={inputStyle}
            />
          </div> */}

          {/* Value Filters */}
          {/* <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px", minWidth: 140 }}>
              <label style={labelStyle}>
                Min Value
                <span style={{ fontSize: 10, fontWeight: 400, color: THEME.text.tertiary, marginLeft: 4 }}>(optional)</span>
              </label>
              <input
                type="number"
                value={minFilter}
                onChange={(e) => setMinFilter(e.target.value)}
                placeholder="e.g. 5000"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: "1 1 180px", minWidth: 140 }}>
              <label style={labelStyle}>
                Max Value
                <span style={{ fontSize: 10, fontWeight: 400, color: THEME.text.tertiary, marginLeft: 4 }}>(optional)</span>
              </label>
              <input
                type="number"
                value={maxFilter}
                onChange={(e) => setMaxFilter(e.target.value)}
                placeholder="e.g. 65000"
                style={inputStyle}
              />
            </div> */}
            {/* <div style={{ flex: "2 1 200px", minWidth: 160, display: "flex", alignItems: "flex-end" }}> */}
              {/* Value Filters */}
              {/* <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 180px", minWidth: 140 }}>
                  <label style={labelStyle}>
                    Min Value
                    <span style={{ fontSize: 10, fontWeight: 400, color: THEME.text.tertiary, marginLeft: 4 }}>(optional)</span>
                  </label>
                  <input
                    type="number"
                    value={minFilter}
                    onChange={(e) => setMinFilter(e.target.value)}
                    placeholder="e.g. 5000"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: "1 1 180px", minWidth: 140 }}>
                  <label style={labelStyle}>
                    Max Value
                    <span style={{ fontSize: 10, fontWeight: 400, color: THEME.text.tertiary, marginLeft: 4 }}>(optional)</span>
                  </label>
                  <input
                    type="number"
                    value={maxFilter}
                    onChange={(e) => setMaxFilter(e.target.value)}
                    placeholder="e.g. 65000"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: "2 1 200px", minWidth: 160, display: "flex", alignItems: "flex-end" }}>
                  <div style={{
                    fontSize: 11, color: THEME.text.tertiary, padding: "10px 0", lineHeight: 1.5,
                  }}>
                    Filters apply to <strong style={{ color: THEME.text.secondary }}>raw values</strong> from the database.
                    {selectedIOIds.length === 1 && getParam(selectedIOIds[0])?.multiplier && (
                      <span> For {getParam(selectedIOIds[0])?.name}, raw value = display × {(1 / (getParam(selectedIOIds[0])?.multiplier || 1)).toFixed(0)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div> */}

          {/* <div style={{ flex: "1 1 140px", minWidth: 120 }}>
            <label style={labelStyle}>From Time (IST)</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: "1 1 140px", minWidth: 120 }}>
            <label style={labelStyle}>To Time (IST)</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
          </div>
        </div> */}

        {/* Filter Card */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: `2px solid ${THEME.border.light}`,
          padding: 24,
          marginBottom: 20,
          boxShadow: THEME.shadow.sm,
        }}
      >
        {/* Row 1: Date + Time */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 180px", minWidth: 160 }}>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={todayDate()}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "1 1 140px", minWidth: 120 }}>
            <label style={labelStyle}>From Time (IST)</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: "1 1 140px", minWidth: 120 }}>
            <label style={labelStyle}>To Time (IST)</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Row 2: Value Filters */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 180px", minWidth: 140 }}>
            <label style={labelStyle}>
              Min Value
              <span style={{ fontSize: 10, fontWeight: 400, color: THEME.text.tertiary, marginLeft: 4 }}>(optional)</span>
            </label>
            <input
              type="number"
              value={minFilter}
              onChange={(e) => setMinFilter(e.target.value)}
              placeholder="e.g. 5"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "1 1 180px", minWidth: 140 }}>
            <label style={labelStyle}>
              Max Value
              <span style={{ fontSize: 10, fontWeight: 400, color: THEME.text.tertiary, marginLeft: 4 }}>(optional)</span>
            </label>
            <input
              type="number"
              value={maxFilter}
              onChange={(e) => setMaxFilter(e.target.value)}
              placeholder="e.g. 65"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "2 1 200px", minWidth: 160, display: "flex", alignItems: "flex-end" }}>
            <div style={{ fontSize: 11, color: THEME.text.tertiary, padding: "10px 0", lineHeight: 1.5 }}>
              {selectedIOIds.length === 1 && getParam(selectedIOIds[0])?.unit
                ? <>Enter values in <strong style={{ color: THEME.text.secondary }}>{getParam(selectedIOIds[0])?.unit}</strong> — e.g. &quot;{getParam(selectedIOIds[0])?.name} &gt; 5 {getParam(selectedIOIds[0])?.unit}&quot;</>
                : selectedIOIds.length > 1
                ? <>With multiple parameters, filters apply without unit conversion</>
                : <>Select a parameter first, then set filter values</>
              }
            </div>
          </div>
        </div>

        {/* Row 3: IO Parameter Selector */}

        {/* IO Parameter Selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            IO Parameters
            {selectedIOIds.length > 0 && (
              <span style={{ color: THEME.primary[500], marginLeft: 8, fontWeight: 700, fontSize: 12 }}>
                {selectedIOIds.length} selected
              </span>
            )}
          </label>

          {/* Selected tags */}
          {selectedIOIds.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {selectedIOIds.map((ioId) => {
                const p = getParam(ioId);
                return (
                  <div
                    key={ioId}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: THEME.primary[50], border: `1px solid ${THEME.primary[200]}`,
                      borderRadius: 6, padding: "4px 10px", fontSize: 12,
                      fontWeight: 600, color: THEME.primary[700],
                    }}
                  >
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
                      {p?.name || `io.${ioId}`}
                    </span>
                    <span
                      onClick={() => removeIOId(ioId)}
                      style={{ cursor: "pointer", fontSize: 14, lineHeight: 1, color: THEME.primary[400] }}
                    >
                      ×
                    </span>
                  </div>
                );
              })}
              {selectedIOIds.length > 1 && (
                <div
                  onClick={() => setSelectedIOIds([])}
                  style={{
                    display: "flex", alignItems: "center", background: "#fee2e2",
                    border: "1px solid #fecaca", borderRadius: 6, padding: "4px 10px",
                    fontSize: 11, fontWeight: 600, color: "#dc2626", cursor: "pointer",
                  }}
                >
                  Clear all
                </div>
              )}
            </div>
          )}

          {/* Dropdown trigger */}
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setShowParamDropdown(!showParamDropdown)}
              style={{
                ...inputStyle, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                color: selectedIOIds.length === 0 ? THEME.text.tertiary : THEME.text.primary,
              }}
            >
              <span>
                {selectedIOIds.length === 0
                  ? "Click to select IO parameters..."
                  : `${selectedIOIds.length} parameter${selectedIOIds.length > 1 ? "s" : ""} selected`}
              </span>
              <span style={{
                fontSize: 10,
                transform: showParamDropdown ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}>
                ▼
              </span>
            </div>

            {/* Dropdown */}
            {showParamDropdown && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  background: "white", border: `2px solid ${THEME.border.light}`,
                  borderRadius: 10, boxShadow: THEME.shadow.lg, zIndex: 100,
                  maxHeight: 360, overflow: "hidden", display: "flex", flexDirection: "column",
                }}
              >
                {/* Search */}
                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${THEME.border.light}` }}>
                  <input
                    type="text"
                    placeholder="Search parameters..."
                    value={paramSearch}
                    onChange={(e) => setParamSearch(e.target.value)}
                    autoFocus
                    style={{ ...inputStyle, border: `1px solid ${THEME.border.light}`, padding: "8px 12px", fontSize: 12 }}
                  />
                </div>

                {/* Options */}
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {filteredParams.map((p) => {
                    const isSelected = selectedIOIds.includes(p.io_id);
                    return (
                      <div
                        key={p.io_id}
                        onClick={() => toggleIOId(p.io_id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 14px", cursor: "pointer",
                          background: isSelected ? THEME.primary[50] : "transparent",
                          borderBottom: `1px solid ${THEME.neutral[100]}`,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = THEME.neutral[50]; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4,
                          border: `2px solid ${isSelected ? THEME.primary[500] : THEME.border.light}`,
                          background: isSelected ? THEME.primary[500] : "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, transition: "all 0.15s",
                        }}>
                          {isSelected && <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>✓</span>}
                        </div>

                        <div style={{
                          flex: 1, fontSize: 13, fontWeight: 600, color: THEME.text.primary,
                          fontFamily: "JetBrains Mono, monospace",
                        }}>
                          {p.name}
                        </div>

                        <div style={{
                          fontSize: 10, fontWeight: 700, color: THEME.text.tertiary,
                          background: THEME.neutral[100], padding: "2px 8px", borderRadius: 4,
                          fontFamily: "JetBrains Mono, monospace",
                        }}>
                          ID: {p.io_id}
                        </div>

                        {p.unit && (
                          <div style={{ fontSize: 11, color: THEME.text.secondary, fontStyle: "italic" }}>
                            {p.unit}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div style={{
                  padding: "8px 14px", borderTop: `1px solid ${THEME.border.light}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: THEME.neutral[50],
                }}>
                  <span style={{ fontSize: 11, color: THEME.text.tertiary }}>{selectedIOIds.length}/10 selected</span>
                  <button
                    onClick={() => { setShowParamDropdown(false); setParamSearch(""); }}
                    style={{
                      fontSize: 12, fontWeight: 600, color: THEME.primary[500],
                      background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fetch Button */}
        <button
          onClick={handleFetch}
          disabled={loading || selectedIOIds.length === 0}
          style={{
            background: selectedIOIds.length > 0 ? THEME.primary[500] : THEME.neutral[200],
            color: selectedIOIds.length > 0 ? "white" : THEME.text.tertiary,
            border: "none", borderRadius: 10, padding: "12px 32px",
            fontWeight: 700, fontSize: 14,
            cursor: selectedIOIds.length > 0 && !loading ? "pointer" : "not-allowed",
            fontFamily: "inherit", transition: "all 0.2s",
            boxShadow: selectedIOIds.length > 0 ? THEME.shadow.md : "none",
          }}
          onMouseEnter={(e) => {
            if (selectedIOIds.length > 0 && !loading) {
              e.currentTarget.style.background = THEME.primary[600];
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedIOIds.length > 0) {
              e.currentTarget.style.background = THEME.primary[500];
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          {loading ? "⏳ LOADING..." : "🔍 FETCH LOGS"}
        </button>

        {error && (
          <div style={{
            marginTop: 12, padding: "10px 14px", background: "#fef2f2",
            border: "1px solid #fecaca", borderRadius: 8, fontSize: 13,
            color: "#dc2626", fontWeight: 500,
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Results Table */}
      {queryInfo && (
        <div style={{
          background: "white", borderRadius: 12, border: `2px solid ${THEME.border.light}`,
          overflow: "hidden", boxShadow: THEME.shadow.sm,
        }}>
          <div style={{
            padding: "14px 20px", borderBottom: `2px solid ${THEME.border.light}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: THEME.neutral[50],
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text.primary }}>
              Results
              <span style={{
                marginLeft: 10, fontSize: 12, fontWeight: 600, color: THEME.primary[500],
                background: THEME.primary[50], padding: "2px 10px", borderRadius: 20,
              }}>
                {queryInfo.count} records
              </span>
            </div>
            <div style={{ fontSize: 11, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace" }}>
              {queryInfo.time}ms
            </div>
          </div>

          {records.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: THEME.text.tertiary }}>
              No records found for this time range
            </div>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: 500 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: THEME.neutral[50] }}>
                    <th style={{
                      textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700,
                      color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 1,
                      borderBottom: `2px solid ${THEME.border.light}`,
                      position: "sticky", top: 0, background: THEME.neutral[50], zIndex: 1,
                    }}>
                      Timestamp (IST)
                    </th>
                    {selectedIOIds.length > 1 && (
                      <th style={{
                        textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700,
                        color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 1,
                        borderBottom: `2px solid ${THEME.border.light}`,
                        position: "sticky", top: 0, background: THEME.neutral[50], zIndex: 1,
                      }}>
                        Parameter
                      </th>
                    )}
                    <th style={{
                      textAlign: "right", padding: "12px 16px", fontSize: 11, fontWeight: 700,
                      color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 1,
                      borderBottom: `2px solid ${THEME.border.light}`,
                      position: "sticky", top: 0, background: THEME.neutral[50], zIndex: 1,
                    }}>
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec, idx) => {
                    const p = getParam(rec.io_id);
                    return (
                      <tr
                        key={idx}
                        style={{ borderBottom: `1px solid ${THEME.neutral[100]}`, transition: "background 0.1s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = THEME.neutral[50]; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{
                          padding: "10px 16px", fontFamily: "JetBrains Mono, monospace",
                          fontSize: 12, color: THEME.text.secondary, whiteSpace: "nowrap",
                        }}>
                          {formatIST(rec.timestamp)}
                        </td>
                        {selectedIOIds.length > 1 && (
                          <td style={{
                            padding: "10px 16px", fontFamily: "JetBrains Mono, monospace",
                            fontSize: 12, color: THEME.primary[600], fontWeight: 600,
                          }}>
                            {p?.name || `io.${rec.io_id}`}
                          </td>
                        )}
                        <td style={{
                          padding: "10px 16px", textAlign: "right",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 13, fontWeight: 700, color: THEME.text.primary,
                        }}>
                          {formatValue(rec.io_id, rec.io_value)}
                          {p?.unit && (
                            <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 400, color: THEME.text.tertiary }}>
                              {p.unit}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {queryInfo.count >= 1000 && (
            <div style={{
              padding: "10px 20px", borderTop: `1px solid ${THEME.border.light}`,
              background: "#fffbeb", fontSize: 12, color: "#92400e", fontWeight: 500,
            }}>
              ⚠️ Results capped at 1,000 records. Narrow your time range for complete data.
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!queryInfo && !loading && (
        <div style={{
          background: "white", borderRadius: 12, border: `2px dashed ${THEME.border.light}`,
          padding: 48, textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: THEME.text.primary, marginBottom: 8 }}>
            Select parameters and time range
          </div>
          <div style={{ fontSize: 13, color: THEME.text.tertiary, maxWidth: 400, margin: "0 auto" }}>
            Choose a date, time window, and one or more IO parameters above, then click Fetch Logs to query the database.
          </div>
        </div>
      )}
    </div>
  );
}