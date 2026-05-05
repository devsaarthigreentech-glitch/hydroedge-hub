// // "use client";

// // import React, { useEffect, useRef, useState } from "react";
// // import { Device } from "@/types";
// // import { THEME } from "@/lib/theme";
// // import { timeAgo } from "@/lib/utils";

// // interface MapTabProps {
// //   device: Device;
// // }

// // export function MapTab({ device }: MapTabProps) {
// //   const mapRef = useRef<any>(null);
// //   const mapContainerRef = useRef<HTMLDivElement>(null);
// //   const polylineRef = useRef<any>(null);
  
// //   const [routeHistory, setRouteHistory] = useState<any[]>([]);
// //   const [timeRange, setTimeRange] = useState<"24h" | "today">("24h");
// //   const [showRoute, setShowRoute] = useState(true);
// //   const [loading, setLoading] = useState(false);

// //   const hasValidCoordinates = 
// //     device.last_latitude && 
// //     device.last_longitude &&
// //     !isNaN(Number(device.last_latitude)) &&
// //     !isNaN(Number(device.last_longitude));

// //   // Fetch route history
// //   useEffect(() => {
// //     if (!device.id || !hasValidCoordinates) return;

// //     async function fetchRouteHistory() {
// //       setLoading(true);
// //       try {
// //         // Calculate time range
// //         const now = new Date();
// //         let startTime: Date;

// //         if (timeRange === "24h") {
// //           // Last 24 hours
// //           startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
// //         } else {
// //           // Since midnight today
// //           startTime = new Date(now);
// //           startTime.setHours(0, 0, 0, 0);
// //         }

// //         const response = await fetch(
// //           `/api/route-history?device_id=${device.id}&start_time=${startTime.toISOString()}&end_time=${now.toISOString()}`
// //         );
        
// //         const data = await response.json();
        
// //         if (data.success && data.data) {
// //           setRouteHistory(data.data);
// //         }
// //       } catch (error) {
// //         console.error("Error fetching route history:", error);
// //       } finally {
// //         setLoading(false);
// //       }
// //     }

// //     fetchRouteHistory();
    
// //     // Auto-refresh every 2 minutes
// //     const interval = setInterval(fetchRouteHistory, 300000);
// //     return () => clearInterval(interval);
// //   }, [device.id, timeRange, hasValidCoordinates]);

// //   useEffect(() => {
// //     if (!hasValidCoordinates || !mapContainerRef.current) return;

// //     // Dynamically import Leaflet (client-side only)
// //     import("leaflet").then((L) => {
// //       // Fix for default marker icon in Next.js
// //       delete (L.Icon.Default.prototype as any)._getIconUrl;
// //       L.Icon.Default.mergeOptions({
// //         iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
// //         iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
// //         shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
// //       });

// //       // Clear existing map if any
// //       if (mapRef.current) {
// //         mapRef.current.remove();
// //       }

// //       const lat = Number(device.last_latitude);
// //       const lon = Number(device.last_longitude);

// //       // Check if container exists before creating map
// //       if (!mapContainerRef.current) return;

// //       // Create map
// //       const map = L.map(mapContainerRef.current).setView([lat, lon], 15);

// //       // Add OpenStreetMap tiles
// //       L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
// //         attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
// //         maxZoom: 19,
// //       }).addTo(map);

// //       // Draw route polyline if data exists and showRoute is true
// //       if (showRoute && routeHistory.length > 1) {
// //         // Convert route history to lat/lng pairs with proper typing
// //         const routePoints: [number, number][] = routeHistory.map((point) => [
// //           Number(point.latitude),
// //           Number(point.longitude),
// //         ]);

// //         // Remove old polyline if exists
// //         if (polylineRef.current) {
// //           polylineRef.current.remove();
// //         }

// //         // Create polyline with gradient effect
// //         const polyline = L.polyline(routePoints, {
// //           color: THEME.primary[500],
// //           weight: 4,
// //           opacity: 0.7,
// //           smoothFactor: 1,
// //         }).addTo(map);

// //         polylineRef.current = polyline;

// //         // Add start marker (green)
// //         const startPoint = routeHistory[0];
// //         const startIcon = L.divIcon({
// //           className: "route-marker",
// //           html: `
// //             <div style="
// //               width: 24px;
// //               height: 24px;
// //               background: #10b981;
// //               border: 3px solid white;
// //               border-radius: 50%;
// //               box-shadow: 0 2px 8px rgba(0,0,0,0.3);
// //               display: flex;
// //               align-items: center;
// //               justify-content: center;
// //               font-size: 12px;
// //               color: white;
// //               font-weight: bold;
// //             ">S</div>
// //           `,
// //           iconSize: [24, 24],
// //           iconAnchor: [12, 12],
// //         });

