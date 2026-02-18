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
//     const interval = setInterval(fetchRouteHistory, 300000);
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

//       // Cleanup
//       return () => {
//         if (polylineRef.current) {
//           polylineRef.current.remove();
//         }
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

interface MapTabProps {
  device: Device;
}

export function MapTab({ device }: MapTabProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylineRef = useRef<any>(null);
  
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
        // Calculate time range
        const now = new Date();
        let startTime: Date;

        if (timeRange === "24h") {
          // Last 24 hours
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else {
          // Since midnight today
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
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchRouteHistory, 120000);
    return () => clearInterval(interval);
  }, [device.id, timeRange, hasValidCoordinates]);

  useEffect(() => {
    if (!hasValidCoordinates || !mapContainerRef.current) return;

    // Dynamically import Leaflet (client-side only)
    import("leaflet").then((L) => {
      // Fix for default marker icon in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Clear existing map if any
      if (mapRef.current) {
        mapRef.current.remove();
      }

      const lat = Number(device.last_latitude);
      const lon = Number(device.last_longitude);

      // Check if container exists before creating map
      if (!mapContainerRef.current) return;

      // Create map
      const map = L.map(mapContainerRef.current).setView([lat, lon], 15);

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Draw route polyline if data exists and showRoute is true
      if (showRoute && routeHistory.length > 1) {
        // Convert route history to lat/lng pairs with proper typing
        const routePoints: [number, number][] = routeHistory.map((point) => [
          Number(point.latitude),
          Number(point.longitude),
        ]);

        // Remove old polyline if exists
        if (polylineRef.current) {
          polylineRef.current.remove();
        }

        // Create polyline with gradient effect
        const polyline = L.polyline(routePoints, {
          color: THEME.primary[500],
          weight: 4,
          opacity: 0.7,
          smoothFactor: 1,
        }).addTo(map);

        polylineRef.current = polyline;

        // Add start marker (green)
        const startPoint = routeHistory[0];
        const startIcon = L.divIcon({
          className: "route-marker",
          html: `
            <div style="
              width: 24px;
              height: 24px;
              background: #10b981;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              color: white;
              font-weight: bold;
            ">S</div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        L.marker([Number(startPoint.latitude), Number(startPoint.longitude)], {
          icon: startIcon,
        })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: 'JetBrains Mono', monospace;">
              <strong>Start Point</strong><br/>
              <span style="font-size: 11px;">${timeAgo(startPoint.timestamp)}</span>
            </div>
          `);

        // Fit map bounds to show entire route
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }

      // Current position marker (end point)
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            width: 30px;
            height: 30px;
            background: ${device.connection_status === "online" ? "#00c853" : "#6b7280"};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          ">
            <div style="
              width: 12px;
              height: 12px;
              background: white;
              border-radius: 50%;
            "></div>
            ${device.connection_status === "online" ? `
              <div style="
                position: absolute;
                width: 30px;
                height: 30px;
                background: #00c853;
                border-radius: 50%;
                opacity: 0.3;
                animation: pulse 2s infinite;
              "></div>
            ` : ""}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      // Add current position marker
      const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);

      // Create popup content
      const popupContent = `
        <div style="font-family: 'JetBrains Mono', monospace; min-width: 200px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #1a1a1a;">
            ${device.device_name || device.imei}
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">
            ${device.manufacturer} ${device.device_type}
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 8px 0;">
          <div style="font-size: 11px; margin-bottom: 4px;">
            <strong>Status:</strong> 
            <span style="color: ${device.connection_status === "online" ? "#00c853" : "#6b7280"};">
              ${device.connection_status === "online" ? "🟢 Online" : "⚫ Offline"}
            </span>
          </div>
          <div style="font-size: 11px; margin-bottom: 4px;">
            <strong>Current Position</strong><br/>
            <span style="font-family: monospace;">${lat.toFixed(6)}, ${lon.toFixed(6)}</span>
          </div>
          <div style="font-size: 11px; margin-bottom: 4px;">
            <strong>Last Update:</strong> ${device.last_location_time ? timeAgo(device.last_location_time) : "Never"}
          </div>
          ${routeHistory.length > 1 ? `
            <div style="font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <strong>Route:</strong> ${routeHistory.length} points tracked
            </div>
          ` : ""}
        </div>
      `;

      marker.bindPopup(popupContent).openPopup();

      mapRef.current = map;

      // Cleanup function - CRITICAL for memory management
      return () => {
        // Remove polyline first
        if (polylineRef.current) {
          polylineRef.current.remove();
          polylineRef.current = null;
        }
        // Remove all markers
        if (marker) {
          marker.remove();
        }
        // Remove map and clear tiles from memory
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
        padding: 24, 
        height: "100%", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: THEME.background.secondary,
      }}>
        <div style={{
          textAlign: "center",
          background: "white",
          padding: 40,
          borderRadius: 12,
          border: `2px solid ${THEME.border.light}`,
          maxWidth: 400,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text.primary, marginBottom: 8 }}>
            No GPS Location Available
          </div>
          <div style={{ fontSize: 13, color: THEME.text.secondary, marginBottom: 16 }}>
            This device hasn't sent GPS coordinates yet.
          </div>
          <div style={{ 
            fontSize: 11, 
            color: THEME.text.tertiary,
            fontFamily: "JetBrains Mono, monospace",
            background: THEME.neutral[100],
            padding: 12,
            borderRadius: 6,
          }}>
            Latitude: {device.last_latitude || "N/A"}<br/>
            Longitude: {device.last_longitude || "N/A"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: THEME.background.secondary }}>
      {/* Map Controls Bar */}
      <div style={{
        padding: "12px 20px",
        background: "white",
        borderBottom: `2px solid ${THEME.border.light}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>📍</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>
              Device Location {routeHistory.length > 1 && `& Route (${routeHistory.length} points)`}
            </div>
            <div style={{ fontSize: 11, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace" }}>
              {Number(device.last_latitude).toFixed(6)}, {Number(device.last_longitude).toFixed(6)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Time Range Selector */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setTimeRange("24h")}
              style={{
                padding: "6px 12px",
                background: timeRange === "24h" ? THEME.primary[500] : "white",
                color: timeRange === "24h" ? "white" : THEME.text.secondary,
                border: `2px solid ${timeRange === "24h" ? THEME.primary[500] : THEME.border.light}`,
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Last 24h
            </button>
            <button
              onClick={() => setTimeRange("today")}
              style={{
                padding: "6px 12px",
                background: timeRange === "today" ? THEME.primary[500] : "white",
                color: timeRange === "today" ? "white" : THEME.text.secondary,
                border: `2px solid ${timeRange === "today" ? THEME.primary[500] : THEME.border.light}`,
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Today
            </button>
          </div>

          {/* Show/Hide Route Toggle */}
          <button
            onClick={() => setShowRoute(!showRoute)}
            style={{
              padding: "6px 12px",
              background: showRoute ? THEME.accent[500] : THEME.neutral[200],
              color: showRoute ? "white" : THEME.text.secondary,
              border: "none",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {showRoute ? "🗺️ Hide Route" : "🗺️ Show Route"}
          </button>

          {/* Status Badge */}
          <div style={{
            padding: "6px 12px",
            background: device.connection_status === "online" ? THEME.primary[50] : THEME.neutral[100],
            border: `2px solid ${device.connection_status === "online" ? THEME.primary[500] : THEME.neutral[400]}`,
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            color: device.connection_status === "online" ? THEME.primary[600] : THEME.text.tertiary,
          }}>
            {device.connection_status === "online" ? "🟢 ONLINE" : "⚫ OFFLINE"}
          </div>

          {device.last_location_time && (
            <div style={{
              fontSize: 11,
              color: THEME.text.tertiary,
              fontFamily: "JetBrains Mono, monospace",
            }}>
              {loading ? "Updating..." : `Updated ${timeAgo(device.last_location_time)}`}
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        style={{ 
          flex: 1,
          position: "relative",
        }} 
      />

      {/* Add Leaflet CSS */}
      <style jsx global>{`
        @import url("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css");
        
        .leaflet-container {
          height: 100%;
          width: 100%;
          z-index: 0;
        }

        .custom-marker, .route-marker {
          background: transparent;
          border: none;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.5);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
        }

        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .leaflet-popup-tip {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}