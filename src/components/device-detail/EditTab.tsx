// // "use client";

// // import React, { useState } from "react";
// // import { Device, Customer } from "@/types";
// // import { THEME } from "@/lib/theme";

// // interface EditTabProps {
// //   device: Device;
// //   customers: Customer[];
// //   onSaved?: (updatedDevice: Device) => void;  // callback to refresh parent
// //   onDeleted?: () => void; 
// // }

// // export function EditTab({ device, customers, onSaved, onDeleted }: EditTabProps) {
// //   const [formData, setFormData] = useState({
// //     device_name: device.device_name,
// //     device_type: device.device_type,
// //     asset_name: device.asset_name || "",
// //     sim_number: device.sim_number || "",
// //     customer_id: device.customer_id || "",
// //   });

// //   const [isSaving, setIsSaving] = useState(false);
// //   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
// //   const [error, setError] = useState("");
// //   const [success, setSuccess] = useState(false);
// //   const [confirmDelete, setConfirmDelete] = useState(false);
// //   const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

// //   // const handleSave = async () => {
// //   //   setError("");
// //   //   setSuccess(false);

// //   //   if(!formData.device_name?.trim()){
// //   //     setError("Device name cannot be empty");
// //   //     return;
// //   //   }

// //   //   setIsSaving(true);

// //   //   try {
// //   //     const response = await fetch(`/api/devices/${device.id}`, {
// //   //       method: 'PATCH',
// //   //       headers: {
// //   //         'Content-Type': 'application/json'
// //   //       },
// //   //       body: JSON.stringify({

// //   //         device_name : formData.device_name,
// //   //         device_type : formData.device_type,
// //   //         asset_name : formData.asset_name,
// //   //         sim_number : formData.sim_number
// //   //       }
// //   //       )

// //   //     });

// //   //     const data = await response.json();

// //   //     if(data.success){
// //   //       setSuccess(true);
// //   //     } else {
// //   //       setError(data.error || 'Failed to update device name');
// //   //     }

// //   //   } catch (err) {
// //   //     setError("Network error. Please try again.");
// //   //     console.error("Error updating device:", err);
// //   //   }

// //   //   setIsSaving(false);
// //   // };

// //   const handleSave = async () => {
// //     setError("");
// //     setSuccess(false);

// //     if (!formData.device_name?.trim()) {
// //       setError("Device name cannot be empty");
// //       return;
// //     }

// //     setIsSaving(true);

// //     try {
// //       console.log("📤 Sending update request...");

// //       const response = await fetch(`/api/devices/${device.id}`, {
// //         method: 'PATCH',
// //         headers: {
// //           'Content-Type': 'application/json'
// //         },
// //         body: JSON.stringify({
// //           device_name: formData.device_name,
// //           device_type: formData.device_type,
// //           asset_name: formData.asset_name,
// //           sim_number: formData.sim_number,
// //           customer_id: formData.customer_id
// //         })
// //       });

// //       console.log("📥 Response status:", response.status);

// //       // Parse response
// //       const data = await response.json();
// //       console.log("📥 Response data:", data);

// //       // Check if request was successful
// //       if (response.ok && data.success) {
// //         setSuccess(true);
// //         console.log("✅ Update successful!");
// //         onSaved?.({ ...device, ...formData, ...(data.device || {}) });

// //         // Auto-hide success message after 3 seconds
// //         setTimeout(() => setSuccess(false), 3000);
// //       } else {
// //         // Show error from API
// //         const errorMessage = data.error || 'Failed to update device';
// //         setError(errorMessage);
// //         console.error("❌ Update failed:", errorMessage);
// //       }

// //     } catch (err: any) {
// //       console.error("❌ Network error:", err);
// //       setError("Network error. Please try again.");
// //     } finally {
// //       setIsSaving(false);
// //     }
// //   };

// //   const handleDelete = async () => {
// //     setShowDeleteConfirm(false);
// //     setMessage(null);
// //     try {
// //       const res = await fetch(`/api/devices/${device.id}`, { method: "DELETE" });
// //       const data = await res.json();
// //       if (!res.ok) throw new Error(data.error || "Failed to delete");
// //       onDeleted?.();
// //     } catch (err: unknown) {
// //       setMessage({ type: "error", text: err instanceof Error ? err.message : "Delete failed" });
// //     }
// //   };

// //   return (
// //     <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
// //       {/* Header */}
// //       <div style={{ marginBottom: 20 }}>
// //         <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 8 }}>
// //           Edit Device
// //         </div>
// //         <div style={{ fontSize: 13, color: THEME.text.secondary }}>
// //           Update device information and settings
// //         </div>
// //       </div>

// //       {/* Form Card */}
// //       <div
// //         style={{
// //           background: "white",
// //           borderRadius: 12,
// //           border: `2px solid ${THEME.border.light}`,
// //           padding: 24,
// //           maxWidth: 700,
// //           boxShadow: THEME.shadow.sm,
// //         }}
// //       >
// //         {/* Device Name */}
// //         <div style={{ marginBottom: 20 }}>
// //           <label
// //             style={{
// //               fontSize: 11,
// //               color: THEME.text.tertiary,
// //               textTransform: "uppercase",
// //               letterSpacing: 1,
// //               display: "block",
// //               marginBottom: 8,
// //               fontWeight: 600,
// //             }}
// //           >
// //             Device Name
// //           </label>
// //           <input
// //             type="text"
// //             value={formData.device_name}
// //             onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
// //             style={{
// //               width: "100%",
// //               background: "white",
// //               border: `2px solid ${THEME.border.light}`,
// //               borderRadius: 10,
// //               padding: "12px 16px",
// //               color: THEME.text.primary,
// //               fontSize: 14,
// //               fontFamily: "inherit",
// //               outline: "none",
// //               boxSizing: "border-box",
// //               transition: "all 0.2s",
// //               boxShadow: THEME.shadow.sm,
// //             }}
// //             onFocus={(e) => {
// //               e.target.style.borderColor = THEME.primary[500];
// //               e.target.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
// //             }}
// //             onBlur={(e) => {
// //               e.target.style.borderColor = THEME.border.light;
// //               e.target.style.boxShadow = THEME.shadow.sm;
// //             }}
// //           />
// //         </div>

