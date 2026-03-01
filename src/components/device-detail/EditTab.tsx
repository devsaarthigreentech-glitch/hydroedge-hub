// "use client";

// import React from "react";
// import { Device, Customer } from "@/types";

// interface EditTabProps {
//   device: Device;
//   customers: Customer[];
// }

// export function EditTab({ device, customers }: EditTabProps) {
//   return (
//     <div style={{ padding: 24, maxWidth: 650 }}>
//       <div style={{ background: "#242424", borderRadius: 10, border: "1px solid #333", padding: 24 }}>
//         <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 20 }}>
//           Edit Device
//         </div>
//         {[
//           { label: "Device name", value: device.device_name, key: "device_name" },
//           { label: "IMEI", value: device.imei, key: "imei", disabled: true },
//           { label: "Device type", value: `${device.manufacturer} ${device.device_type}`, key: "type" },
//           { label: "Asset name", value: device.asset_name || "", key: "asset_name" },
//           { label: "SIM number", value: device.sim_number || "", key: "sim" },
//         ].map((field) => (
//           <div key={field.key} style={{ marginBottom: 16 }}>
//             <label style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
//               {field.label}
//             </label>
//             <input
//               defaultValue={field.value}
//               disabled={field.disabled}
//               style={{
//                 width: "100%",
//                 background: field.disabled ? "#1a1a1a" : "#1e1e1e",
//                 border: "1px solid #333",
//                 borderRadius: 6,
//                 padding: "10px 12px",
//                 color: "#e2e8f0",
//                 fontSize: 13,
//                 fontFamily: "inherit",
//                 outline: "none",
//                 opacity: field.disabled ? 0.5 : 1,
//                 boxSizing: "border-box",
//               }}
//             />
//           </div>
//         ))}
//         <div style={{ marginBottom: 16 }}>
//           <label style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
//             Assigned Customer
//           </label>
//           <select
//             defaultValue={device.customer_id}
//             style={{
//               width: "100%",
//               background: "#1e1e1e",
//               border: "1px solid #333",
//               borderRadius: 6,
//               padding: "10px 12px",
//               color: "#e2e8f0",
//               fontSize: 13,
//               fontFamily: "inherit",
//               outline: "none",
//             }}
//           >
//             {customers.map((c) => (
//               <option key={c.id} value={c.id}>
//                 {"— ".repeat(c.hierarchy_level)}
//                 {c.name}
//               </option>
//             ))}
//           </select>
//         </div>
//         <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
//           <button
//             style={{
//               background: "#00c853",
//               color: "#000",
//               border: "none",
//               borderRadius: 6,
//               padding: "10px 24px",
//               fontWeight: 700,
//               fontSize: 12,
//               cursor: "pointer",
//               fontFamily: "inherit",
//             }}
//           >
//             SAVE
//           </button>
//           <button
//             style={{
//               background: "#ef4444",
//               color: "#fff",
//               border: "none",
//               borderRadius: 6,
//               padding: "10px 24px",
//               fontWeight: 700,
//               fontSize: 12,
//               cursor: "pointer",
//               fontFamily: "inherit",
//             }}
//           >
//             DELETE
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";

import React, { useState } from "react";
import { Device, Customer } from "@/types";
import { THEME } from "@/lib/theme";

interface EditTabProps {
  device: Device;
  customers: Customer[];
  onSaved?: (updatedDevice: Device) => void;  // callback to refresh parent
  onDeleted?: () => void; 
}

