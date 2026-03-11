// "use client";

// import { useState } from "react";
// import { Customer } from "@/types";

// interface Props {
//   customer: Customer;
//   allCustomers: Customer[];
//   onSaved: (updated: Customer) => void;
// }

// const GREEN = "#22c55e";
// const BORDER = "#e2e8f0";

// function Field({
//   label,
//   name,
//   value,
//   onChange,
//   type = "text",
//   required,
//   options,
// }: {
//   label: string;
//   name: string;
//   value: string;
//   onChange: (name: string, value: string) => void;
//   type?: string;
//   required?: boolean;
//   options?: { value: string; label: string }[];
// }) {
//   const inputStyle: React.CSSProperties = {
//     width: "100%",
//     padding: "9px 12px",
//     border: `1px solid ${BORDER}`,
//     borderRadius: 8,
//     fontSize: 13,
//     color: "#0f172a",
//     background: "#fff",
//     outline: "none",
//     boxSizing: "border-box",
//     fontFamily: "inherit",
//   };

//   return (
//     <div style={{ marginBottom: 14 }}>
//       <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>
//         {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
//       </label>
//       {options ? (
//         <select
//           value={value}
//           onChange={(e) => onChange(name, e.target.value)}
//           style={inputStyle}
//         >
//           {options.map((o) => (
//             <option key={o.value} value={o.value}>
//               {o.label}
//             </option>
//           ))}
//         </select>
//       ) : (
//         <input
//           type={type}
//           value={value}
//           onChange={(e) => onChange(name, e.target.value)}
//           style={inputStyle}
//         />
//       )}
//     </div>
//   );
// }

// function SectionHeader({ title }: { title: string }) {
//   return (
//     <div
//       style={{
//         fontSize: 11,
//         fontWeight: 700,
//         color: "#94a3b8",
//         textTransform: "uppercase",
//         letterSpacing: 1,
//         margin: "20px 0 12px",
//         paddingBottom: 8,
//         borderBottom: `1px solid ${BORDER}`,
//       }}
//     >
//       {title}
//     </div>
//   );
// }

// export function CustomerEditTab({ customer, allCustomers, onSaved }: Props) {
//   const [form, setForm] = useState({
//     name:                  customer.name || "",
//     email:                 customer.email || "",
//     phone:                 customer.phone || "",
//     company_name:          (customer as any).company_name || "",
//     customer_type:         customer.customer_type || "customer",
//     status:                customer.status || "active",
//     plan_type:             (customer as any).plan_type || "basic",
//     max_devices:           String(customer.max_devices ?? "10"),
//     contact_person_name:   (customer as any).contact_person_name || "",
//     contact_person_email:  (customer as any).contact_person_email || "",
//     contact_person_phone:  (customer as any).contact_person_phone || "",
//     address_line1:         (customer as any).address_line1 || "",
//     address_line2:         (customer as any).address_line2 || "",
//     city:                  (customer as any).city || "",
//     state:                 (customer as any).state || "",
//     country:               (customer as any).country || "",
//     postal_code:           (customer as any).postal_code || "",
//     timezone:              (customer as any).timezone || "",
//     notes:                 (customer as any).notes || "",
//   });

//   const [saving, setSaving] = useState(false);
//   const [error, setError]   = useState<string | null>(null);
//   const [success, setSuccess] = useState(false);

//   function handleChange(name: string, value: string) {
//     setForm((prev) => ({ ...prev, [name]: value }));
//     setError(null);
//     setSuccess(false);
//   }

//   async function handleSave() {
//     if (!form.name.trim()) return setError("Account name is required");
//     if (!form.email.trim()) return setError("Email is required");

//     setSaving(true);
//     setError(null);

//     try {
//       const payload = { ...form, max_devices: parseInt(form.max_devices) || 10 };
//       const res = await fetch(`/api/customers/${customer.id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       const json = await res.json();
//       if (!json.success) throw new Error(json.error || "Failed to save");
//       setSuccess(true);
//       onSaved(json.data);
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setSaving(false);
//     }
//   }

//   return (
//     <div style={{ padding: 20, maxWidth: 700 }}>
//       {/* Error / success banners */}
//       {error && (
//         <div
//           style={{
//             background: "rgba(239,68,68,0.08)",
//             border: "1px solid rgba(239,68,68,0.3)",
//             color: "#dc2626",
//             borderRadius: 8,
//             padding: "10px 14px",
//             fontSize: 13,
//             marginBottom: 16,
//           }}
//         >
//           ⚠ {error}
//         </div>
//       )}
//       {success && (
//         <div
//           style={{
//             background: "rgba(34,197,94,0.08)",
//             border: "1px solid rgba(34,197,94,0.3)",
//             color: "#16a34a",
//             borderRadius: 8,
//             padding: "10px 14px",
//             fontSize: 13,
//             marginBottom: 16,
//           }}
//         >
//           ✓ Customer updated successfully
//         </div>
//       )}