// //         {/* IMEI (Read-only) */}
// //         <div style={{ marginBottom: 20 }}>
// //           <label
// //             style={{
// //               fontSize: 11,
// //               color: THEME.text.tertiary,
// //               textTransform: "uppercase",
// //               letterSpacing: 1,
// //               display: "block",
// //               marginBottom: 8,
// //               fontWeight: 600,
// //             }}
// //           >
// //             IMEI
// //           </label>
// //           <input
// //             type="text"
// //             value={device.imei}
// //             disabled
// //             style={{
// //               width: "100%",
// //               background: THEME.neutral[50],
// //               border: `2px solid ${THEME.border.light}`,
// //               borderRadius: 10,
// //               padding: "12px 16px",
// //               color: THEME.text.tertiary,
// //               fontSize: 14,
// //               fontFamily: "JetBrains Mono, monospace",
// //               outline: "none",
// //               boxSizing: "border-box",
// //               cursor: "not-allowed",
// //               opacity: 0.7,
// //             }}
// //           />
// //           <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 6 }}>
// //             IMEI cannot be changed
// //           </div>
// //         </div>

// //         {/* Device Type (Read-only) */}
// //         {/* Device Type (Editable) */}
// // <div style={{ marginBottom: 20 }}>
// //   <label
// //     style={{
// //       fontSize: 11,
// //       color: THEME.text.tertiary,
// //       textTransform: "uppercase",
// //       letterSpacing: 1,
// //       display: "block",
// //       marginBottom: 8,
// //       fontWeight: 600,
// //     }}
// //   >
// //     Device Type
// //   </label>
// //   <select
// //     value={formData.device_type || device.device_type}
// //     onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
// //     style={{
// //       width: "100%",
// //       background: "white",
// //       border: `2px solid ${THEME.border.light}`,
// //       borderRadius: 10,
// //       padding: "12px 16px",
// //       color: THEME.text.primary,
// //       fontSize: 14,
// //       fontFamily: "inherit",
// //       outline: "none",
// //       boxSizing: "border-box",
// //       cursor: "pointer",
// //       transition: "all 0.2s",
// //       boxShadow: THEME.shadow.sm,
// //     }}
// //     onFocus={(e) => {
// //       e.currentTarget.style.borderColor = THEME.primary[500];
// //       e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
// //     }}
// //     onBlur={(e) => {
// //       e.currentTarget.style.borderColor = THEME.border.light;
// //       e.currentTarget.style.boxShadow = THEME.shadow.sm;
// //     }}
// //   >
// //     <option value="FMB150">FMB150</option>
// //     <option value="FMC650">FMC650</option>
// //     <option value="FMB920">FMB920</option>
// //     <option value="FMB140">FMB140</option>
// //   </select>
// // </div>

// //         {/* Asset Name */}
// //         <div style={{ marginBottom: 20 }}>
// //           <label
// //             style={{
// //               fontSize: 11,
// //               color: THEME.text.tertiary,
// //               textTransform: "uppercase",
// //               letterSpacing: 1,
// //               display: "block",
// //               marginBottom: 8,
// //               fontWeight: 600,
// //             }}
// //           >
// //             Asset Name
// //           </label>
// //           <input
// //             type="text"
// //             value={formData.asset_name}
// //             onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
// //             placeholder="Enter asset name (optional)"
// //             style={{
// //               width: "100%",
// //               background: "white",
// //               border: `2px solid ${THEME.border.light}`,
// //               borderRadius: 10,
// //               padding: "12px 16px",
// //               color: THEME.text.primary,
// //               fontSize: 14,
// //               fontFamily: "inherit",
// //               outline: "none",
// //               boxSizing: "border-box",
// //               transition: "all 0.2s",
// //               boxShadow: THEME.shadow.sm,
// //             }}
// //             onFocus={(e) => {
// //               e.target.style.borderColor = THEME.primary[500];
// //               e.target.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
// //             }}
// //             onBlur={(e) => {
// //               e.target.style.borderColor = THEME.border.light;
// //               e.target.style.boxShadow = THEME.shadow.sm;
// //             }}
// //           />
// //         </div>

// //         {/* SIM Number */}
// //         <div style={{ marginBottom: 20 }}>
// //           <label
// //             style={{
// //               fontSize: 11,
// //               color: THEME.text.tertiary,
// //               textTransform: "uppercase",
// //               letterSpacing: 1,
// //               display: "block",
// //               marginBottom: 8,
// //               fontWeight: 600,
// //             }}
// //           >
// //             SIM Number
// //           </label>
// //           <input
// //             type="text"
// //             value={formData.sim_number}
// //             onChange={(e) => setFormData({ ...formData, sim_number: e.target.value })}
// //             placeholder="Enter SIM number (optional)"
// //             style={{
// //               width: "100%",
// //               background: "white",
// //               border: `2px solid ${THEME.border.light}`,
// //               borderRadius: 10,
// //               padding: "12px 16px",
// //               color: THEME.text.primary,
// //               fontSize: 14,
// //               fontFamily: "inherit",
// //               outline: "none",
// //               boxSizing: "border-box",
// //               transition: "all 0.2s",
// //               boxShadow: THEME.shadow.sm,
// //             }}
// //             onFocus={(e) => {
// //               e.target.style.borderColor = THEME.primary[500];
// //               e.target.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
// //             }}
// //             onBlur={(e) => {
// //               e.target.style.borderColor = THEME.border.light;
// //               e.target.style.boxShadow = THEME.shadow.sm;
// //             }}
// //           />
// //         </div>