// //         L.marker([Number(startPoint.latitude), Number(startPoint.longitude)], {
// //           icon: startIcon,
// //         })
// //           .addTo(map)
// //           .bindPopup(`
// //             <div style="font-family: 'JetBrains Mono', monospace;">
// //               <strong>Start Point</strong><br/>
// //               <span style="font-size: 11px;">${timeAgo(startPoint.timestamp)}</span>
// //             </div>
// //           `);

// //         // Fit map bounds to show entire route
// //         map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
// //       }

// //       // Current position marker (end point)
// //       const customIcon = L.divIcon({
// //         className: "custom-marker",
// //         html: `
// //           <div style="
// //             width: 30px;
// //             height: 30px;
// //             background: ${device.connection_status === "online" ? "#00c853" : "#6b7280"};
// //             border: 3px solid white;
// //             border-radius: 50%;
// //             box-shadow: 0 2px 8px rgba(0,0,0,0.3);
// //             display: flex;
// //             align-items: center;
// //             justify-content: center;
// //             position: relative;
// //           ">
// //             <div style="
// //               width: 12px;
// //               height: 12px;
// //               background: white;
// //               border-radius: 50%;
// //             "></div>
// //             ${device.connection_status === "online" ? `
// //               <div style="
// //                 position: absolute;
// //                 width: 30px;
// //                 height: 30px;
// //                 background: #00c853;
// //                 border-radius: 50%;
// //                 opacity: 0.3;
// //                 animation: pulse 2s infinite;
// //               "></div>
// //             ` : ""}
// //           </div>
// //         `,
// //         iconSize: [30, 30],
// //         iconAnchor: [15, 15],
// //       });

// //       // Add current position marker
// //       const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);

// //       // Create popup content
// //       const popupContent = `
// //         <div style="font-family: 'JetBrains Mono', monospace; min-width: 200px;">
// //           <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #1a1a1a;">
// //             ${device.device_name || device.imei}
// //           </div>
// //           <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">
// //             ${device.manufacturer} ${device.device_type}
// //           </div>
// //           <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 8px 0;">
// //           <div style="font-size: 11px; margin-bottom: 4px;">
// //             <strong>Status:</strong> 
// //             <span style="color: ${device.connection_status === "online" ? "#00c853" : "#6b7280"};">
// //               ${device.connection_status === "online" ? "🟢 Online" : "⚫ Offline"}
// //             </span>
// //           </div>
// //           <div style="font-size: 11px; margin-bottom: 4px;">
// //             <strong>Current Position</strong><br/>
// //             <span style="font-family: monospace;">${lat.toFixed(6)}, ${lon.toFixed(6)}</span>
// //           </div>
// //           <div style="font-size: 11px; margin-bottom: 4px;">
// //             <strong>Last Update:</strong> ${device.last_location_time ? timeAgo(device.last_location_time) : "Never"}
// //           </div>
// //           ${routeHistory.length > 1 ? `
// //             <div style="font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
// //               <strong>Route:</strong> ${routeHistory.length} points tracked
// //             </div>
// //           ` : ""}
// //         </div>
// //       `;

// //       marker.bindPopup(popupContent).openPopup();

// //       mapRef.current = map;

// //       // Cleanup
// //       return () => {
// //         if (polylineRef.current) {
// //           polylineRef.current.remove();
// //         }
// //         if (mapRef.current) {
// //           mapRef.current.remove();
// //           mapRef.current = null;
// //         }
// //       };
// //     });
// //   }, [device, hasValidCoordinates, routeHistory, showRoute]);

// //   if (!hasValidCoordinates) {
// //     return (
// //       <div style={{ 
// //         padding: 24, 
// //         height: "100%", 
// //         display: "flex", 
// //         alignItems: "center", 
// //         justifyContent: "center",
// //         background: THEME.background.secondary,
// //       }}>
// //         <div style={{
// //           textAlign: "center",
// //           background: "white",
// //           padding: 40,
// //           borderRadius: 12,
// //           border: `2px solid ${THEME.border.light}`,
// //           maxWidth: 400,
// //         }}>
// //           <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
// //           <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text.primary, marginBottom: 8 }}>
// //             No GPS Location Available
// //           </div>
// //           <div style={{ fontSize: 13, color: THEME.text.secondary, marginBottom: 16 }}>
// //             This device hasn't sent GPS coordinates yet.
// //           </div>
// //           <div style={{ 
// //             fontSize: 11, 
// //             color: THEME.text.tertiary,
// //             fontFamily: "JetBrains Mono, monospace",
// //             background: THEME.neutral[100],
// //             padding: 12,
// //             borderRadius: 6,
// //           }}>
// //             Latitude: {device.last_latitude || "N/A"}<br/>
// //             Longitude: {device.last_longitude || "N/A"}
// //           </div>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div style={{ height: "100%", display: "flex", flexDirection: "column", background: THEME.background.secondary }}>
// //       {/* Map Controls Bar */}
// //       <div style={{
// //         padding: "12px 20px",
// //         background: "white",
// //         borderBottom: `2px solid ${THEME.border.light}`,
// //         display: "flex",
// //         alignItems: "center",
// //         justifyContent: "space-between",
// //         flexWrap: "wrap",
// //         gap: 12,
// //       }}>
// //         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
// //           <span style={{ fontSize: 20 }}>📍</span>
// //           <div>
// //             <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>
// //               Device Location {routeHistory.length > 1 && `& Route (${routeHistory.length} points)`}
// //             </div>
// //             <div style={{ fontSize: 11, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace" }}>
// //               {Number(device.last_latitude).toFixed(6)}, {Number(device.last_longitude).toFixed(6)}
// //             </div>
// //           </div>
// //         </div>

