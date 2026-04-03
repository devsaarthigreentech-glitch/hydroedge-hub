// // "use client";

// // import React from "react";
// // import { Customer } from "@/types";
// // import { Icons } from "@/components/ui/Icons";

// // interface AddCustomerModalProps {
// //   isOpen: boolean;
// //   onClose: () => void;
// //   customers: Customer[];
// // }

// // export function AddCustomerModal({
// //   isOpen,
// //   onClose,
// //   customers,
// // }: AddCustomerModalProps) {
// //   if (!isOpen) return null;

// //   return (
// //     <div
// //       style={{
// //         position: "fixed",
// //         inset: 0,
// //         background: "rgba(0,0,0,0.6)",
// //         display: "flex",
// //         alignItems: "center",
// //         justifyContent: "center",
// //         zIndex: 1000,
// //         backdropFilter: "blur(4px)",
// //       }}
// //       onClick={onClose}
// //     >
// //       <div
// //         onClick={(e) => e.stopPropagation()}
// //         style={{
// //           background: "#242424",
// //           borderRadius: 12,
// //           border: "1px solid #333",
// //           width: 500,
// //           maxHeight: "80vh",
// //           overflow: "auto",
// //           padding: 28,
// //         }}
// //       >
// //         <div
// //           style={{
// //             display: "flex",
// //             alignItems: "center",
// //             justifyContent: "space-between",
// //             marginBottom: 24,
// //           }}
// //         >
// //           <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
// //             Add New Customer
// //           </span>
// //           <button
// //             onClick={onClose}
// //             style={{
// //               background: "none",
// //               border: "none",
// //               color: "#6b7280",
// //               cursor: "pointer",
// //               display: "flex",
// //             }}
// //           >
// //             <Icons.Close />
// //           </button>
// //         </div>
// //         {[
// //           { label: "Customer Name", placeholder: "e.g. Turbo Energy Limited" },
// //           { label: "Company Name", placeholder: "e.g. Turbo Energy Ltd" },
// //           { label: "Email", placeholder: "admin@company.com" },
// //           { label: "Phone", placeholder: "+91..." },
// //           { label: "City", placeholder: "e.g. Chennai" },
// //           { label: "Country", placeholder: "e.g. India" },
// //         ].map((field) => (
// //           <div key={field.label} style={{ marginBottom: 14 }}>
// //             <label
// //               style={{
// //                 fontSize: 10,
// //                 color: "#6b7280",
// //                 textTransform: "uppercase",
// //                 letterSpacing: 1,
// //                 display: "block",
// //                 marginBottom: 5,
// //               }}
// //             >
// //               {field.label}
// //             </label>
// //             <input
// //               placeholder={field.placeholder}
// //               style={{
// //                 width: "100%",
// //                 background: "#1e1e1e",
// //                 border: "1px solid #333",
// //                 borderRadius: 6,
// //                 padding: "10px 12px",
// //                 color: "#e2e8f0",
// //                 fontSize: 13,
// //                 fontFamily: "inherit",
// //                 outline: "none",
// //                 boxSizing: "border-box",
// //               }}
// //             />
// //           </div>
// //         ))}
// //         <div style={{ marginBottom: 14 }}>
// //           <label
// //             style={{
// //               fontSize: 10,
// //               color: "#6b7280",
// //               textTransform: "uppercase",
// //               letterSpacing: 1,
// //               display: "block",
// //               marginBottom: 5,
// //             }}
// //           >
// //             Parent Customer
// //           </label>
// //           <select
// //             style={{
// //               width: "100%",
// //               background: "#1e1e1e",
// //               border: "1px solid #333",
// //               borderRadius: 6,
// //               padding: "10px 12px",
// //               color: "#e2e8f0",
// //               fontSize: 13,
// //               fontFamily: "inherit",
// //               outline: "none",
// //             }}
// //           >
// //             <option value="">— None (Root Customer) —</option>
// //             {customers.map((c) => (
// //               <option key={c.id} value={c.id}>
// //                 {"— ".repeat(c.hierarchy_level)}
// //                 {c.name}
// //               </option>
// //             ))}
// //           </select>
// //         </div>
// //         <div style={{ marginBottom: 14 }}>
// //           <label
// //             style={{
// //               fontSize: 10,
// //               color: "#6b7280",
// //               textTransform: "uppercase",
// //               letterSpacing: 1,
// //               display: "block",
// //               marginBottom: 5,
// //             }}
// //           >
// //             Customer Type
// //           </label>
// //           <select
// //             style={{
// //               width: "100%",
// //               background: "#1e1e1e",
// //               border: "1px solid #333",
// //               borderRadius: 6,
// //               padding: "10px 12px",
// //               color: "#e2e8f0",
// //               fontSize: 13,
// //               fontFamily: "inherit",
// //               outline: "none",
// //             }}
// //           >
// //             <option value="customer">Customer</option>
// //             <option value="vendor">Vendor</option>
// //             <option value="partner">Partner</option>
// //             <option value="dealer">Dealer</option>
// //           </select>
// //         </div>
// //         <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
// //           <button
// //             onClick={onClose}
// //             style={{
// //               flex: 1,
// //               background: "#00c853",
// //               color: "#000",
// //               border: "none",
// //               borderRadius: 6,
// //               padding: "12px",
// //               fontWeight: 700,
// //               fontSize: 13,
// //               cursor: "pointer",
// //               fontFamily: "inherit",
// //             }}
// //           >
// //             Create Customer
// //           </button>
// //           <button
// //             onClick={onClose}
// //             style={{
// //               background: "#333",
// //               color: "#94a3b8",
// //               border: "none",
// //               borderRadius: 6,
// //               padding: "12px 20px",
// //               fontWeight: 600,
// //               fontSize: 13,
// //               cursor: "pointer",
// //               fontFamily: "inherit",
// //             }}
// //           >
// //             Cancel
// //           </button>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }
// "use client";