//       <SectionHeader title="Organization" />
//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
//         <Field label="Account Name"   name="name"          value={form.name}          onChange={handleChange} required />
//         <Field label="Company Name"   name="company_name"  value={form.company_name}  onChange={handleChange} />
//         <Field label="Customer Type"  name="customer_type" value={form.customer_type} onChange={handleChange}
//           options={[
//             { value: "customer", label: "Customer" },
//             { value: "vendor",   label: "Vendor" },
//             { value: "partner",  label: "Partner" },
//             { value: "dealer",   label: "Dealer" },
//           ]}
//         />
//         <Field label="Status" name="status" value={form.status} onChange={handleChange}
//           options={[
//             { value: "active",    label: "Active" },
//             { value: "trial",     label: "Trial" },
//             { value: "suspended", label: "Suspended" },
//             { value: "inactive",  label: "Inactive" },
//           ]}
//         />
//         <Field label="Plan" name="plan_type" value={form.plan_type} onChange={handleChange}
//           options={[
//             { value: "basic",      label: "Basic" },
//             { value: "premium",    label: "Premium" },
//             { value: "enterprise", label: "Enterprise" },
//           ]}
//         />
//         <Field label="Max Devices" name="max_devices" value={form.max_devices} onChange={handleChange} type="number" />
//         <Field label="Timezone" name="timezone" value={form.timezone} onChange={handleChange} />
//       </div>

//       <SectionHeader title="Primary Contact" />
//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
//         <Field label="Email"  name="email" value={form.email} onChange={handleChange} type="email" required />
//         <Field label="Phone"  name="phone" value={form.phone} onChange={handleChange} type="tel" />
//         <Field label="Contact Person Name"  name="contact_person_name"  value={form.contact_person_name}  onChange={handleChange} />
//         <Field label="Contact Person Email" name="contact_person_email" value={form.contact_person_email} onChange={handleChange} type="email" />
//         <Field label="Contact Person Phone" name="contact_person_phone" value={form.contact_person_phone} onChange={handleChange} type="tel" />
//       </div>

//       <SectionHeader title="Address" />
//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
//         <Field label="Address Line 1" name="address_line1" value={form.address_line1} onChange={handleChange} />
//         <Field label="Address Line 2" name="address_line2" value={form.address_line2} onChange={handleChange} />
//         <Field label="City"           name="city"         value={form.city}         onChange={handleChange} />
//         <Field label="State"          name="state"        value={form.state}        onChange={handleChange} />
//         <Field label="Country"        name="country"      value={form.country}      onChange={handleChange} />
//         <Field label="Postal Code"    name="postal_code"  value={form.postal_code}  onChange={handleChange} />
//       </div>

//       <SectionHeader title="Notes" />
//       <textarea
//         value={form.notes}
//         onChange={(e) => handleChange("notes", e.target.value)}
//         rows={4}
//         style={{
//           width: "100%",
//           padding: "9px 12px",
//           border: `1px solid ${BORDER}`,
//           borderRadius: 8,
//           fontSize: 13,
//           color: "#0f172a",
//           background: "#fff",
//           outline: "none",
//           resize: "vertical",
//           fontFamily: "inherit",
//           boxSizing: "border-box",
//         }}
//         placeholder="Internal notes about this customer..."
//       />

//       {/* Save button */}
//       <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 10 }}>
//         <button
//           onClick={handleSave}
//           disabled={saving}
//           style={{
//             background: saving ? "#86efac" : GREEN,
//             color: "#fff",
//             border: "none",
//             borderRadius: 8,
//             padding: "10px 28px",
//             fontWeight: 700,
//             fontSize: 13,
//             cursor: saving ? "not-allowed" : "pointer",
//             transition: "background 0.2s",
//           }}
//         >
//           {saving ? "Saving…" : "Save Changes"}
//         </button>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { Customer } from "@/types";

interface Props {
  customer: Customer;
  allCustomers: Customer[];
  onSaved: (updated: Customer) => void;
}

const GREEN = "#22c55e";
const BORDER = "#e2e8f0";

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    fontSize: 13,
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          style={inputStyle}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: 1,
        margin: "20px 0 12px",
        paddingBottom: 8,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      {title}
    </div>
  );
}