// //         <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
// //           {/* Time Range Selector */}
// //           <div style={{ display: "flex", gap: 6 }}>
// //             <button
// //               onClick={() => setTimeRange("24h")}
// //               style={{
// //                 padding: "6px 12px",
// //                 background: timeRange === "24h" ? THEME.primary[500] : "white",
// //                 color: timeRange === "24h" ? "white" : THEME.text.secondary,
// //                 border: `2px solid ${timeRange === "24h" ? THEME.primary[500] : THEME.border.light}`,
// //                 borderRadius: 8,
// //                 fontSize: 11,
// //                 fontWeight: 700,
// //                 cursor: "pointer",
// //                 transition: "all 0.2s",
// //               }}
// //             >
// //               Last 24h
// //             </button>
// //             <button
// //               onClick={() => setTimeRange("today")}
// //               style={{
// //                 padding: "6px 12px",
// //                 background: timeRange === "today" ? THEME.primary[500] : "white",
// //                 color: timeRange === "today" ? "white" : THEME.text.secondary,
// //                 border: `2px solid ${timeRange === "today" ? THEME.primary[500] : THEME.border.light}`,
// //                 borderRadius: 8,
// //                 fontSize: 11,
// //                 fontWeight: 700,
// //                 cursor: "pointer",
// //                 transition: "all 0.2s",
// //               }}
// //             >
// //               Today
// //             </button>
// //           </div>

// //           {/* Show/Hide Route Toggle */}
// //           <button
// //             onClick={() => setShowRoute(!showRoute)}
// //             style={{
// //               padding: "6px 12px",
// //               background: showRoute ? THEME.accent[500] : THEME.neutral[200],
// //               color: showRoute ? "white" : THEME.text.secondary,
// //               border: "none",
// //               borderRadius: 8,
// //               fontSize: 11,
// //               fontWeight: 700,
// //               cursor: "pointer",
// //               transition: "all 0.2s",
// //             }}
// //           >
// //             {showRoute ? "🗺️ Hide Route" : "🗺️ Show Route"}
// //           </button>

// //           {/* Status Badge */}
// //           <div style={{
// //             padding: "6px 12px",
// //             background: device.connection_status === "online" ? THEME.primary[50] : THEME.neutral[100],
// //             border: `2px solid ${device.connection_status === "online" ? THEME.primary[500] : THEME.neutral[400]}`,
// //             borderRadius: 8,
// //             fontSize: 11,
// //             fontWeight: 700,
// //             color: device.connection_status === "online" ? THEME.primary[600] : THEME.text.tertiary,
// //           }}>
// //             {device.connection_status === "online" ? "🟢 ONLINE" : "⚫ OFFLINE"}
// //           </div>

// //           {device.last_location_time && (
// //             <div style={{
// //               fontSize: 11,
// //               color: THEME.text.tertiary,
// //               fontFamily: "JetBrains Mono, monospace",
// //             }}>
// //               {loading ? "Updating..." : `Updated ${timeAgo(device.last_location_time)}`}
// //             </div>
// //           )}
// //         </div>
// //       </div>

// //       {/* Map Container */}
// //       <div 
// //         ref={mapContainerRef} 
// //         style={{ 
// //           flex: 1,
// //           position: "relative",
// //         }} 
// //       />

// //       {/* Add Leaflet CSS */}
// //       <style jsx global>{`
// //         @import url("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css");
        
// //         .leaflet-container {
// //           height: 100%;
// //           width: 100%;
// //           z-index: 0;
// //         }

// //         .custom-marker, .route-marker {
// //           background: transparent;
// //           border: none;
// //         }

// //         @keyframes pulse {
// //           0% {
// //             transform: scale(1);
// //             opacity: 0.3;
// //           }
// //           50% {
// //             transform: scale(1.5);
// //             opacity: 0;
// //           }
// //           100% {
// //             transform: scale(1);
// //             opacity: 0.3;
// //           }
// //         }

// //         .leaflet-popup-content-wrapper {
// //           border-radius: 8px;
// //           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
// //         }