// import React from "react";
// import { Customer } from "@/types";
// import { Icons } from "@/components/ui/Icons";

// interface AddCustomerModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   customers: Customer[];
//   onCustomerCreated: (customer: Customer) => void;
// }

// const EMPTY_FORM = {
//   name: "",
//   email: "",
//   phone: "",
//   company_name: "",
//   parent_customer_id: "",
//   customer_type: "customer",
//   plan_type: "basic",
//   timezone: "Asia/Kolkata",
//   contact_person_name: "",
//   contact_person_email: "",
//   contact_person_phone: "",
//   address_line1: "",
//   address_line2: "",
//   city: "",
//   state: "",
//   country: "",
//   postal_code: "",
//   notes: "",
// };

// export function AddCustomerModal({
//   isOpen,
//   onClose,
//   customers,
//   onCustomerCreated,
// }: AddCustomerModalProps) {
//   const [formData, setFormData] = React.useState(EMPTY_FORM);
//   const [loading, setLoading] = React.useState(false);
//   const [error, setError] = React.useState("");

//   if (!isOpen) return null;

//   const handleClose = () => {
//     setFormData(EMPTY_FORM);
//     setError("");
//     onClose();
//   };

//   const set = (key: keyof typeof EMPTY_FORM) =>
//     (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
//       setFormData((prev) => ({ ...prev, [key]: e.target.value }));

//   // const handleSubmit = async () => {
//   //   if (!formData.name.trim() || !formData.email.trim()) {
//   //     setError("Customer name and email are required.");
//   //     return;
//   //   }
//   //   setLoading(true);
//   //   setError("");
//   //   try {
//   //     const res = await fetch("/api/customers", {
//   //       method: "POST",
//   //       headers: { "Content-Type": "application/json" },
//   //       body: JSON.stringify({
//   //         ...formData,
//   //         parent_customer_id: formData.parent_customer_id || null,
//   //       }),
//   //     });
//   //     const data = await res.json();
//   //     if (!res.ok) {
//   //       setError(data.error || "Failed to create customer");
//   //       return;
//   //     }
//   //     onCustomerCreated(data);
//   //     handleClose();
//   //   } catch {
//   //     setError("Network error — please try again.");
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };
//   const handleSubmit = async () => {
//     if (!formData.name.trim() || !formData.email.trim()) {
//       setError("Customer name and email are required.");
//       return;
//     }
//     setLoading(true);
//     setError("");
//     try {
//       const res = await fetch("/api/customers", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           ...formData,
//           parent_customer_id: formData.parent_customer_id || null,
//         }),
//       });
  