// //         {/* Assigned Customer */}
// //         <div style={{ marginBottom: 20 }}>
// //           <label
// //             style={{
// //               fontSize: 11,
// //               color: THEME.text.tertiary,
// //               textTransform: "uppercase",
// //               letterSpacing: 1,
// //               display: "block",
// //               marginBottom: 8,
// //               fontWeight: 600,
// //             }}
// //           >
// //             Assigned Customer
// //           </label>
// //           <select
// //             value={formData.customer_id || ""}
// //             onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
// //             style={{
// //               width: "100%",
// //               background: "white",
// //               border: `2px solid ${THEME.border.light}`,
// //               borderRadius: 10,
// //               padding: "12px 16px",
// //               color: THEME.text.primary,
// //               fontSize: 14,
// //               fontFamily: "inherit",
// //               outline: "none",
// //               boxSizing: "border-box",
// //               cursor: "pointer",
// //               transition: "all 0.2s",
// //               boxShadow: THEME.shadow.sm,
// //             }}
// //             onFocus={(e) => {
// //               e.currentTarget.style.borderColor = THEME.primary[500];
// //               e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
// //             }}
// //             onBlur={(e) => {
// //               e.currentTarget.style.borderColor = THEME.border.light;
// //               e.currentTarget.style.boxShadow = THEME.shadow.sm;
// //             }}
// //           >
// //             {customers.map((c) => (
// //               <option key={c.id} value={c.id}>
// //                 {"— ".repeat(c.hierarchy_level)}
// //                 {c.name}
// //               </option>
// //             ))}
// //           </select>
// //         </div>

// //         {/* Action Buttons */}
// //         <div style={{ display: "flex", gap: 12, marginTop: 32, paddingTop: 20, borderTop: `2px solid ${THEME.border.light}` }}>
// //           <button
// //             onClick={handleSave}
// //             disabled={isSaving}
// //             style={{
// //               background: THEME.primary[500],
// //               color: "white",
// //               border: "none",
// //               borderRadius: 10,
// //               padding: "12px 28px",
// //               fontWeight: 700,
// //               fontSize: 13,
// //               cursor: isSaving ? "not-allowed" : "pointer",
// //               fontFamily: "inherit",
// //               transition: "all 0.2s",
// //               boxShadow: THEME.shadow.md,
// //               opacity: isSaving ? 0.7 : 1,
// //             }}
// //             onMouseEnter={(e) => {
// //               if (!isSaving) {
// //                 e.currentTarget.style.background = THEME.primary[600];
// //                 e.currentTarget.style.transform = "translateY(-2px)";
// //                 e.currentTarget.style.boxShadow = THEME.shadow.lg;
// //               }
// //             }}
// //             onMouseLeave={(e) => {
// //               e.currentTarget.style.background = THEME.primary[500];
// //               e.currentTarget.style.transform = "translateY(0)";
// //               e.currentTarget.style.boxShadow = THEME.shadow.md;
// //             }}
// //           >
// //             {isSaving ? "SAVING..." : "💾 SAVE CHANGES"}
// //           </button>

// //           <button
// //             onClick={() => setShowDeleteConfirm(true)}
// //             style={{
// //               background: "white",
// //               color: "#ef4444",
// //               border: "2px solid #ef4444",
// //               borderRadius: 10,
// //               padding: "12px 28px",
// //               fontWeight: 700,
// //               fontSize: 13,
// //               cursor: "pointer",
// //               fontFamily: "inherit",
// //               transition: "all 0.2s",
// //               boxShadow: THEME.shadow.sm,
// //             }}
// //             onMouseEnter={(e) => {
// //               e.currentTarget.style.background = "#ef4444";
// //               e.currentTarget.style.color = "white";
// //               e.currentTarget.style.transform = "translateY(-2px)";
// //               e.currentTarget.style.boxShadow = THEME.shadow.md;
// //             }}
// //             onMouseLeave={(e) => {
// //               e.currentTarget.style.background = "white";
// //               e.currentTarget.style.color = "#ef4444";
// //               e.currentTarget.style.transform = "translateY(0)";
// //               e.currentTarget.style.boxShadow = THEME.shadow.sm;
// //             }}
// //           >
// //             🗑️ DELETE DEVICE
// //           </button>
// //         </div>
// //       </div>

// //       {/* Success Message */}
// // {success && (
// //   <div style={{
// //     position: "fixed",
// //     top: 20,
// //     right: 20,
// //     padding: 16,
// //     background: "#d1fae5",
// //     border: "2px solid #10b981",
// //     borderRadius: 12,
// //     color: "#047857",
// //     fontSize: 14,
// //     fontWeight: 600,
// //     boxShadow: THEME.shadow.lg,
// //     zIndex: 999,
// //     maxWidth: 400,
// //     display: "flex",
// //     alignItems: "center",
// //     gap: 10,
// //   }}>
// //     <span style={{ fontSize: 20 }}>✅</span>
// //     <span>Device updated successfully!</span>
// //   </div>
// // )}

// // {/* Error Message */}
// // {error && (
// //   <div style={{
// //     position: "fixed",
// //     top: 20,
// //     right: 20,
// //     padding: 16,
// //     background: "#fee",
// //     border: "2px solid #ef4444",
// //     borderRadius: 12,
// //     color: "#dc2626",
// //     fontSize: 14,
// //     fontWeight: 600,
// //     boxShadow: THEME.shadow.lg,
// //     zIndex: 999,
// //     maxWidth: 400,
// //     display: "flex",
// //     alignItems: "center",
// //     gap: 10,
// //   }}>
// //     <span style={{ fontSize: 20 }}>⚠️</span>
// //     <span>{error}</span>
// //   </div>
// // )}