// //         .leaflet-popup-tip {
// //           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
// //         }
// //       `}</style>
// //     </div>
// //   );
// // }
// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import { Device } from "@/types";
// import { THEME } from "@/lib/theme";
// import { timeAgo } from "@/lib/utils";

// interface MapTabProps {
//   device: Device;
// }

// export function MapTab({ device }: MapTabProps) {
//   const mapRef = useRef<any>(null);
//   const mapContainerRef = useRef<HTMLDivElement>(null);
//   const polylineRef = useRef<any>(null);
  
//   const [routeHistory, setRouteHistory] = useState<any[]>([]);
//   const [timeRange, setTimeRange] = useState<"24h" | "today">("24h");
//   const [showRoute, setShowRoute] = useState(true);
//   const [loading, setLoading] = useState(false);

//   const hasValidCoordinates = 
//     device.last_latitude && 
//     device.last_longitude &&
//     !isNaN(Number(device.last_latitude)) &&
//     !isNaN(Number(device.last_longitude));

//   // Fetch route history
//   useEffect(() => {
//     if (!device.id || !hasValidCoordinates) return;

//     async function fetchRouteHistory() {
//       setLoading(true);
//       try {
//         // Calculate time range
//         const now = new Date();
//         let startTime: Date;

//         if (timeRange === "24h") {
//           // Last 24 hours
//           startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
//         } else {
//           // Since midnight today
//           startTime = new Date(now);
//           startTime.setHours(0, 0, 0, 0);
//         }

//         const response = await fetch(
//           `/api/route-history?device_id=${device.id}&start_time=${startTime.toISOString()}&end_time=${now.toISOString()}`
//         );
        
//         const data = await response.json();
        
//         if (data.success && data.data) {
//           setRouteHistory(data.data);
//         }
//       } catch (error) {
//         console.error("Error fetching route history:", error);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchRouteHistory();
    
//     // Auto-refresh every 2 minutes
//     const interval = setInterval(fetchRouteHistory, 120000);
//     return () => clearInterval(interval);
//   }, [device.id, timeRange, hasValidCoordinates]);

//   useEffect(() => {
//     if (!hasValidCoordinates || !mapContainerRef.current) return;

//     // Dynamically import Leaflet (client-side only)
//     import("leaflet").then((L) => {
//       // Fix for default marker icon in Next.js
//       delete (L.Icon.Default.prototype as any)._getIconUrl;
//       L.Icon.Default.mergeOptions({
//         iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
//         iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
//         shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
//       });

//       // Clear existing map if any
//       if (mapRef.current) {
//         mapRef.current.remove();
//       }

//       const lat = Number(device.last_latitude);
//       const lon = Number(device.last_longitude);

//       // Check if container exists before creating map
//       if (!mapContainerRef.current) return;

//       // Create map
//       const map = L.map(mapContainerRef.current).setView([lat, lon], 15);

//       // Add OpenStreetMap tiles
//       L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//         attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//         maxZoom: 19,
//       }).addTo(map);

//       // Draw route polyline if data exists and showRoute is true
//       if (showRoute && routeHistory.length > 1) {
//         // Convert route history to lat/lng pairs with proper typing
//         const routePoints: [number, number][] = routeHistory.map((point) => [
//           Number(point.latitude),
//           Number(point.longitude),
//         ]);

//         // Remove old polyline if exists
//         if (polylineRef.current) {
//           polylineRef.current.remove();
//         }

//         // Create polyline with gradient effect
//         const polyline = L.polyline(routePoints, {
//           color: THEME.primary[500],
//           weight: 4,
//           opacity: 0.7,
//           smoothFactor: 1,
//         }).addTo(map);

//         polylineRef.current = polyline;

//         // Add start marker (green)
//         const startPoint = routeHistory[0];
//         const startIcon = L.divIcon({
//           className: "route-marker",
//           html: `
//             <div style="
//               width: 24px;
//               height: 24px;
//               background: #10b981;
//               border: 3px solid white;
//               border-radius: 50%;
//               box-shadow: 0 2px 8px rgba(0,0,0,0.3);
//               display: flex;
//               align-items: center;
//               justify-content: center;
//               font-size: 12px;
//               color: white;
//               font-weight: bold;
//             ">S</div>
//           `,
//           iconSize: [24, 24],
//           iconAnchor: [12, 12],
//         });

//         L.marker([Number(startPoint.latitude), Number(startPoint.longitude)], {
//           icon: startIcon,
//         })
//           .addTo(map)
//           .bindPopup(`
//             <div style="font-family: 'JetBrains Mono', monospace;">
//               <strong>Start Point</strong><br/>
//               <span style="font-size: 11px;">${timeAgo(startPoint.timestamp)}</span>
//             </div>
//           `);

//         // Fit map bounds to show entire route
//         map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
//       }