//       let data;
//       try {
//         data = await res.json();
//       } catch {
//         // Response wasn't valid JSON
//         setError(`Server returned status ${res.status} with no valid JSON body`);
//         return;
//       }
  
//       if (!res.ok) {
//         setError(data.error || "Failed to create customer");
//         return;
//       }
  
//       // Success
//       onCustomerCreated(data);
//       handleClose();
  
//     } catch (err: any) {
//       // Only true network failures reach here (no connection, CORS, etc.)
//       console.error("Network error:", err);
//       setError("Network error — could not reach the server.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const inputStyle: React.CSSProperties = {
//     width: "100%",
//     background: "#1e1e1e",
//     border: "1px solid #333",
//     borderRadius: 6,
//     padding: "10px 12px",
//     color: "#e2e8f0",
//     fontSize: 13,
//     fontFamily: "inherit",
//     outline: "none",
//     boxSizing: "border-box",
//   };

//   const labelStyle: React.CSSProperties = {
//     fontSize: 10,
//     color: "#6b7280",
//     textTransform: "uppercase",
//     letterSpacing: 1,
//     display: "block",
//     marginBottom: 5,
//   };

//   const sectionLabel = (text: string) => (
//     <div style={{ fontSize: 10, color: "#7c3aed", textTransform: "uppercase",
//       letterSpacing: 1.5, fontWeight: 700, marginBottom: 12, marginTop: 20,
//       paddingBottom: 6, borderBottom: "1px solid #2a2a2a" }}>
//       {text}
//     </div>
//   );

//   const field = (label: string, key: keyof typeof EMPTY_FORM, placeholder = "") => (
//     <div style={{ marginBottom: 12 }}>
//       <label style={labelStyle}>{label}</label>
//       <input
//         value={formData[key]}
//         onChange={set(key)}
//         placeholder={placeholder}
//         style={inputStyle}
//       />
//     </div>
//   );