// //       {/* Delete Confirmation Modal */}
// //       {showDeleteConfirm && (
// //         <div
// //           style={{
// //             position: "fixed",
// //             top: 0,
// //             left: 0,
// //             right: 0,
// //             bottom: 0,
// //             background: "rgba(0, 0, 0, 0.7)",
// //             display: "flex",
// //             alignItems: "center",
// //             justifyContent: "center",
// //             zIndex: 1000,
// //           }}
// //           onClick={() => setShowDeleteConfirm(false)}
// //         >
// //           <div
// //             onClick={(e) => e.stopPropagation()}
// //             style={{
// //               background: "white",
// //               borderRadius: 16,
// //               padding: 32,
// //               maxWidth: 450,
// //               boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
// //               border: `3px solid #ef4444`,
// //             }}
// //           >
// //             <div style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>⚠️</div>
// //             <div style={{ fontSize: 20, fontWeight: 700, color: THEME.text.primary, marginBottom: 12, textAlign: "center" }}>
// //               Delete Device?
// //             </div>
// //             <div style={{ fontSize: 14, color: THEME.text.secondary, marginBottom: 24, textAlign: "center" }}>
// //               Are you sure you want to delete <strong>{device.device_name}</strong>? This action cannot be undone.
// //             </div>
// //             <div style={{ display: "flex", gap: 12 }}>
// //               <button
// //                 onClick={() => setShowDeleteConfirm(false)}
// //                 style={{
// //                   flex: 1,
// //                   background: THEME.neutral[100],
// //                   color: THEME.text.primary,
// //                   border: "none",
// //                   borderRadius: 10,
// //                   padding: "12px 24px",
// //                   fontWeight: 700,
// //                   fontSize: 13,
// //                   cursor: "pointer",
// //                   fontFamily: "inherit",
// //                   transition: "all 0.2s",
// //                 }}
// //                 onMouseEnter={(e) => {
// //                   e.currentTarget.style.background = THEME.neutral[200];
// //                 }}
// //                 onMouseLeave={(e) => {
// //                   e.currentTarget.style.background = THEME.neutral[100];
// //                 }}
// //               >
// //                 CANCEL
// //               </button>
// //               <button
// //                 onClick={handleDelete}
// //                 style={{
// //                   flex: 1,
// //                   background: "#ef4444",
// //                   color: "white",
// //                   border: "none",
// //                   borderRadius: 10,
// //                   padding: "12px 24px",
// //                   fontWeight: 700,
// //                   fontSize: 13,
// //                   cursor: "pointer",
// //                   fontFamily: "inherit",
// //                   transition: "all 0.2s",
// //                   boxShadow: THEME.shadow.md,
// //                 }}
// //                 onMouseEnter={(e) => {
// //                   e.currentTarget.style.background = "#dc2626";
// //                   e.currentTarget.style.transform = "scale(1.05)";
// //                 }}
// //                 onMouseLeave={(e) => {
// //                   e.currentTarget.style.background = "#ef4444";
// //                   e.currentTarget.style.transform = "scale(1)";
// //                 }}
// //               >
// //                 YES, DELETE
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }
// "use client";

// import React, { useState } from "react";
// import { Device, Customer } from "@/types";
// import { THEME } from "@/lib/theme";

// interface EditTabProps {
//   device: Device;
//   customers: Customer[];
//   onSaved?: (updatedDevice: Device) => void;
//   onDeleted?: () => void;
// }

// export function EditTab({ device, customers, onSaved, onDeleted }: EditTabProps) {
//   const [formData, setFormData] = useState({
//     device_name: device.device_name,
//     device_type: device.device_type,
//     asset_name: device.asset_name || "",
//     sim_number: device.sim_number || "",
//     customer_id: device.customer_id || "",
//   });

//   const [isSaving, setIsSaving] = useState(false);
//   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//   const [deleteConfirmText, setDeleteConfirmText] = useState("");
//   const [isDeleting, setIsDeleting] = useState(false);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState(false);
//   const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

//   const handleSave = async () => {
//     setError("");
//     setSuccess(false);

//     if (!formData.device_name?.trim()) {
//       setError("Device name cannot be empty");
//       return;
//     }

//     setIsSaving(true);

//     try {
//       const response = await fetch(`/api/devices/${device.id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           device_name: formData.device_name,
//           device_type: formData.device_type,
//           asset_name: formData.asset_name,
//           sim_number: formData.sim_number,
//           customer_id: formData.customer_id,
//         }),
//       });

//       const data = await response.json();