//       // Current position marker (end point)
//       const customIcon = L.divIcon({
//         className: "custom-marker",
//         html: `
//           <div style="
//             width: 30px;
//             height: 30px;
//             background: ${device.connection_status === "online" ? "#00c853" : "#6b7280"};
//             border: 3px solid white;
//             border-radius: 50%;
//             box-shadow: 0 2px 8px rgba(0,0,0,0.3);
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             position: relative;
//           ">
//             <div style="
//               width: 12px;
//               height: 12px;
//               background: white;
//               border-radius: 50%;
//             "></div>
//             ${device.connection_status === "online" ? `
//               <div style="
//                 position: absolute;
//                 width: 30px;
//                 height: 30px;
//                 background: #00c853;
//                 border-radius: 50%;
//                 opacity: 0.3;
//                 animation: pulse 2s infinite;
//               "></div>
//             ` : ""}
//           </div>
//         `,
//         iconSize: [30, 30],
//         iconAnchor: [15, 15],
//       });

//       // Add current position marker
//       const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);

//       // Create popup content
//       const popupContent = `
//         <div style="font-family: 'JetBrains Mono', monospace; min-width: 200px;">
//           <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #1a1a1a;">
//             ${device.device_name || device.imei}
//           </div>
//           <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">
//             ${device.manufacturer} ${device.device_type}
//           </div>
//           <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 8px 0;">
//           <div style="font-size: 11px; margin-bottom: 4px;">
//             <strong>Status:</strong> 
//             <span style="color: ${device.connection_status === "online" ? "#00c853" : "#6b7280"};">
//               ${device.connection_status === "online" ? "🟢 Online" : "⚫ Offline"}
//             </span>
//           </div>
//           <div style="font-size: 11px; margin-bottom: 4px;">
//             <strong>Current Position</strong><br/>
//             <span style="font-family: monospace;">${lat.toFixed(6)}, ${lon.toFixed(6)}</span>
//           </div>
//           <div style="font-size: 11px; margin-bottom: 4px;">
//             <strong>Last Update:</strong> ${device.last_location_time ? timeAgo(device.last_location_time) : "Never"}
//           </div>
//           ${routeHistory.length > 1 ? `
//             <div style="font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
//               <strong>Route:</strong> ${routeHistory.length} points tracked
//             </div>
//           ` : ""}
//         </div>
//       `;

//       marker.bindPopup(popupContent).openPopup();

//       mapRef.current = map;

//       // Cleanup function - CRITICAL for memory management
//       return () => {
//         // Remove polyline first
//         if (polylineRef.current) {
//           polylineRef.current.remove();
//           polylineRef.current = null;
//         }
//         // Remove all markers
//         if (marker) {
//           marker.remove();
//         }
//         // Remove map and clear tiles from memory
//         if (mapRef.current) {
//           mapRef.current.remove();
//           mapRef.current = null;
//         }
//       };
//     });
//   }, [device, hasValidCoordinates, routeHistory, showRoute]);

//   if (!hasValidCoordinates) {
//     return (
//       <div style={{ 
//         padding: 24, 
//         height: "100%", 
//         display: "flex", 
//         alignItems: "center", 
//         justifyContent: "center",
//         background: THEME.background.secondary,
//       }}>
//         <div style={{
//           textAlign: "center",
//           background: "white",
//           padding: 40,
//           borderRadius: 12,
//           border: `2px solid ${THEME.border.light}`,
//           maxWidth: 400,
//         }}>
//           <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
//           <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text.primary, marginBottom: 8 }}>
//             No GPS Location Available
//           </div>
//           <div style={{ fontSize: 13, color: THEME.text.secondary, marginBottom: 16 }}>
//             This device hasn't sent GPS coordinates yet.
//           </div>
//           <div style={{ 
//             fontSize: 11, 
//             color: THEME.text.tertiary,
//             fontFamily: "JetBrains Mono, monospace",
//             background: THEME.neutral[100],
//             padding: 12,
//             borderRadius: 6,
//           }}>
//             Latitude: {device.last_latitude || "N/A"}<br/>
//             Longitude: {device.last_longitude || "N/A"}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ height: "100%", display: "flex", flexDirection: "column", background: THEME.background.secondary }}>
//       {/* Map Controls Bar */}
//       <div style={{
//         padding: "12px 20px",
//         background: "white",
//         borderBottom: `2px solid ${THEME.border.light}`,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "space-between",
//         flexWrap: "wrap",
//         gap: 12,
//       }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <span style={{ fontSize: 20 }}>📍</span>
//           <div>
//             <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>
//               Device Location {routeHistory.length > 1 && `& Route (${routeHistory.length} points)`}
//             </div>
//             <div style={{ fontSize: 11, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace" }}>
//               {Number(device.last_latitude).toFixed(6)}, {Number(device.last_longitude).toFixed(6)}
//             </div>
//           </div>
//         </div>