export function CustomerEditTab({ customer, allCustomers, onSaved }: Props) {
  const [form, setForm] = useState({
    name:                  customer.name || "",
    email:                 customer.email || "",
    phone:                 customer.phone || "",
    company_name:          (customer as any).company_name || "",
    customer_type:         customer.customer_type || "customer",
    status:                customer.status || "active",
    plan_type:             (customer as any).plan_type || "basic",
    max_devices:           String(customer.max_devices ?? "10"),
    contact_person_name:   (customer as any).contact_person_name || "",
    contact_person_email:  (customer as any).contact_person_email || "",
    contact_person_phone:  (customer as any).contact_person_phone || "",
    address_line1:         (customer as any).address_line1 || "",
    address_line2:         (customer as any).address_line2 || "",
    city:                  (customer as any).city || "",
    state:                 (customer as any).state || "",
    country:               (customer as any).country || "",
    postal_code:           (customer as any).postal_code || "",
    timezone:              (customer as any).timezone || "",
    notes:                 (customer as any).notes || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(false);
  }

  async function handleSave() {
    if (!form.name.trim()) return setError("Account name is required");
    if (!form.email.trim()) return setError("Email is required");

    setSaving(true);
    setError(null);

    try {
      const payload = { ...form, max_devices: parseInt(form.max_devices) || 10 };
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save");
      setSuccess(true);
      onSaved(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      {/* Error / success banners */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#dc2626",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          ⚠ {error}
        </div>
      )}
      {success && (
        <div
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.3)",
            color: "#16a34a",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          ✓ Customer updated successfully
        </div>
      )}

      <SectionHeader title="Organization" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <Field label="Customer Name"  name="name"          value={form.name}          onChange={handleChange} required />
        <Field label="Company Name"   name="company_name"  value={form.company_name}  onChange={handleChange} />
        <Field label="Customer Type"  name="customer_type" value={form.customer_type} onChange={handleChange}
          options={[
            { value: "customer", label: "Customer" },
            { value: "vendor",   label: "Vendor" },
            { value: "partner",  label: "Partner" },
            { value: "dealer",   label: "Dealer" },
          ]}
        />
        <Field label="Status" name="status" value={form.status} onChange={handleChange}
          options={[
            { value: "active",    label: "Active" },
            { value: "trial",     label: "Trial" },
            { value: "suspended", label: "Suspended" },
            { value: "inactive",  label: "Inactive" },
          ]}
        />
        <Field label="Plan" name="plan_type" value={form.plan_type} onChange={handleChange}
          options={[
            { value: "basic",      label: "Basic" },
            { value: "premium",    label: "Premium" },
            { value: "enterprise", label: "Enterprise" },
          ]}
        />
        <Field label="Max Devices" name="max_devices" value={form.max_devices} onChange={handleChange} type="number" />
        <Field label="Timezone" name="timezone" value={form.timezone} onChange={handleChange} />
      </div>

      <SectionHeader title="Primary Contact" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <Field label="Email"  name="email" value={form.email} onChange={handleChange} type="email" required />
        <Field label="Phone"  name="phone" value={form.phone} onChange={handleChange} type="tel" />
        <Field label="Contact Person Name"  name="contact_person_name"  value={form.contact_person_name}  onChange={handleChange} />
        <Field label="Contact Person Email" name="contact_person_email" value={form.contact_person_email} onChange={handleChange} type="email" />
        <Field label="Contact Person Phone" name="contact_person_phone" value={form.contact_person_phone} onChange={handleChange} type="tel" />
      </div>

      <SectionHeader title="Address" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <Field label="Address Line 1" name="address_line1" value={form.address_line1} onChange={handleChange} />
        <Field label="Address Line 2" name="address_line2" value={form.address_line2} onChange={handleChange} />
        <Field label="City"           name="city"         value={form.city}         onChange={handleChange} />
        <Field label="State"          name="state"        value={form.state}        onChange={handleChange} />
        <Field label="Country"        name="country"      value={form.country}      onChange={handleChange} />
        <Field label="Postal Code"    name="postal_code"  value={form.postal_code}  onChange={handleChange} />
      </div>

      <SectionHeader title="Notes" />
      <textarea
        value={form.notes}
        onChange={(e) => handleChange("notes", e.target.value)}
        rows={4}
        style={{
          width: "100%",
          padding: "9px 12px",
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          fontSize: 13,
          color: "#0f172a",
          background: "#fff",
          outline: "none",
          resize: "vertical",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
        placeholder="Internal notes about this customer..."
      />

      {/* Save button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? "#86efac" : GREEN,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 28px",
            fontWeight: 700,
            fontSize: 13,
            cursor: saving ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}