//       if (response.ok && data.success) {
//         setSuccess(true);
//         onSaved?.({ ...device, ...formData, ...(data.device || {}) });
//         setTimeout(() => setSuccess(false), 3000);
//       } else {
//         setError(data.error || "Failed to update device");
//       }
//     } catch (err: any) {
//       setError("Network error. Please try again.");
//       console.error("Error updating device:", err);
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleDelete = async () => {
//     setIsDeleting(true);
//     setMessage(null);
//     try {
//       const res = await fetch(`/api/devices/${device.id}`, { method: "DELETE" });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Failed to delete");
//       onDeleted?.();
//     } catch (err: unknown) {
//       setMessage({ type: "error", text: err instanceof Error ? err.message : "Delete failed" });
//       setIsDeleting(false);
//     }
//   };

//   const deleteMatch = deleteConfirmText.trim().toLowerCase() === (device.device_name ?? "").trim().toLowerCase();

//   return (
//     <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
//       {/* Header */}
//       <div style={{ marginBottom: 20 }}>
//         <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 8 }}>
//           Edit Device
//         </div>
//         <div style={{ fontSize: 13, color: THEME.text.secondary }}>
//           Update device information and settings
//         </div>
//       </div>

//       {/* Form Card */}
//       <div
//         style={{
//           background: "white",
//           borderRadius: 12,
//           border: `2px solid ${THEME.border.light}`,
//           padding: 24,
//           maxWidth: 700,
//           boxShadow: THEME.shadow.sm,
//         }}
//       >
//         {/* Device Name */}
//         <div style={{ marginBottom: 20 }}>
//           <label style={{ fontSize: 11, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8, fontWeight: 600 }}>
//             Device Name
//           </label>
//           <input
//             type="text"
//             value={formData.device_name}
//             onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
//             style={{
//               width: "100%", background: "white", border: `2px solid ${THEME.border.light}`,
//               borderRadius: 10, padding: "12px 16px", color: THEME.text.primary, fontSize: 14,
//               fontFamily: "inherit", outline: "none", boxSizing: "border-box",
//               transition: "all 0.2s", boxShadow: THEME.shadow.sm,
//             }}
//             onFocus={(e) => { e.target.style.borderColor = THEME.primary[500]; e.target.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`; }}
//             onBlur={(e) => { e.target.style.borderColor = THEME.border.light; e.target.style.boxShadow = THEME.shadow.sm; }}
//           />
//         </div>

//         {/* IMEI (Read-only) */}
//         <div style={{ marginBottom: 20 }}>
//           <label style={{ fontSize: 11, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8, fontWeight: 600 }}>
//             IMEI
//           </label>
//           <input
//             type="text"
//             value={device.imei}
//             disabled
//             style={{
//               width: "100%", background: THEME.neutral[50], border: `2px solid ${THEME.border.light}`,
//               borderRadius: 10, padding: "12px 16px", color: THEME.text.tertiary, fontSize: 14,
//               fontFamily: "JetBrains Mono, monospace", outline: "none", boxSizing: "border-box",
//               cursor: "not-allowed", opacity: 0.7,
//             }}
//           />
//           <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 6 }}>IMEI cannot be changed</div>
//         </div>

//         {/* Device Type */}
//         <div style={{ marginBottom: 20 }}>
//           <label style={{ fontSize: 11, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8, fontWeight: 600 }}>
//             Device Type
//           </label>
//           <select
//             value={formData.device_type || device.device_type}
//             onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
//             style={{
//               width: "100%", background: "white", border: `2px solid ${THEME.border.light}`,
//               borderRadius: 10, padding: "12px 16px", color: THEME.text.primary, fontSize: 14,
//               fontFamily: "inherit", outline: "none", boxSizing: "border-box", cursor: "pointer",
//               transition: "all 0.2s", boxShadow: THEME.shadow.sm,
//             }}
//             onFocus={(e) => { e.currentTarget.style.borderColor = THEME.primary[500]; e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`; }}
//             onBlur={(e) => { e.currentTarget.style.borderColor = THEME.border.light; e.currentTarget.style.boxShadow = THEME.shadow.sm; }}
//           >
//             <option value="FMB150">FMB150</option>
//             <option value="FMC650">FMC650</option>
//             <option value="FMB920">FMB920</option>
//             <option value="FMB140">FMB140</option>
//           </select>
//         </div>

//         {/* Asset Name */}
//         <div style={{ marginBottom: 20 }}>
//           <label style={{ fontSize: 11, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8, fontWeight: 600 }}>
//             Asset Name
//           </label>
//           <input
//             type="text"
//             value={formData.asset_name}
//             onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
//             placeholder="Enter asset name (optional)"
//             style={{
//               width: "100%", background: "white", border: `2px solid ${THEME.border.light}`,
//               borderRadius: 10, padding: "12px 16px", color: THEME.text.primary, fontSize: 14,
//               fontFamily: "inherit", outline: "none", boxSizing: "border-box",
//               transition: "all 0.2s", boxShadow: THEME.shadow.sm,
//             }}
//             onFocus={(e) => { e.target.style.borderColor = THEME.primary[500]; e.target.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`; }}
//             onBlur={(e) => { e.target.style.borderColor = THEME.border.light; e.target.style.boxShadow = THEME.shadow.sm; }}
//           />
//         </div>

//         {/* SIM Number */}
//         <div style={{ marginBottom: 20 }}>
//           <label style={{ fontSize: 11, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8, fontWeight: 600 }}>
//             SIM Number
//           </label>
//           <input
//             type="text"
//             value={formData.sim_number}
//             onChange={(e) => setFormData({ ...formData, sim_number: e.target.value })}
//             placeholder="Enter SIM number (optional)"
//             style={{
//               width: "100%", background: "white", border: `2px solid ${THEME.border.light}`,
//               borderRadius: 10, padding: "12px 16px", color: THEME.text.primary, fontSize: 14,
//               fontFamily: "inherit", outline: "none", boxSizing: "border-box",
//               transition: "all 0.2s", boxShadow: THEME.shadow.sm,
//             }}
//             onFocus={(e) => { e.target.style.borderColor = THEME.primary[500]; e.target.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`; }}
//             onBlur={(e) => { e.target.style.borderColor = THEME.border.light; e.target.style.boxShadow = THEME.shadow.sm; }}
//           />
//         </div>

//         {/* Assigned Customer */}
//         <div style={{ marginBottom: 20 }}>
//           <label style={{ fontSize: 11, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8, fontWeight: 600 }}>
//             Assigned Customer
//           </label>
//           <select
//             value={formData.customer_id || ""}
//             onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
//             style={{
//               width: "100%", background: "white", border: `2px solid ${THEME.border.light}`,
//               borderRadius: 10, padding: "12px 16px", color: THEME.text.primary, fontSize: 14,
//               fontFamily: "inherit", outline: "none", boxSizing: "border-box", cursor: "pointer",
//               transition: "all 0.2s", boxShadow: THEME.shadow.sm,
//             }}
//             onFocus={(e) => { e.currentTarget.style.borderColor = THEME.primary[500]; e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`; }}
//             onBlur={(e) => { e.currentTarget.style.borderColor = THEME.border.light; e.currentTarget.style.boxShadow = THEME.shadow.sm; }}
//           >
//             {customers.map((c) => (
//               <option key={c.id} value={c.id}>
//                 {"— ".repeat(c.hierarchy_level)}
//                 {c.name}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Action Buttons */}
//         <div style={{ display: "flex", gap: 12, marginTop: 32, paddingTop: 20, borderTop: `2px solid ${THEME.border.light}` }}>
//           <button
//             onClick={handleSave}
//             disabled={isSaving}
//             style={{
//               background: THEME.primary[500], color: "white", border: "none", borderRadius: 10,
//               padding: "12px 28px", fontWeight: 700, fontSize: 13, cursor: isSaving ? "not-allowed" : "pointer",
//               fontFamily: "inherit", transition: "all 0.2s", boxShadow: THEME.shadow.md,
//               opacity: isSaving ? 0.7 : 1,
//             }}
//             onMouseEnter={(e) => { if (!isSaving) { e.currentTarget.style.background = THEME.primary[600]; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = THEME.shadow.lg; } }}
//             onMouseLeave={(e) => { e.currentTarget.style.background = THEME.primary[500]; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = THEME.shadow.md; }}
//           >
//             {isSaving ? "SAVING..." : "💾 SAVE CHANGES"}
//           </button>

//           <button
//             onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(""); }}
//             style={{
//               background: "white", color: "#ef4444", border: "2px solid #ef4444", borderRadius: 10,
//               padding: "12px 28px", fontWeight: 700, fontSize: 13, cursor: "pointer",
//               fontFamily: "inherit", transition: "all 0.2s", boxShadow: THEME.shadow.sm,
//             }}
//             onMouseEnter={(e) => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "white"; e.currentTarget.style.transform = "translateY(-2px)"; }}
//             onMouseLeave={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.transform = "translateY(0)"; }}
//           >
//             🗑️ DELETE DEVICE
//           </button>
//         </div>
//       </div>

//       {/* Success Toast */}
//       {success && (
//         <div style={{
//           position: "fixed", top: 20, right: 20, padding: 16, background: "#d1fae5",
//           border: "2px solid #10b981", borderRadius: 12, color: "#047857", fontSize: 14,
//           fontWeight: 600, boxShadow: THEME.shadow.lg, zIndex: 999, maxWidth: 400,
//           display: "flex", alignItems: "center", gap: 10,
//         }}>
//           <span style={{ fontSize: 20 }}>✅</span>
//           <span>Device updated successfully!</span>
//         </div>
//       )}

//       {/* Error Toast */}
//       {error && (
//         <div style={{
//           position: "fixed", top: 20, right: 20, padding: 16, background: "#fee",
//           border: "2px solid #ef4444", borderRadius: 12, color: "#dc2626", fontSize: 14,
//           fontWeight: 600, boxShadow: THEME.shadow.lg, zIndex: 999, maxWidth: 400,
//           display: "flex", alignItems: "center", gap: 10,
//         }}>
//           <span style={{ fontSize: 20 }}>⚠️</span>
//           <span>{error}</span>
//         </div>
//       )}

//       {/* ================================================================== */}
//       {/* DELETE CONFIRMATION MODAL — Two-step with type-to-confirm           */}
//       {/* ================================================================== */}
//       {showDeleteConfirm && (
//         <div
//           style={{
//             position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
//             background: "rgba(0, 0, 0, 0.75)",
//             backdropFilter: "blur(4px)",
//             display: "flex", alignItems: "center", justifyContent: "center",
//             zIndex: 1000,
//             animation: "fadeIn 0.2s ease-out",
//           }}
//           onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
//         >
//           <div
//             onClick={(e) => e.stopPropagation()}
//             style={{
//               background: "white",
//               borderRadius: 16,
//               padding: 0,
//               width: "100%",
//               maxWidth: 480,
//               boxShadow: "0 25px 80px rgba(0, 0, 0, 0.4)",
//               overflow: "hidden",
//               animation: "scaleIn 0.2s ease-out",
//             }}
//           >
//             {/* Red danger header */}
//             <div style={{
//               background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
//               padding: "24px 32px",
//               display: "flex", alignItems: "center", gap: 16,
//             }}>
//               <div style={{
//                 width: 48, height: 48, borderRadius: 12,
//                 background: "rgba(255,255,255,0.2)",
//                 display: "flex", alignItems: "center", justifyContent: "center",
//                 fontSize: 24,
//               }}>
//                 🗑️
//               </div>
//               <div>
//                 <div style={{ fontSize: 20, fontWeight: 800, color: "white" }}>
//                   Permanent Deletion
//                 </div>
//                 <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
//                   This action is irreversible
//                 </div>
//               </div>
//             </div>

//             {/* Body */}
//             <div style={{ padding: "24px 32px" }}>

//               {/* Warning box */}
//               <div style={{
//                 background: "#fef2f2",
//                 border: "2px solid #fecaca",
//                 borderRadius: 12,
//                 padding: 16,
//                 marginBottom: 20,
//               }}>
//                 <div style={{ fontSize: 14, fontWeight: 700, color: "#991b1b", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
//                   <span>⚠️</span> Warning — All data will be permanently lost
//                 </div>
//                 <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.6 }}>
//                   Deleting <strong style={{ color: "#dc2626" }}>{device.device_name}</strong> (IMEI: <code style={{
//                     background: "#fee2e2", padding: "2px 6px", borderRadius: 4, fontSize: 12,
//                     fontFamily: "JetBrains Mono, monospace",
//                   }}>{device.imei}</code>) will permanently remove:
//                 </div>
//                 <ul style={{
//                   margin: "12px 0 0 0",
//                   padding: "0 0 0 20px",
//                   fontSize: 13,
//                   color: "#991b1b",
//                   lineHeight: 2,
//                 }}>
//                   <li>All GPS tracking history and location records</li>
//                   <li>All telemetry and IO sensor data</li>
//                   <li>All analytics, fuel, and distance logs</li>
//                   <li>Device configuration and settings</li>
//                   <li>Command history and audit trail</li>
//                 </ul>
//               </div>

//               {/* Type to confirm */}
//               <div style={{ marginBottom: 24 }}>
//                 <label style={{
//                   fontSize: 13, color: THEME.text.primary, display: "block", marginBottom: 10,
//                   fontWeight: 600, lineHeight: 1.5,
//                 }}>
//                   Type <span style={{
//                     background: "#fee2e2", color: "#dc2626", padding: "2px 8px",
//                     borderRadius: 6, fontWeight: 800, fontFamily: "JetBrains Mono, monospace",
//                     fontSize: 13, letterSpacing: 0.5,
//                   }}>{device.device_name}</span> to confirm deletion:
//                 </label>
//                 <input
//                   type="text"
//                   value={deleteConfirmText}
//                   onChange={(e) => setDeleteConfirmText(e.target.value)}
//                   placeholder={`Type "${device.device_name}" here`}
//                   autoFocus
//                   style={{
//                     width: "100%",
//                     background: deleteMatch ? "#f0fdf4" : "white",
//                     border: `2px solid ${deleteMatch ? "#22c55e" : "#e5e7eb"}`,
//                     borderRadius: 10,
//                     padding: "12px 16px",
//                     color: THEME.text.primary,
//                     fontSize: 14,
//                     fontFamily: "JetBrains Mono, monospace",
//                     outline: "none",
//                     boxSizing: "border-box",
//                     transition: "all 0.2s",
//                   }}
//                   onFocus={(e) => {
//                     if (!deleteMatch) {
//                       e.target.style.borderColor = "#ef4444";
//                       e.target.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.15)";
//                     }
//                   }}
//                   onBlur={(e) => {
//                     if (!deleteMatch) {
//                       e.target.style.borderColor = "#e5e7eb";
//                       e.target.style.boxShadow = "none";
//                     }
//                   }}
//                 />
//                 {deleteConfirmText.length > 0 && !deleteMatch && (
//                   <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6, fontWeight: 500 }}>
//                     Name does not match. Please type the exact device name.
//                   </div>
//                 )}
//                 {deleteMatch && (
//                   <div style={{ fontSize: 12, color: "#16a34a", marginTop: 6, fontWeight: 600 }}>
//                     ✓ Name confirmed
//                   </div>
//                 )}
//               </div>

//               {/* Delete error message */}
//               {message?.type === "error" && (
//                 <div style={{
//                   background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
//                   padding: 12, marginBottom: 16, fontSize: 13, color: "#dc2626", fontWeight: 500,
//                 }}>
//                   {message.text}
//                 </div>
//               )}

//               {/* Buttons */}
//               <div style={{ display: "flex", gap: 12 }}>
//                 <button
//                   onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
//                   style={{
//                     flex: 1, background: THEME.neutral[100], color: THEME.text.primary,
//                     border: "none", borderRadius: 10, padding: "14px 24px", fontWeight: 700,
//                     fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
//                   }}
//                   onMouseEnter={(e) => { e.currentTarget.style.background = THEME.neutral[200]; }}
//                   onMouseLeave={(e) => { e.currentTarget.style.background = THEME.neutral[100]; }}
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleDelete}
//                   disabled={!deleteMatch || isDeleting}
//                   style={{
//                     flex: 1,
//                     background: deleteMatch ? "#dc2626" : "#f3f4f6",
//                     color: deleteMatch ? "white" : "#9ca3af",
//                     border: "none",
//                     borderRadius: 10,
//                     padding: "14px 24px",
//                     fontWeight: 700,
//                     fontSize: 14,
//                     cursor: deleteMatch && !isDeleting ? "pointer" : "not-allowed",
//                     fontFamily: "inherit",
//                     transition: "all 0.2s",
//                     boxShadow: deleteMatch ? "0 4px 12px rgba(220,38,38,0.4)" : "none",
//                     opacity: isDeleting ? 0.7 : 1,
//                   }}
//                   onMouseEnter={(e) => {
//                     if (deleteMatch && !isDeleting) {
//                       e.currentTarget.style.background = "#b91c1c";
//                       e.currentTarget.style.transform = "translateY(-1px)";
//                     }
//                   }}
//                   onMouseLeave={(e) => {
//                     if (deleteMatch) {
//                       e.currentTarget.style.background = "#dc2626";
//                       e.currentTarget.style.transform = "translateY(0)";
//                     }
//                   }}
//                 >
//                   {isDeleting ? "DELETING..." : "DELETE PERMANENTLY"}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Animations */}
//       <style>{`
//         @keyframes fadeIn {
//           from { opacity: 0; }
//           to { opacity: 1; }
//         }
//         @keyframes scaleIn {
//           from { opacity: 0; transform: scale(0.95) translateY(10px); }
//           to { opacity: 1; transform: scale(1) translateY(0); }
//         }
//       `}</style>
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
  onSaved?: (updatedDevice: Device) => void;
  onDeleted?: () => void;
}