export function EditTab({ device, customers, onSaved, onDeleted }: EditTabProps) {
  const [formData, setFormData] = useState({
    device_name: device.device_name,
    device_type: device.device_type,
    asset_name: device.asset_name || "",
    sim_number: device.sim_number || "",
    customer_id: device.customer_id || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // const handleSave = async () => {
  //   setError("");
  //   setSuccess(false);
    
  //   if(!formData.device_name?.trim()){
  //     setError("Device name cannot be empty");
  //     return;
  //   }

  //   setIsSaving(true);

  //   try {
  //     const response = await fetch(`/api/devices/${device.id}`, {
  //       method: 'PATCH',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify({

  //         device_name : formData.device_name,
  //         device_type : formData.device_type,
  //         asset_name : formData.asset_name,
  //         sim_number : formData.sim_number
  //       }
  //       )

  //     });

  //     const data = await response.json();

  //     if(data.success){
  //       setSuccess(true);
  //     } else {
  //       setError(data.error || 'Failed to update device name');
  //     }
      
  //   } catch (err) {
  //     setError("Network error. Please try again.");
  //     console.error("Error updating device:", err);
  //   }
    
  //   setIsSaving(false);
  // };

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    
    if (!formData.device_name?.trim()) {
      setError("Device name cannot be empty");
      return;
    }
  
    setIsSaving(true);
  
    try {
      console.log("📤 Sending update request...");
      
      const response = await fetch(`/api/devices/${device.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_name: formData.device_name,
          device_type: formData.device_type,
          asset_name: formData.asset_name,
          sim_number: formData.sim_number,
          customer_id: formData.customer_id
        })
      });
  
      console.log("📥 Response status:", response.status);
      
      // Parse response
      const data = await response.json();
      console.log("📥 Response data:", data);
  
      // Check if request was successful
      if (response.ok && data.success) {
        setSuccess(true);
        console.log("✅ Update successful!");
        onSaved?.(data.device);
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        // Show error from API
        const errorMessage = data.error || 'Failed to update device';
        setError(errorMessage);
        console.error("❌ Update failed:", errorMessage);
      }
  
    } catch (err: any) {
      console.error("❌ Network error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!confirmDelete) {
      setShowDeleteConfirm(true); // first click: show confirmation
      return;
    }
    setShowDeleteConfirm(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/devices/${device.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      onDeleted?.(); // close the panel
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Delete failed" });
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 8 }}>
          Edit Device
        </div>
        <div style={{ fontSize: 13, color: THEME.text.secondary }}>
          Update device information and settings
        </div>
      </div>

      {/* Form Card */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: `2px solid ${THEME.border.light}`,
          padding: 24,
          maxWidth: 700,
          boxShadow: THEME.shadow.sm,
        }}
      >
        {/* Device Name */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 11,
              color: THEME.text.tertiary,
              textTransform: "uppercase",
              letterSpacing: 1,
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Device Name
          </label>
          <input
            type="text"
            value={formData.device_name}
            onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
            style={{
              width: "100%",
              background: "white",
              border: `2px solid ${THEME.border.light}`,
              borderRadius: 10,
              padding: "12px 16px",
              color: THEME.text.primary,
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              transition: "all 0.2s",
              boxShadow: THEME.shadow.sm,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = THEME.primary[500];
              e.target.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = THEME.border.light;
              e.target.style.boxShadow = THEME.shadow.sm;
            }}
          />
        </div>

        {/* IMEI (Read-only) */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 11,
              color: THEME.text.tertiary,
              textTransform: "uppercase",
              letterSpacing: 1,
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            IMEI
          </label>
          <input
            type="text"
            value={device.imei}
            disabled
            style={{
              width: "100%",
              background: THEME.neutral[50],
              border: `2px solid ${THEME.border.light}`,
              borderRadius: 10,
              padding: "12px 16px",
              color: THEME.text.tertiary,
              fontSize: 14,
              fontFamily: "JetBrains Mono, monospace",
              outline: "none",
              boxSizing: "border-box",
              cursor: "not-allowed",
              opacity: 0.7,
            }}
          />
          <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 6 }}>
            IMEI cannot be changed
          </div>
        </div>

        {/* Device Type (Read-only) */}
        {/* Device Type (Editable) */}
<div style={{ marginBottom: 20 }}>
  <label
    style={{
      fontSize: 11,
      color: THEME.text.tertiary,
      textTransform: "uppercase",
      letterSpacing: 1,
      display: "block",
      marginBottom: 8,
      fontWeight: 600,
    }}
  >
    Device Type
  </label>
  <select
    value={formData.device_type || device.device_type}
    onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
    style={{
      width: "100%",
      background: "white",
      border: `2px solid ${THEME.border.light}`,
      borderRadius: 10,
      padding: "12px 16px",
      color: THEME.text.primary,
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
      cursor: "pointer",
      transition: "all 0.2s",
      boxShadow: THEME.shadow.sm,
    }}
    onFocus={(e) => {
      e.currentTarget.style.borderColor = THEME.primary[500];
      e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
    }}
    onBlur={(e) => {
      e.currentTarget.style.borderColor = THEME.border.light;
      e.currentTarget.style.boxShadow = THEME.shadow.sm;
    }}
  >
    <option value="FMB150">FMB150</option>
    <option value="FMC650">FMC650</option>
    <option value="FMB920">FMB920</option>
    <option value="FMB140">FMB140</option>
  </select>
</div>

        {/* Asset Name */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 11,
              color: THEME.text.tertiary,
              textTransform: "uppercase",
              letterSpacing: 1,
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Asset Name
          </label>
          <input
            type="text"
            value={formData.asset_name}
            onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
            placeholder="Enter asset name (optional)"
            style={{
              width: "100%",
              background: "white",
              border: `2px solid ${THEME.border.light}`,
              borderRadius: 10,
              padding: "12px 16px",
              color: THEME.text.primary,
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              transition: "all 0.2s",
              boxShadow: THEME.shadow.sm,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = THEME.primary[500];
              e.target.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = THEME.border.light;
              e.target.style.boxShadow = THEME.shadow.sm;
            }}
          />
        </div>

        {/* SIM Number */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 11,
              color: THEME.text.tertiary,
              textTransform: "uppercase",
              letterSpacing: 1,
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            SIM Number
          </label>
          <input
            type="text"
            value={formData.sim_number}
            onChange={(e) => setFormData({ ...formData, sim_number: e.target.value })}
            placeholder="Enter SIM number (optional)"
            style={{
              width: "100%",
              background: "white",
              border: `2px solid ${THEME.border.light}`,
              borderRadius: 10,
              padding: "12px 16px",
              color: THEME.text.primary,
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              transition: "all 0.2s",
              boxShadow: THEME.shadow.sm,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = THEME.primary[500];
              e.target.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = THEME.border.light;
              e.target.style.boxShadow = THEME.shadow.sm;
            }}
          />
        </div>

        {/* Assigned Customer */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 11,
              color: THEME.text.tertiary,
              textTransform: "uppercase",
              letterSpacing: 1,
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Assigned Customer
          </label>
          <select
            value={formData.customer_id || ""}
            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            style={{
              width: "100%",
              background: "white",
              border: `2px solid ${THEME.border.light}`,
              borderRadius: 10,
              padding: "12px 16px",
              color: THEME.text.primary,
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: THEME.shadow.sm,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = THEME.primary[500];
              e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = THEME.border.light;
              e.currentTarget.style.boxShadow = THEME.shadow.sm;
            }}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(c.hierarchy_level)}
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 32, paddingTop: 20, borderTop: `2px solid ${THEME.border.light}` }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              background: THEME.primary[500],
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "12px 28px",
              fontWeight: 700,
              fontSize: 13,
              cursor: isSaving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
              boxShadow: THEME.shadow.md,
              opacity: isSaving ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.background = THEME.primary[600];
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = THEME.shadow.lg;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = THEME.primary[500];
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = THEME.shadow.md;
            }}
          >
            {isSaving ? "SAVING..." : "💾 SAVE CHANGES"}
          </button>
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: "white",
              color: "#ef4444",
              border: "2px solid #ef4444",
              borderRadius: 10,
              padding: "12px 28px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
              boxShadow: THEME.shadow.sm,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ef4444";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = THEME.shadow.md;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.color = "#ef4444";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = THEME.shadow.sm;
            }}
          >
            🗑️ DELETE DEVICE
          </button>
        </div>
      </div>

      {/* Success Message */}
{success && (
  <div style={{
    position: "fixed",
    top: 20,
    right: 20,
    padding: 16,
    background: "#d1fae5",
    border: "2px solid #10b981",
    borderRadius: 12,
    color: "#047857",
    fontSize: 14,
    fontWeight: 600,
    boxShadow: THEME.shadow.lg,
    zIndex: 999,
    maxWidth: 400,
    display: "flex",
    alignItems: "center",
    gap: 10,
  }}>
    <span style={{ fontSize: 20 }}>✅</span>
    <span>Device updated successfully!</span>
  </div>
)}

{/* Error Message */}
{error && (
  <div style={{
    position: "fixed",
    top: 20,
    right: 20,
    padding: 16,
    background: "#fee",
    border: "2px solid #ef4444",
    borderRadius: 12,
    color: "#dc2626",
    fontSize: 14,
    fontWeight: 600,
    boxShadow: THEME.shadow.lg,
    zIndex: 999,
    maxWidth: 400,
    display: "flex",
    alignItems: "center",
    gap: 10,
  }}>
    <span style={{ fontSize: 20 }}>⚠️</span>
    <span>{error}</span>
  </div>
)}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 16,
              padding: 32,
              maxWidth: 450,
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              border: `3px solid #ef4444`,
            }}
          >
            <div style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: THEME.text.primary, marginBottom: 12, textAlign: "center" }}>
              Delete Device?
            </div>
            <div style={{ fontSize: 14, color: THEME.text.secondary, marginBottom: 24, textAlign: "center" }}>
              Are you sure you want to delete <strong>{device.device_name}</strong>? This action cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  background: THEME.neutral[100],
                  color: THEME.text.primary,
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = THEME.neutral[200];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = THEME.neutral[100];
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1,
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                  boxShadow: THEME.shadow.md,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#dc2626";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ef4444";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                YES, DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}