//         <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
//           {/* Time Range Selector */}
//           <div style={{ display: "flex", gap: 6 }}>
//             <button
//               onClick={() => setTimeRange("24h")}
//               style={{
//                 padding: "6px 12px",
//                 background: timeRange === "24h" ? THEME.primary[500] : "white",
//                 color: timeRange === "24h" ? "white" : THEME.text.secondary,
//                 border: `2px solid ${timeRange === "24h" ? THEME.primary[500] : THEME.border.light}`,
//                 borderRadius: 8,
//                 fontSize: 11,
//                 fontWeight: 700,
//                 cursor: "pointer",
//                 transition: "all 0.2s",
//               }}
//             >
//               Last 24h
//             </button>
//             <button
//               onClick={() => setTimeRange("today")}
//               style={{
//                 padding: "6px 12px",
//                 background: timeRange === "today" ? THEME.primary[500] : "white",
//                 color: timeRange === "today" ? "white" : THEME.text.secondary,
//                 border: `2px solid ${timeRange === "today" ? THEME.primary[500] : THEME.border.light}`,
//                 borderRadius: 8,
//                 fontSize: 11,
//                 fontWeight: 700,
//                 cursor: "pointer",
//                 transition: "all 0.2s",
//               }}
//             >
//               Today
//             </button>
//           </div>

//           {/* Show/Hide Route Toggle */}
//           <button
//             onClick={() => setShowRoute(!showRoute)}
//             style={{
//               padding: "6px 12px",
//               background: showRoute ? THEME.accent[500] : THEME.neutral[200],
//               color: showRoute ? "white" : THEME.text.secondary,
//               border: "none",
//               borderRadius: 8,
//               fontSize: 11,
//               fontWeight: 700,
//               cursor: "pointer",
//               transition: "all 0.2s",
//             }}
//           >
//             {showRoute ? "🗺️ Hide Route" : "🗺️ Show Route"}
//           </button>

//           {/* Status Badge */}
//           <div style={{
//             padding: "6px 12px",
//             background: device.connection_status === "online" ? THEME.primary[50] : THEME.neutral[100],
//             border: `2px solid ${device.connection_status === "online" ? THEME.primary[500] : THEME.neutral[400]}`,
//             borderRadius: 8,
//             fontSize: 11,
//             fontWeight: 700,
//             color: device.connection_status === "online" ? THEME.primary[600] : THEME.text.tertiary,
//           }}>
//             {device.connection_status === "online" ? "🟢 ONLINE" : "⚫ OFFLINE"}
//           </div>

//           {device.last_location_time && (
//             <div style={{
//               fontSize: 11,
//               color: THEME.text.tertiary,
//               fontFamily: "JetBrains Mono, monospace",
//             }}>
//               {loading ? "Updating..." : `Updated ${timeAgo(device.last_location_time)}`}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Map Container */}
//       <div 
//         ref={mapContainerRef} 
//         style={{ 
//           flex: 1,
//           position: "relative",
//         }} 
//       />

//       {/* Add Leaflet CSS */}
//       <style jsx global>{`
//         @import url("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css");
        
//         .leaflet-container {
//           height: 100%;
//           width: 100%;
//           z-index: 0;
//         }

//         .custom-marker, .route-marker {
//           background: transparent;
//           border: none;
//         }

//         @keyframes pulse {
//           0% {
//             transform: scale(1);
//             opacity: 0.3;
//           }
//           50% {
//             transform: scale(1.5);
//             opacity: 0;
//           }
//           100% {
//             transform: scale(1);
//             opacity: 0.3;
//           }
//         }

//         .leaflet-popup-content-wrapper {
//           border-radius: 8px;
//           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
//         }

//         .leaflet-popup-tip {
//           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
//         }
//       `}</style>
//     </div>
//   );
// }
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Device } from "@/types";
import { THEME } from "@/lib/theme";
import { timeAgo } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

interface MapTabProps {
  device: Device;
}