const ASSET_TYPES = [
  { value: "", label: "— Select asset type —" },
  { value: "EOW", label: "Engine on Wheels" },
  { value: "DG", label: "DG (Diesel Generator)" },
  { value: "Marine", label: "Marine" },
  { value: "Industrial", label: "Industrial" },
];

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
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showHealthHint = formData.asset_name === "DG" || formData.asset_name === "EOW";

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "white", border: `2px solid ${THEME.border.light}`,
    borderRadius: 10, padding: "12px 16px", color: THEME.text.primary, fontSize: 14,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
    transition: "all 0.2s", boxShadow: THEME.shadow.sm,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: THEME.text.tertiary, textTransform: "uppercase",
    letterSpacing: 1, display: "block", marginBottom: 8, fontWeight: 600,
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = THEME.primary[500];
    e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = THEME.border.light;
    e.currentTarget.style.boxShadow = THEME.shadow.sm;
  };

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    if (!formData.device_name?.trim()) { setError("Device name cannot be empty"); return; }
    setIsSaving(true);
    try {
      const response = await fetch(`/api/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_name: formData.device_name,
          device_type: formData.device_type,
          asset_name: formData.asset_name,
          sim_number: formData.sim_number,
          customer_id: formData.customer_id,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess(true);
        onSaved?.({ ...device, ...formData, ...(data.device || {}) });
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "Failed to update device");
      }
    } catch (err: any) {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/devices/${device.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      onDeleted?.();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Delete failed" });
      setIsDeleting(false);
    }
  };

  const deleteMatch = deleteConfirmText.trim().toLowerCase() === (device.device_name ?? "").trim().toLowerCase();

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 8 }}>Edit Device</div>
        <div style={{ fontSize: 13, color: THEME.text.secondary }}>Update device information and settings</div>
      </div>

      {/* Form Card */}
      <div style={{ background: "white", borderRadius: 12, border: `2px solid ${THEME.border.light}`, padding: 24, maxWidth: 700, boxShadow: THEME.shadow.sm }}>

        {/* Device Name */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Device Name</label>
          <input
            type="text"
            value={formData.device_name}
            onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>

        {/* IMEI (read-only) */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>IMEI</label>
          <input
            type="text"
            value={device.imei}
            disabled
            style={{ ...inputStyle, background: THEME.neutral[50], color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace", cursor: "not-allowed", opacity: 0.7 }}
          />
          <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 6 }}>IMEI cannot be changed</div>
        </div>

        {/* Device Type */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Device Type</label>
          <select
            value={formData.device_type || device.device_type}
            onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
            style={inputStyle as React.CSSProperties}
            onFocus={focusStyle}
            onBlur={blurStyle}
          >
            <option value="FMB150">FMB150</option>
            <option value="FMC650">FMC650</option>
            <option value="FMB920">FMB920</option>
            <option value="FMB140">FMB140</option>
          </select>
        </div>

        {/* ── Asset Type dropdown ── */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Asset Type</label>
          <select
            value={formData.asset_name}
            onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
            style={{
              ...inputStyle as React.CSSProperties,
              color: formData.asset_name ? THEME.text.primary : THEME.text.tertiary,
              cursor: "pointer",
            }}
            onFocus={focusStyle}
            onBlur={blurStyle}
          >
            {ASSET_TYPES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>

          {/* DG hint */}
          {showHealthHint && (
            <div style={{
              marginTop: 8, padding: "8px 12px", borderRadius: 8,
              background: "#eff6ff", border: "1px solid #bfdbfe",
              fontSize: 12, color: "#1d4ed8", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>⚡</span>
              {formData.asset_name === "EOW" ? "GreenDrive" : "GreenX"} system health monitoring will be enabled for this device
            </div>
          )}
        </div>

        {/* SIM Number */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>SIM Number</label>
          <input
            type="text"
            value={formData.sim_number}
            onChange={(e) => setFormData({ ...formData, sim_number: e.target.value })}
            placeholder="Enter SIM number (optional)"
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>

        {/* Assigned Customer */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Assigned Customer</label>
          <select
            value={formData.customer_id || ""}
            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            style={{ ...inputStyle as React.CSSProperties, cursor: "pointer" }}
            onFocus={focusStyle}
            onBlur={blurStyle}
          >
            <option value="">— Unassigned —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(c.hierarchy_level)}{c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 32, paddingTop: 20, borderTop: `2px solid ${THEME.border.light}` }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              background: THEME.primary[500], color: "white", border: "none", borderRadius: 10,
              padding: "12px 28px", fontWeight: 700, fontSize: 13,
              cursor: isSaving ? "not-allowed" : "pointer", fontFamily: "inherit",
              transition: "all 0.2s", boxShadow: THEME.shadow.md, opacity: isSaving ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!isSaving) { e.currentTarget.style.background = THEME.primary[600]; e.currentTarget.style.transform = "translateY(-2px)"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = THEME.primary[500]; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {isSaving ? "SAVING..." : "💾 SAVE CHANGES"}
          </button>

          <button
            onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(""); }}
            style={{
              background: "white", color: "#ef4444", border: "2px solid #ef4444", borderRadius: 10,
              padding: "12px 28px", fontWeight: 700, fontSize: 13, cursor: "pointer",
              fontFamily: "inherit", transition: "all 0.2s", boxShadow: THEME.shadow.sm,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "white"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            🗑️ DELETE DEVICE
          </button>
        </div>
      </div>

      {/* Success toast */}
      {success && (
        <div style={{ position: "fixed", top: 20, right: 20, padding: 16, background: "#d1fae5", border: "2px solid #10b981", borderRadius: 12, color: "#047857", fontSize: 14, fontWeight: 600, boxShadow: THEME.shadow.lg, zIndex: 999, maxWidth: 400, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <span>Device updated successfully!</span>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div style={{ position: "fixed", top: 20, right: 20, padding: 16, background: "#fee", border: "2px solid #ef4444", borderRadius: 12, color: "#dc2626", fontSize: 14, fontWeight: 600, boxShadow: THEME.shadow.lg, zIndex: 999, maxWidth: 400, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 25px 80px rgba(0,0,0,0.4)", overflow: "hidden" }}>

            {/* Red header */}
            <div style={{ background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", padding: "24px 32px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🗑️</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "white" }}>Permanent Deletion</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>This action is irreversible</div>
              </div>
            </div>

            <div style={{ padding: "24px 32px" }}>
              {/* Warning box */}
              <div style={{ background: "#fef2f2", border: "2px solid #fecaca", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>⚠️ All data will be permanently lost</div>
                <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.6 }}>
                  Deleting <strong style={{ color: "#dc2626" }}>{device.device_name}</strong> (IMEI: <code style={{ background: "#fee2e2", padding: "2px 6px", borderRadius: 4, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>{device.imei}</code>) will permanently remove all GPS history, telemetry, analytics, and configuration.
                </div>
              </div>

              {/* Type to confirm */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, color: THEME.text.primary, display: "block", marginBottom: 10, fontWeight: 600 }}>
                  Type <span style={{ background: "#fee2e2", color: "#dc2626", padding: "2px 8px", borderRadius: 6, fontWeight: 800, fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>{device.device_name}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={`Type "${device.device_name}" here`}
                  autoFocus
                  style={{ width: "100%", background: deleteMatch ? "#f0fdf4" : "white", border: `2px solid ${deleteMatch ? "#22c55e" : "#e5e7eb"}`, borderRadius: 10, padding: "12px 16px", color: THEME.text.primary, fontSize: 14, fontFamily: "JetBrains Mono, monospace", outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                />
                {deleteConfirmText.length > 0 && !deleteMatch && (
                  <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6, fontWeight: 500 }}>Name does not match</div>
                )}
                {deleteMatch && (
                  <div style={{ fontSize: 12, color: "#16a34a", marginTop: 6, fontWeight: 600 }}>✓ Name confirmed</div>
                )}
              </div>

              {message?.type === "error" && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: "#dc2626" }}>{message.text}</div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                  style={{ flex: 1, background: THEME.neutral[100], color: THEME.text.primary, border: "none", borderRadius: 10, padding: "14px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = THEME.neutral[200]; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = THEME.neutral[100]; }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!deleteMatch || isDeleting}
                  style={{ flex: 1, background: deleteMatch ? "#dc2626" : "#f3f4f6", color: deleteMatch ? "white" : "#9ca3af", border: "none", borderRadius: 10, padding: "14px 24px", fontWeight: 700, fontSize: 14, cursor: deleteMatch && !isDeleting ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.2s", opacity: isDeleting ? 0.7 : 1 }}
                  onMouseEnter={(e) => { if (deleteMatch && !isDeleting) { e.currentTarget.style.background = "#b91c1c"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                  onMouseLeave={(e) => { if (deleteMatch) { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.transform = "translateY(0)"; } }}
                >
                  {isDeleting ? "DELETING..." : "DELETE PERMANENTLY"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}