//   return (
//     <div
//       style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
//         display: "flex", alignItems: "center", justifyContent: "center",
//         zIndex: 1000, backdropFilter: "blur(4px)" }}
//       onClick={handleClose}
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         style={{ background: "#242424", borderRadius: 12, border: "1px solid #333",
//           width: 540, maxHeight: "85vh", overflow: "auto", padding: 28 }}
//       >
//         {/* Header */}
//         <div style={{ display: "flex", alignItems: "center",
//           justifyContent: "space-between", marginBottom: 20 }}>
//           <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
//             Add New Customer
//           </span>
//           <button onClick={handleClose}
//             style={{ background: "none", border: "none", color: "#6b7280",
//               cursor: "pointer", display: "flex" }}>
//             <Icons.Close />
//           </button>
//         </div>

//         {/* Basic Info */}
//         {sectionLabel("Basic Info")}
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
//           <div style={{ gridColumn: "1 / -1" }}>
//             {field("Customer Name *", "name", "e.g. Turbo Energy Limited")}
//           </div>
//           {field("Email *", "email", "admin@company.com")}
//           {field("Phone", "phone", "+91...")}
//           {field("Company Name", "company_name", "e.g. Turbo Energy Ltd")}
//         </div>

//         {/* Address */}
//         {sectionLabel("Address")}
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
//           <div style={{ gridColumn: "1 / -1" }}>
//             {field("Address Line 1", "address_line1", "Street address")}
//           </div>
//           <div style={{ gridColumn: "1 / -1" }}>
//             {field("Address Line 2", "address_line2", "Apt, suite, etc.")}
//           </div>
//           {field("City", "city", "Chennai")}
//           {field("State", "state", "Tamil Nadu")}
//           {field("Country", "country", "India")}
//           {field("Postal Code", "postal_code", "600001")}
//         </div>

//         {/* Contact Person */}
//         {sectionLabel("Contact Person")}
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
//           <div style={{ gridColumn: "1 / -1" }}>
//             {field("Contact Name", "contact_person_name", "Full name")}
//           </div>
//           {field("Contact Email", "contact_person_email", "contact@company.com")}
//           {field("Contact Phone", "contact_person_phone", "+91...")}
//         </div>

//         {/* Account Settings */}
//         {sectionLabel("Account Settings")}

//         <div style={{ marginBottom: 12 }}>
//           <label style={labelStyle}>Parent Customer</label>
//           <select value={formData.parent_customer_id}
//             onChange={set("parent_customer_id")} style={inputStyle}>
//             <option value="">— None (Root Customer) —</option>
//             {customers.map((c) => (
//               <option key={c.id} value={c.id}>
//                 {"— ".repeat(c.hierarchy_level)}{c.name}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
//           <div>
//             <label style={labelStyle}>Customer Type</label>
//             <select value={formData.customer_type}
//               onChange={set("customer_type")} style={inputStyle}>
//               <option value="customer">Customer</option>
//               <option value="vendor">Vendor</option>
//               <option value="partner">Partner</option>
//               <option value="dealer">Dealer</option>
//             </select>
//           </div>
//           <div>
//             <label style={labelStyle}>Plan Type</label>
//             <select value={formData.plan_type}
//               onChange={set("plan_type")} style={inputStyle}>
//               <option value="basic">Basic</option>
//               <option value="standard">Standard</option>
//               <option value="premium">Premium</option>
//               <option value="enterprise">Enterprise</option>
//             </select>
//           </div>
//           <div>
//             <label style={labelStyle}>Timezone</label>
//             <select value={formData.timezone}
//               onChange={set("timezone")} style={inputStyle}>
//               <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
//               <option value="UTC">UTC</option>
//               <option value="America/New_York">America/New_York</option>
//               <option value="Europe/London">Europe/London</option>
//             </select>
//           </div>
//         </div>

//         {/* Notes */}
//         {sectionLabel("Notes")}
//         <div style={{ marginBottom: 12 }}>
//           <label style={labelStyle}>Notes</label>
//           <textarea
//             value={formData.notes}
//             onChange={set("notes")}
//             placeholder="Any additional notes..."
//             rows={3}
//             style={{ ...inputStyle, resize: "vertical" }}
//           />
//         </div>

//         {/* Error */}
//         {error && (
//           <div style={{ color: "#ef4444", fontSize: 12,
//             marginBottom: 12, padding: "8px 12px",
//             background: "rgba(239,68,68,0.1)", borderRadius: 6 }}>
//             {error}
//           </div>
//         )}

//         {/* Actions */}
//         <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
//           <button onClick={handleSubmit} disabled={loading}
//             style={{ flex: 1, background: loading ? "#555" : "#7c3aed",
//               color: "#fff", border: "none", borderRadius: 6, padding: "12px",
//               fontWeight: 700, fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
//               fontFamily: "inherit", transition: "background 0.15s" }}>
//             {loading ? "Creating..." : "Create Customer"}
//           </button>
//           <button onClick={handleClose} disabled={loading}
//             style={{ background: "#333", color: "#94a3b8", border: "none",
//               borderRadius: 6, padding: "12px 20px", fontWeight: 600,
//               fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
//             Cancel
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";

import React from "react";
import { Customer } from "@/types";
import { Icons } from "@/components/ui/Icons";
import { THEME } from "@/lib/theme";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onCustomerCreated: (customer: Customer) => void;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  company_name: "",
  parent_customer_id: "",
  customer_type: "customer",
  plan_type: "basic",
  timezone: "Asia/Kolkata",
  contact_person_name: "",
  contact_person_email: "",
  contact_person_phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "",
  postal_code: "",
  notes: "",
};

export function AddCustomerModal({
  isOpen,
  onClose,
  customers,
  onCustomerCreated,
}: AddCustomerModalProps) {
  const [formData, setFormData] = React.useState(EMPTY_FORM);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    setFormData(EMPTY_FORM);
    setError("");
    onClose();
  };

  const set = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Customer name and email are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...formData,
        // Copy customer name into company_name if left blank
        company_name: formData.company_name.trim() || formData.name.trim(),
        parent_customer_id: formData.parent_customer_id || null,
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        setError(`Server returned status ${res.status} with no valid JSON body`);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Failed to create customer");
        return;
      }

      onCustomerCreated(data);
      handleClose();
    } catch (err: any) {
      console.error("Network error:", err);
      setError("Network error — could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
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

  const sectionLabel = (text: string) => (
    <div style={{
      fontSize: 11,
      color: THEME.primary[500],
      textTransform: "uppercase",
      letterSpacing: 1.5,
      fontWeight: 700,
      marginBottom: 14,
      marginTop: 24,
      paddingBottom: 8,
      borderBottom: `2px solid ${THEME.border.light}`,
    }}>
      {text}
    </div>
  );

  const field = (
    label: string,
    key: keyof typeof EMPTY_FORM,
    placeholder = "",
    hint?: string
  ) => (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <input
        value={formData[key]}
        onChange={set(key)}
        placeholder={placeholder}
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = THEME.primary[500];
          e.target.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = THEME.border.light;
          e.target.style.boxShadow = "none";
        }}
      />
      {hint && (
        <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: THEME.background.secondary,
          borderRadius: 16,
          border: `2px solid ${THEME.border.light}`,
          width: 560,
          maxHeight: "85vh",
          overflow: "auto",
          padding: 0,
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: `2px solid ${THEME.border.light}`,
          background: "white",
          borderRadius: "16px 16px 0 0",
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary }}>
              Add New Customer
            </div>
            <div style={{ fontSize: 12, color: THEME.text.secondary, marginTop: 2 }}>
              Create a new customer account
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: THEME.neutral[100], border: "none",
              color: THEME.text.secondary, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = THEME.neutral[200]; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = THEME.neutral[100]; }}
          >
            <Icons.Close />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: "4px 28px 28px" }}>

          {/* Customer Info */}
          {sectionLabel("Customer Info")}
          {field("Customer Name *", "name", "e.g. Hindustan Coca Cola Limited", "The organization or company name")}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Email *", "email", "admin@company.com")}
            {field("Phone", "phone", "+91...")}
          </div>

          {/* Point of Contact */}
          {sectionLabel("Point of Contact")}
          {field("Contact Person Name", "contact_person_name", "e.g. Aryan", "Primary point of contact for this customer")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Contact Email", "contact_person_email", "aryan@company.com")}
            {field("Contact Phone", "contact_person_phone", "+91...")}
          </div>

          {/* Address */}
          {sectionLabel("Address")}
          {field("Address Line 1", "address_line1", "Street address")}
          {field("Address Line 2", "address_line2", "Apt, suite, etc.")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("City", "city", "Pune")}
            {field("State", "state", "Maharashtra")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Country", "country", "India")}
            {field("Postal Code", "postal_code", "411001")}
          </div>

          {/* Account Settings */}
          {sectionLabel("Account Settings")}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Parent Customer</label>
            <select
              value={formData.parent_customer_id}
              onChange={set("parent_customer_id")}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">— None (Root Customer) —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {"— ".repeat(c.hierarchy_level)}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Customer Type</label>
              <select value={formData.customer_type} onChange={set("customer_type")}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="partner">Partner</option>
                <option value="dealer">Dealer</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Plan Type</label>
              <select value={formData.plan_type} onChange={set("plan_type")}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Timezone</label>
              <select value={formData.timezone} onChange={set("timezone")}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="Asia/Kolkata">IST (Kolkata)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">EST (New York)</option>
                <option value="Europe/London">GMT (London)</option>
                <option value="Asia/Kuala_Lumpur">MYT (Malaysia)</option>
                <option value="Africa/Lusaka">CAT (Zambia)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          {sectionLabel("Notes")}
          <div style={{ marginBottom: 14 }}>
            <textarea
              value={formData.notes}
              onChange={set("notes")}
              placeholder="Any additional notes..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = THEME.primary[500];
                e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.primary[100]}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = THEME.border.light;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              color: "#dc2626", fontSize: 13, marginBottom: 14,
              padding: "10px 14px", background: "#fef2f2",
              border: "1px solid #fecaca", borderRadius: 8, fontWeight: 500,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: "flex", gap: 12, marginTop: 8,
            paddingTop: 20, borderTop: `2px solid ${THEME.border.light}`,
          }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                flex: 1,
                background: loading ? THEME.neutral[300] : THEME.primary[500],
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
                boxShadow: loading ? "none" : THEME.shadow.md,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = THEME.primary[600];
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = THEME.primary[500];
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {loading ? "Creating..." : "Create Customer"}
            </button>
            <button
              onClick={handleClose}
              disabled={loading}
              style={{
                background: THEME.neutral[100],
                color: THEME.text.secondary,
                border: "none",
                borderRadius: 10,
                padding: "14px 24px",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = THEME.neutral[200]; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = THEME.neutral[100]; }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}