export function MapTab({ device }: MapTabProps) {
  const isMobile = useIsMobile();
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylineRef = useRef<any[]>([]);

  const [routeHistory, setRouteHistory] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<"24h" | "today">("24h");
  const [showRoute, setShowRoute] = useState(true);
  const [loading, setLoading] = useState(false);

  const hasValidCoordinates =
    device.last_latitude &&
    device.last_longitude &&
    !isNaN(Number(device.last_latitude)) &&
    !isNaN(Number(device.last_longitude));

  // Fetch route history
  useEffect(() => {
    if (!device.id || !hasValidCoordinates) return;

    async function fetchRouteHistory() {
      setLoading(true);
      try {
        const now = new Date();
        let startTime: Date;
        if (timeRange === "24h") {
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else {
          startTime = new Date(now);
          startTime.setHours(0, 0, 0, 0);
        }

        const response = await fetch(
          `/api/route-history?device_id=${device.id}&start_time=${startTime.toISOString()}&end_time=${now.toISOString()}`
        );
        const data = await response.json();
        if (data.success && data.data) {
          setRouteHistory(data.data);
        }
      } catch (error) {
        console.error("Error fetching route history:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRouteHistory();
    const interval = setInterval(fetchRouteHistory, 120000);
    return () => clearInterval(interval);
  }, [device.id, timeRange, hasValidCoordinates]);

  useEffect(() => {
    if (!hasValidCoordinates || !mapContainerRef.current) return;

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (mapRef.current) {
        mapRef.current.remove();
      }

      const lat = Number(device.last_latitude);
      const lon = Number(device.last_longitude);
      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current).setView([lat, lon], 15);

      // Use a cleaner map tile
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      // Clean up old polylines/markers
      polylineRef.current.forEach((l) => { try { l.remove(); } catch {} });
      polylineRef.current = [];

      // ── Draw route ──
      if (showRoute && routeHistory.length > 1) {
        const routePoints: [number, number][] = routeHistory.map((p) => [
          Number(p.latitude),
          Number(p.longitude),
        ]);

        // Layer 1: dark border/shadow line (wider, behind)
        const borderLine = L.polyline(routePoints, {
          color: "#1e3a5f",
          weight: 8,
          opacity: 0.3,
          smoothFactor: 1,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        polylineRef.current.push(borderLine);

        // Layer 2: main route line (vibrant blue)
        const mainLine = L.polyline(routePoints, {
          color: "#3b82f6",
          weight: 5,
          opacity: 0.85,
          smoothFactor: 1,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        polylineRef.current.push(mainLine);

        // Layer 3: bright inner glow
        const glowLine = L.polyline(routePoints, {
          color: "#93c5fd",
          weight: 2,
          opacity: 0.6,
          smoothFactor: 1,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
        polylineRef.current.push(glowLine);

        // ── Direction arrows at intervals along the route ──
        const arrowInterval = Math.max(Math.floor(routePoints.length / 8), 2);
        for (let i = arrowInterval; i < routePoints.length - 1; i += arrowInterval) {
          const from = routePoints[i - 1];
          const to = routePoints[i];

          // Calculate bearing
          const dLon = ((to[1] - from[1]) * Math.PI) / 180;
          const lat1 = (from[0] * Math.PI) / 180;
          const lat2 = (to[0] * Math.PI) / 180;
          const y = Math.sin(dLon) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
          const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

          const arrowIcon = L.divIcon({
            className: "route-arrow",
            html: `<div style="
              width: 16px; height: 16px;
              display: flex; align-items: center; justify-content: center;
              transform: rotate(${bearing - 90}deg);
              color: #1d4ed8; font-size: 14px; font-weight: 900;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            ">›</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });

          const arrowMarker = L.marker(to, { icon: arrowIcon, interactive: false }).addTo(map);
          polylineRef.current.push(arrowMarker);
        }

        // ── Start marker (blue flag) ──
        const startPoint = routeHistory[0];
        const startIcon = L.divIcon({
          className: "route-marker",
          html: `<div style="
            display: flex; align-items: center; gap: 4;
          ">
            <div style="
              width: 20px; height: 20px;
              background: #3b82f6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(59,130,246,0.5);
              display: flex; align-items: center; justify-content: center;
              font-size: 10px; color: white; font-weight: 900;
            ">A</div>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const startMarker = L.marker(
          [Number(startPoint.latitude), Number(startPoint.longitude)],
          { icon: startIcon }
        )
          .addTo(map)
          .bindPopup(`
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">
              <strong>🏁 Trip Start</strong><br/>
              <span style="color: #6b7280;">${timeAgo(startPoint.timestamp)}</span>
            </div>
          `);
        polylineRef.current.push(startMarker);

        // Fit bounds to route
        map.fitBounds(mainLine.getBounds(), { padding: [50, 50] });
      }

      // ── Current position marker ──
      const isOnline = device.connection_status === "online";
      const markerColor = isOnline ? "#22c55e" : "#6b7280";

      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="position: relative; width: 36px; height: 36px;">
            ${isOnline ? `
              <div style="
                position: absolute; inset: -4px;
                background: ${markerColor};
                border-radius: 50%;
                opacity: 0.2;
                animation: marker-pulse 2s ease-in-out infinite;
              "></div>
            ` : ""}
            <div style="
              position: absolute; inset: 0;
              width: 36px; height: 36px;
              background: ${markerColor};
              border: 4px solid white;
              border-radius: 50%;
              box-shadow: 0 3px 12px rgba(0,0,0,0.35);
              display: flex; align-items: center; justify-content: center;
            ">
              <div style="
                width: 10px; height: 10px;
                background: white;
                border-radius: 50%;
              "></div>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
      polylineRef.current.push(marker);

      const popupContent = `
        <div style="font-family: 'JetBrains Mono', monospace; min-width: 180px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px; color: #0f172a;">
            ${device.device_name || device.imei}
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">
            ${device.manufacturer || ""} ${device.device_type || ""}
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 8px;">
            <div style="font-size: 11px; margin-bottom: 3px;">
              <span style="color: ${isOnline ? "#22c55e" : "#6b7280"}; font-weight: 600;">
                ${isOnline ? "● Online" : "● Offline"}
              </span>
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 3px;">
              📍 ${lat.toFixed(5)}, ${lon.toFixed(5)}
            </div>
            <div style="font-size: 11px; color: #6b7280;">
              🕐 ${device.last_location_time ? timeAgo(device.last_location_time) : "Never"}
            </div>
          </div>
          ${routeHistory.length > 1 ? `
            <div style="font-size: 11px; color: #3b82f6; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-weight: 600;">
              🗺️ ${routeHistory.length} route points
            </div>
          ` : ""}
        </div>
      `;

      marker.bindPopup(popupContent).openPopup();
      mapRef.current = map;

      return () => {
        polylineRef.current.forEach((l) => { try { l.remove(); } catch {} });
        polylineRef.current = [];
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    });
  }, [device, hasValidCoordinates, routeHistory, showRoute]);

  if (!hasValidCoordinates) {
    return (
      <div style={{
        padding: isMobile ? 16 : 24, height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: THEME.background.secondary,
      }}>
        <div style={{
          textAlign: "center", background: "white", padding: isMobile ? 24 : 40,
          borderRadius: 12, border: `2px solid ${THEME.border.light}`, maxWidth: 400,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text.primary, marginBottom: 8 }}>
            No GPS Location Available
          </div>
          <div style={{ fontSize: 13, color: THEME.text.secondary, marginBottom: 16 }}>
            This device hasn't sent GPS coordinates yet.
          </div>
          <div style={{
            fontSize: 11, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace",
            background: THEME.neutral[100], padding: 12, borderRadius: 6,
          }}>
            Lat: {device.last_latitude || "N/A"} · Lon: {device.last_longitude || "N/A"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: THEME.background.secondary }}>
      {/* Map Controls Bar */}
      <div style={{
        padding: isMobile ? "10px 12px" : "12px 20px",
        background: "white",
        borderBottom: `2px solid ${THEME.border.light}`,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "space-between",
        gap: isMobile ? 8 : 12,
      }}>
        {/* Title + coords */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📍</span>
          <div>
            <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: THEME.text.primary }}>
              Location {routeHistory.length > 1 && `& Route (${routeHistory.length} pts)`}
            </div>
            <div style={{ fontSize: 11, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace" }}>
              {Number(device.last_latitude).toFixed(5)}, {Number(device.last_longitude).toFixed(5)}
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {/* Time Range */}
          <div style={{ display: "flex", gap: 4 }}>
            {([
              { value: "24h" as const, label: "24h" },
              { value: "today" as const, label: "Today" },
            ]).map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                style={{
                  padding: isMobile ? "5px 10px" : "6px 12px",
                  background: timeRange === r.value ? THEME.primary[500] : "white",
                  color: timeRange === r.value ? "white" : THEME.text.secondary,
                  border: `2px solid ${timeRange === r.value ? THEME.primary[500] : THEME.border.light}`,
                  borderRadius: 8, fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Route toggle */}
          <button
            onClick={() => setShowRoute(!showRoute)}
            style={{
              padding: isMobile ? "5px 10px" : "6px 12px",
              background: showRoute ? "#3b82f6" : THEME.neutral[200],
              color: showRoute ? "white" : THEME.text.secondary,
              border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {showRoute ? "🗺️ Route" : "🗺️ Route"}
          </button>

          {/* Status */}
          <div style={{
            padding: isMobile ? "5px 8px" : "6px 12px",
            background: device.connection_status === "online" ? THEME.primary[50] : THEME.neutral[100],
            border: `2px solid ${device.connection_status === "online" ? THEME.primary[500] : THEME.neutral[400]}`,
            borderRadius: 8, fontSize: 11, fontWeight: 700,
            color: device.connection_status === "online" ? THEME.primary[600] : THEME.text.tertiary,
          }}>
            {device.connection_status === "online" ? "● LIVE" : "● OFF"}
          </div>

          {device.last_location_time && (
            <span style={{ fontSize: 10, color: THEME.text.tertiary }}>
              {loading ? "..." : timeAgo(device.last_location_time)}
            </span>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} style={{ flex: 1, position: "relative" }} />

      {/* Leaflet CSS + custom animations */}
      <style jsx global>{`
        @import url("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css");

        .leaflet-container {
          height: 100%;
          width: 100%;
          z-index: 0;
        }

        .custom-marker, .route-marker, .route-arrow {
          background: transparent !important;
          border: none !important;
        }

        @keyframes marker-pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.8); opacity: 0; }
        }

        .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
        }

        .leaflet-popup-tip {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
        }
      `}</style>
    </div>
  );
}